console.info("NEXT EXIT BUILD 13.2A.1 LOADED");

const EXIT_TARGET_STORAGE_KEY = "nexitSelectedExit";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter"
];

const route = document.getElementById("restroom-route");
const exit = document.getElementById("restroom-exit");
const destination = document.getElementById("restroom-destination");
const status = document.getElementById("restroom-status");
const results = document.getElementById("restroom-results");

const SEARCH_RADIUS_METERS = 3000;
const MAX_RESULTS = 6;

function readLockedTarget() {
  try {
    return JSON.parse(sessionStorage.getItem(EXIT_TARGET_STORAGE_KEY) || "null");
  } catch (error) {
    console.warn("Stored exit target could not be read:", error);
    return null;
  }
}

function isValidTarget(target) {
  return Boolean(
    target &&
    target.interstate &&
    target.direction &&
    target.exitLabel &&
    Number.isFinite(Number(target.latitude)) &&
    Number.isFinite(Number(target.longitude))
  );
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRadians = (value) => value * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function milesText(meters) {
  const miles = meters / 1609.344;
  if (miles < 0.1) return "Under 0.1 mi";
  return `${miles.toFixed(miles < 1 ? 1 : 1)} mi`;
}

function placeName(tags) {
  return (
    tags.name ||
    tags.brand ||
    tags.operator ||
    tags["name:en"] ||
    fallbackType(tags)
  );
}

function fallbackType(tags) {
  if (tags.amenity === "toilets") return "Public Restrooms";
  if (tags.amenity === "fuel") return "Fuel Stop";
  if (tags.amenity === "fast_food") return "Fast Food";
  if (tags.amenity === "restaurant") return "Restaurant";
  if (tags.shop === "supermarket") return "Supermarket";
  if (tags.shop === "convenience") return "Convenience Store";
  return "Restroom Option";
}

function categoryLabel(tags) {
  if (tags.amenity === "toilets") return "Public restroom";
  if (tags.amenity === "fuel") return "Fuel or travel stop";
  if (tags.amenity === "fast_food") return "Fast food";
  if (tags.amenity === "restaurant") return "Restaurant";
  if (tags.shop === "supermarket") return "Supermarket";
  if (tags.shop === "convenience") return "Convenience store";
  return "Possible restroom stop";
}

function priorityScore(tags) {
  const name = `${tags.name || ""} ${tags.brand || ""}`.toLowerCase();

  if (tags.amenity === "toilets") return 0;
  if (
    name.includes("love") ||
    name.includes("pilot") ||
    name.includes("flying j") ||
    name.includes("buc-ee") ||
    name.includes("travel")
  ) return 1;
  if (tags.amenity === "fuel") return 2;
  if (tags.shop === "supermarket") return 3;
  if (tags.amenity === "fast_food") return 4;
  if (tags.shop === "convenience") return 5;
  if (tags.amenity === "restaurant") return 6;
  return 7;
}

function elementCoordinates(element) {
  if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) {
    return { lat: element.lat, lon: element.lon };
  }
  if (
    element.center &&
    Number.isFinite(element.center.lat) &&
    Number.isFinite(element.center.lon)
  ) {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  return null;
}

function buildOverpassQuery(lat, lon) {
  return `
[out:json][timeout:20];
(
  nwr(around:${SEARCH_RADIUS_METERS},${lat},${lon})["amenity"="toilets"];
  nwr(around:${SEARCH_RADIUS_METERS},${lat},${lon})["amenity"="fuel"];
  nwr(around:${SEARCH_RADIUS_METERS},${lat},${lon})["amenity"="fast_food"];
  nwr(around:${SEARCH_RADIUS_METERS},${lat},${lon})["amenity"="restaurant"];
  nwr(around:${SEARCH_RADIUS_METERS},${lat},${lon})["shop"="supermarket"];
  nwr(around:${SEARCH_RADIUS_METERS},${lat},${lon})["shop"="convenience"];
);
out center tags;
`;
}

async function fetchOverpass(query) {
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`Overpass returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`Overpass endpoint failed: ${endpoint}`, error);
      lastError = error;
    }
  }

  throw lastError || new Error("All Overpass endpoints failed.");
}

function normalizePlaces(data, target) {
  const seen = new Set();
  const places = [];

  for (const element of data.elements || []) {
    const tags = element.tags || {};
    const coordinates = elementCoordinates(element);
    if (!coordinates) continue;

    const name = placeName(tags);
    const key = `${name.toLowerCase()}|${coordinates.lat.toFixed(4)}|${coordinates.lon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const meters = haversineMeters(
      Number(target.latitude),
      Number(target.longitude),
      coordinates.lat,
      coordinates.lon
    );

    places.push({
      name,
      category: categoryLabel(tags),
      meters,
      priority: priorityScore(tags),
      latitude: coordinates.lat,
      longitude: coordinates.lon
    });
  }

  return places
    .sort((a, b) => a.priority - b.priority || a.meters - b.meters)
    .slice(0, MAX_RESULTS);
}

function navigationUrl(place) {
  const query = encodeURIComponent(`${place.name} ${place.latitude},${place.longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function renderResults(places) {
  results.innerHTML = "";

  if (!places.length) {
    status.textContent = "No likely restroom stops were found within about 2 miles of this exit.";
    return;
  }

  status.textContent = `${places.length} possible restroom stops found near the locked exit.`;

  places.forEach((place, index) => {
    const link = document.createElement("a");
    link.className = "result-card";
    link.href = navigationUrl(place);
    link.target = "_blank";
    link.rel = "noopener";

    link.innerHTML = `
      <span class="result-number">${index + 1}</span>
      <span class="result-copy">
        <strong>${escapeHtml(place.name)}</strong>
        <small>${escapeHtml(place.category)}</small>
      </span>
      <span class="result-distance">${milesText(place.meters)}</span>
    `;

    results.appendChild(link);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadRestroomSearch() {
  const target = readLockedTarget();

  if (!isValidTarget(target)) {
    route.textContent = "—";
    exit.textContent = "—";
    destination.textContent = "";
    status.textContent = "No upcoming exit has been selected.";
    results.innerHTML = "";
    return;
  }

  route.textContent = `${target.interstate} ${target.direction}`;
  exit.textContent = target.exitLabel;
  destination.textContent = target.destination || "";
  status.textContent = "Searching around this exit for likely restroom stops…";
  results.innerHTML = '<div class="loading-row">Searching map data…</div>';

  try {
    const query = buildOverpassQuery(
      Number(target.latitude),
      Number(target.longitude)
    );
    const data = await fetchOverpass(query);
    const places = normalizePlaces(data, target);
    renderResults(places);
  } catch (error) {
    console.error("Restroom search failed:", error);
    results.innerHTML = "";
    status.textContent =
      "The restroom search service did not respond. Return and try again.";
  }
}

loadRestroomSearch();
