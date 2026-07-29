(() => {
  "use strict";

  /*
   * Phase 15.7.0 — Live OpenStreetMap Data Bridge
   *
   * Reads the committed exit target written by nexit.js, locates the next
   * likely motorway junction ahead, queries nearby named businesses through
   * Overpass API, and hands raw names to NextExitBusinessMatcher.
   *
   * Protected navigation/GPS logic is not modified.
   */

  const STORAGE_KEY = "nexitSelectedExit";
  const CACHE_PREFIX = "nexitLiveBusinesses:";
  const CACHE_MAX_AGE_MS = 30 * 60 * 1000;
  const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
  const BUSINESS_RADIUS_METERS = 3000;
  const NEXT_EXIT_SEARCH_RADIUS_METERS = 40000;
  const FETCH_TIMEOUT_MS = 22000;

  let requestSequence = 0;
  let lastTargetSignature = "";

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function cleanDirection(value) {
    const text = String(value || "").toUpperCase();
    if (text.includes("NORTH")) return "NORTH";
    if (text.includes("SOUTH")) return "SOUTH";
    if (text.includes("EAST")) return "EAST";
    if (text.includes("WEST")) return "WEST";
    return "";
  }

  function cleanInterstate(value) {
    const match = String(value || "").match(/\b(?:I[-\s]?)?(\d{1,3})\b/i);
    return match ? `I-${match[1]}` : "";
  }

  function cleanExit(value) {
    return String(value || "").replace(/^exit\s+/i, "").trim();
  }

  function readUrlTarget() {
    const params = new URLSearchParams(window.location.search);
    const latitude = finiteNumber(params.get("liveLat"));
    const longitude = finiteNumber(params.get("liveLon"));
    if (latitude === null || longitude === null) return null;

    return {
      latitude,
      longitude,
      exitLabel: cleanExit(params.get("liveExit") || params.get("testExit")),
      exitRef: cleanExit(params.get("liveExit") || params.get("testExit")),
      interstate: cleanInterstate(params.get("interstate")),
      direction: cleanDirection(params.get("direction")),
      source: "url-live-test"
    };
  }

  function readStoredTarget() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const latitude = finiteNumber(parsed.latitude);
      const longitude = finiteNumber(parsed.longitude);
      if (latitude === null || longitude === null) return null;

      return {
        ...parsed,
        latitude,
        longitude,
        exitLabel: cleanExit(parsed.exitLabel || parsed.exitRef),
        exitRef: cleanExit(parsed.exitRef || parsed.exitLabel),
        interstate: cleanInterstate(parsed.interstate),
        direction: cleanDirection(parsed.direction),
        source: "session-storage"
      };
    } catch (error) {
      console.warn("Next Exit: unable to read saved exit target.", error);
      return null;
    }
  }

  function hasManualBusinessTestData() {
    const params = new URLSearchParams(window.location.search);
    return Boolean(
      params.get("exit1Businesses") ||
      params.get("exit2Businesses")
    );
  }

  function targetSignature(target) {
    return [
      target.latitude.toFixed(5),
      target.longitude.toFixed(5),
      target.exitRef || target.exitLabel || "",
      target.interstate || "",
      target.direction || ""
    ].join("|");
  }

  function toRadians(value) {
    return (value * Math.PI) / 180;
  }

  function distanceMeters(first, second) {
    const earthRadius = 6371000;
    const lat1 = toRadians(first.latitude);
    const lat2 = toRadians(second.latitude);
    const deltaLat = toRadians(second.latitude - first.latitude);
    const deltaLon = toRadians(second.longitude - first.longitude);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function bearingDegrees(first, second) {
    const lat1 = toRadians(first.latitude);
    const lat2 = toRadians(second.latitude);
    const deltaLon = toRadians(second.longitude - first.longitude);
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function desiredBearing(direction) {
    return {
      NORTH: 0,
      EAST: 90,
      SOUTH: 180,
      WEST: 270
    }[cleanDirection(direction)] ?? null;
  }

  function angularDifference(first, second) {
    const difference = Math.abs(first - second) % 360;
    return Math.min(difference, 360 - difference);
  }

  function escapeOverpassRegex(value) {
    return String(value || "").replace(/[\\.^$|?*+()[\]{}]/g, "\\$&");
  }

  async function overpass(query) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Overpass returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data.elements) ? data.elements : [];
    } finally {
      clearTimeout(timeout);
    }
  }

  function cacheKey(point) {
    return `${CACHE_PREFIX}${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`;
  }

  function readCache(point) {
    try {
      const raw = localStorage.getItem(cacheKey(point));
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (
        !cached ||
        !Array.isArray(cached.names) ||
        Date.now() - Number(cached.savedAt) > CACHE_MAX_AGE_MS
      ) {
        localStorage.removeItem(cacheKey(point));
        return null;
      }
      return cached.names;
    } catch {
      return null;
    }
  }

  function writeCache(point, names) {
    try {
      localStorage.setItem(
        cacheKey(point),
        JSON.stringify({ savedAt: Date.now(), names })
      );
    } catch {
      // A full or disabled cache should never prevent live results.
    }
  }

  function nameFromElement(element) {
    const tags = element?.tags || {};
    return String(
      tags.brand ||
      tags.name ||
      tags.operator ||
      tags["brand:wikidata"] ||
      ""
    ).trim();
  }

  function uniqueNames(elements) {
    const seen = new Set();
    const names = [];

    elements.forEach((element) => {
      const name = nameFromElement(element);
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      names.push(name);
    });

    return names;
  }

  async function businessesNear(point) {
    const cached = readCache(point);
    if (cached) return cached;

    const { latitude, longitude } = point;
    const radius = BUSINESS_RADIUS_METERS;
    const query = `
[out:json][timeout:18];
(
  nwr(around:${radius},${latitude},${longitude})["name"]["amenity"~"^(fuel|fast_food|restaurant|cafe|toilets)$"];
  nwr(around:${radius},${latitude},${longitude})["brand"]["amenity"~"^(fuel|fast_food|restaurant|cafe|toilets)$"];
  nwr(around:${radius},${latitude},${longitude})["name"]["shop"~"^(convenience|supermarket|department_store|mall)$"];
  nwr(around:${radius},${latitude},${longitude})["brand"]["shop"~"^(convenience|supermarket|department_store|mall)$"];
);
out center tags;
`;

    const names = uniqueNames(await overpass(query));
    writeCache(point, names);
    return names;
  }

  function junctionPoint(element) {
    return {
      latitude: finiteNumber(element.lat ?? element.center?.lat),
      longitude: finiteNumber(element.lon ?? element.center?.lon)
    };
  }

  function chooseNextJunction(target, elements) {
    const targetBearing = desiredBearing(target.direction);
    const currentRef = cleanExit(target.exitRef || target.exitLabel);
    const candidates = [];

    elements.forEach((element) => {
      const point = junctionPoint(element);
      if (point.latitude === null || point.longitude === null) return;

      const tags = element.tags || {};
      const ref = cleanExit(tags.ref || tags["junction:ref"]);
      if (!ref || (currentRef && ref === currentRef)) return;

      const distance = distanceMeters(target, point);
      if (distance < 800 || distance > NEXT_EXIT_SEARCH_RADIUS_METERS) return;

      const bearing = bearingDegrees(target, point);
      const difference =
        targetBearing === null ? 0 : angularDifference(bearing, targetBearing);

      // Keep junctions generally ahead; permit a wider cone on curving roads.
      if (targetBearing !== null && difference > 80) return;

      candidates.push({
        ...point,
        exitRef: ref,
        exitLabel: ref,
        destination:
          tags.destination ||
          tags["destination:street"] ||
          tags.name ||
          "",
        distance,
        bearingDifference: difference
      });
    });

    candidates.sort((a, b) =>
      (a.distance + a.bearingDifference * 45) -
      (b.distance + b.bearingDifference * 45)
    );

    return candidates[0] || null;
  }

  async function findNextExit(target) {
    const routeNumber = target.interstate.replace(/^I-/, "");
    const routeFilter = routeNumber
      ? `["ref"~"(^|[^0-9])${escapeOverpassRegex(routeNumber)}([^0-9]|$)"]`
      : "";

    const query = `
[out:json][timeout:18];
(
  node(around:${NEXT_EXIT_SEARCH_RADIUS_METERS},${target.latitude},${target.longitude})
    ["highway"="motorway_junction"]${routeFilter};
);
out body;
`;

    let elements = await overpass(query);
    let next = chooseNextJunction(target, elements);

    // OSM junction nodes do not always carry the interstate ref. Retry broadly.
    if (!next && routeFilter) {
      const fallbackQuery = `
[out:json][timeout:18];
node(around:${NEXT_EXIT_SEARCH_RADIUS_METERS},${target.latitude},${target.longitude})
  ["highway"="motorway_junction"];
out body;
`;
      elements = await overpass(fallbackQuery);
      next = chooseNextJunction(target, elements);
    }

    return next;
  }

  function setLiveState(state, message = "") {
    document.documentElement.dataset.nexitLiveState = state;
    document.documentElement.dataset.nexitLiveMessage = message;
  }

  async function loadLiveData(target, source = "live-osm") {
    const matcher = window.NextExitBusinessMatcher;
    const bridge = window.NextExitExitBridge;
    if (!matcher || !bridge) return;

    const sequence = ++requestSequence;
    setLiveState("loading", "Finding businesses near upcoming exits");

    try {
      const firstExit =
        cleanExit(target.exitRef || target.exitLabel) ||
        document.querySelector(".exit-card-number")?.textContent.trim() ||
        "";

      if (firstExit) {
        bridge.setExits(firstExit, "", source);
      }

      const firstBusinesses = await businessesNear(target);
      if (sequence !== requestSequence) return;

      matcher.setBusinessesForBothExits(firstBusinesses, [], source);

      const nextExit = await findNextExit(target);
      if (sequence !== requestSequence) return;

      if (!nextExit) {
        setLiveState("partial", "First exit loaded; next exit was not identified");
        return;
      }

      bridge.setExits(firstExit, nextExit.exitRef, source);

      const secondBusinesses = await businessesNear(nextExit);
      if (sequence !== requestSequence) return;

      matcher.setBusinessesForBothExits(
        firstBusinesses,
        secondBusinesses,
        source
      );

      setLiveState("ready", "Live businesses loaded");
      window.dispatchEvent(
        new CustomEvent("nexit:livedataready", {
          detail: Object.freeze({
            source,
            firstExit,
            secondExit: nextExit.exitRef,
            firstBusinessCount: firstBusinesses.length,
            secondBusinessCount: secondBusinesses.length
          })
        })
      );
    } catch (error) {
      console.warn("Next Exit live-data lookup failed.", error);
      setLiveState(
        "error",
        error?.name === "AbortError"
          ? "Live lookup timed out"
          : "Live lookup unavailable"
      );
    }
  }

  function begin() {
    if (hasManualBusinessTestData()) {
      setLiveState("manual-test", "URL business test data is active");
      return;
    }

    const target = readUrlTarget() || readStoredTarget();
    if (!target) {
      setLiveState("waiting", "Waiting for a committed exit target");
      return;
    }

    const signature = targetSignature(target);
    if (signature === lastTargetSignature) return;
    lastTargetSignature = signature;
    loadLiveData(target);
  }

  function onStorage(event) {
    if (event.storageArea === sessionStorage && event.key === STORAGE_KEY) {
      begin();
    }
  }

  window.NextExitLiveData = Object.freeze({
    refresh: () => {
      lastTargetSignature = "";
      begin();
    },
    loadTarget: (target) => loadLiveData(target, "live-api"),
    getState: () => ({
      state: document.documentElement.dataset.nexitLiveState || "",
      message: document.documentElement.dataset.nexitLiveMessage || ""
    })
  });

  window.addEventListener("storage", onStorage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", begin, { once: true });
  } else {
    begin();
  }
})();