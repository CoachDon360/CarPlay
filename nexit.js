const purposeContent = {
  restroom: {
    title: "Restroom selected",
    copy:
      "The next phase will show the next two or three highest-quality restroom stops ahead on the interstate."
  },
  food: {
    title: "Food selected",
    copy:
      "The next phase will rank upcoming interstate exits using strong restaurant and shopping signals."
  },
  superchargers: {
    title: "Superchargers selected",
    copy:
      "The next phase will compare upcoming Supercharger stops by nearby food, restrooms, and shopping."
  }
};

const cards = document.querySelectorAll("[data-purpose]");
const title = document.getElementById("selection-title");
const copy = document.getElementById("selection-copy");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    const page = card.dataset.page;
    if (page) {
      window.location.href = page;
      return;
    }

    cards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");

    const selected = purposeContent[card.dataset.purpose];
    title.textContent = selected.title;
    copy.textContent = selected.copy;
  });
});

const tripStatus = document.getElementById("trip-status");
const interstateStatus = document.getElementById("interstate-status");
const locationDetail = document.getElementById("location-detail");
const exitStatus = document.getElementById("exit-status");
const exitNumber = document.getElementById("exit-number");
const exitDetail = document.getElementById("exit-detail");

let watchId = null;
let previousPosition = null;
let currentInterstate = null;
let currentDirection = "Direction pending";
let lastRoadLookup = null;
let lookupInProgress = false;
let currentHeading = null;
let lastExitLookup = null;
let exitLookupInProgress = false;
let currentExitKey = null;
let currentExit = null;
let currentExitLastDistance = null;
let currentExitPassedReadings = 0;
let interstateMissReadings = 0;
let exitNowSeen = false;
let exitTaken = false;

function setLocationStatus(state, headline, detail) {
  tripStatus.dataset.state = state;
  interstateStatus.textContent = headline;
  locationDetail.textContent = detail;
}

function setExitStatus(state, headline, detail) {
  exitStatus.dataset.state = state;
  exitNumber.textContent = headline;
  exitDetail.textContent = detail;
}

function showQuietOffInterstateState() {
  setLocationStatus("waiting", "—", "");
  setExitStatus("waiting", "—", "");
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function toDegrees(value) {
  return (value * 180) / Math.PI;
}

function distanceMeters(first, second) {
  const earthRadius = 6371000;
  const lat1 = toRadians(first.latitude);
  const lat2 = toRadians(second.latitude);
  const deltaLat = toRadians(second.latitude - first.latitude);
  const deltaLon = toRadians(second.longitude - first.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingBetween(first, second) {
  const lat1 = toRadians(first.latitude);
  const lat2 = toRadians(second.latitude);
  const deltaLon = toRadians(second.longitude - first.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function interstateAxis(interstate) {
  if (!interstate) return null;

  const match = interstate.match(/I-(\d{1,3})/i);
  if (!match) return null;

  const routeNumber = Number(match[1]);

  /*
   * Auxiliary three-digit interstates inherit the orientation of their
   * two-digit parent route. Examples: I-264 -> I-64, I-275 -> I-75.
   */
  const parentNumber = routeNumber >= 100 ? routeNumber % 100 : routeNumber;

  return parentNumber % 2 === 0 ? "east-west" : "north-south";
}

function directionFromHeading(heading, interstate = currentInterstate) {
  if (!Number.isFinite(heading)) return "Direction pending";

  const axis = interstateAxis(interstate);

  if (axis === "east-west") {
    return heading >= 180 ? "Westbound" : "Eastbound";
  }

  if (axis === "north-south") {
    return heading >= 90 && heading < 270 ? "Southbound" : "Northbound";
  }

  /*
   * Before an interstate number is known, use the nearest primary compass
   * direction only. Nexit never displays diagonal road directions.
   */
  if (heading >= 45 && heading < 135) return "Eastbound";
  if (heading >= 135 && heading < 225) return "Southbound";
  if (heading >= 225 && heading < 315) return "Westbound";
  return "Northbound";
}

function updateDirection(position) {
  let heading = position.coords.heading;

  if (!Number.isFinite(heading) && previousPosition) {
    const moved = distanceMeters(previousPosition.coords, position.coords);
    if (moved >= 20) {
      heading = bearingBetween(previousPosition.coords, position.coords);
    }
  }

  if (Number.isFinite(heading)) {
    currentHeading = heading;
    currentDirection = directionFromHeading(heading);
  }

  previousPosition = position;
}

function normalizeInterstate(text) {
  if (!text) return null;

  const interstateMatch = text.match(
    /\b(?:interstate\s*|i[\s-]*)(\d{1,3})(?:\s*(?:business|bus))?\b/i
  );

  if (interstateMatch) {
    return `I-${interstateMatch[1]}`;
  }

  return null;
}

function findInterstate(data) {
  const address = data.address || {};
  const candidates = [
    data.name,
    address.road,
    address.highway,
    address.motorway,
    address.route,
    data.display_name
  ].filter(Boolean);

  for (const candidate of candidates) {
    const interstate = normalizeInterstate(candidate);
    if (interstate) return interstate;
  }

  return null;
}


function angularDifference(first, second) {
  return Math.abs(((first - second + 540) % 360) - 180);
}

function milesFromMeters(meters) {
  return meters / 1609.344;
}

function formatExitDistance(meters) {
  const miles = milesFromMeters(meters);
  if (meters <= 250) return "Exit now";
  if (miles < 1) return `${miles.toFixed(1)} mi ahead`;
  return `${miles.toFixed(1)} mi ahead`;
}

function exitLabel(tags = {}) {
  const ref = tags.ref || tags["junction:ref"] || "";
  if (ref) return `Exit ${ref}`;

  const name = tags.name || tags.destination || "";
  if (name) return name;

  return "Upcoming exit";
}

function exitDescription(tags = {}, meters) {
  const destination =
    tags.destination ||
    tags["destination:street"] ||
    tags.name ||
    tags.operator ||
    "";

  const distance = formatExitDistance(meters);
  return destination ? `${distance} • ${destination}` : distance;
}


function overpassRouteRegex(interstate) {
  const match = interstate.match(/^I-(\d{1,3})$/i);
  if (!match) return "";
  const number = match[1];
  return `^(I[- ]?${number}|Interstate[ -]?${number})$`;
}

function candidateIdentity(node) {
  const tags = node.tags || {};
  return [
    tags.ref || tags["junction:ref"] || "",
    tags.destination || tags["destination:street"] || "",
    tags.name || ""
  ]
    .join("|")
    .toLowerCase();
}

function deduplicateExitCandidates(candidates) {
  const kept = [];

  for (const candidate of candidates) {
    const identity = candidateIdentity(candidate.node);
    const duplicate = kept.find((existing) => {
      const sameIdentity =
        identity && identity !== "||" &&
        identity === candidateIdentity(existing.node);
      const clustered =
        distanceMeters(
          { latitude: candidate.node.lat, longitude: candidate.node.lon },
          { latitude: existing.node.lat, longitude: existing.node.lon }
        ) < 250;

      return sameIdentity || clustered;
    });

    if (!duplicate) {
      kept.push(candidate);
    }
  }

  return kept;
}

function updateCurrentExitFromPosition(position) {
  if (!currentExit) return;

  const coords = {
    latitude: currentExit.node.lat,
    longitude: currentExit.node.lon
  };
  const meters = distanceMeters(position.coords, coords);
  const heading = Number.isFinite(currentHeading) ? currentHeading : null;
  const bearing = bearingBetween(position.coords, coords);
  const angle = Number.isFinite(heading)
    ? angularDifference(heading, bearing)
    : 0;

  if (meters <= 300) {
    exitNowSeen = true;
  }

  /*
   * Once “Exit now” has been reached, leaving the interstate is treated as
   * ramp commitment. This prevents the same mapped ramp node from changing
   * back to “0.2 mi ahead” after the vehicle has already taken the exit.
   */
  if (exitNowSeen && interstateMissReadings >= 1) {
    exitTaken = true;
    currentExitLastDistance = meters;
    setExitStatus("ready", exitLabel(currentExit.node.tags), "Exit taken");
    return;
  }

  const movingAway =
    currentExitLastDistance !== null &&
    meters > currentExitLastDistance + 35;

  if (angle > 100 && meters < 1800 && movingAway) {
    currentExitPassedReadings += 1;
  } else {
    currentExitPassedReadings = 0;
  }

  currentExitLastDistance = meters;

  if (currentExitPassedReadings >= 2) {
    currentExit = null;
    currentExitKey = null;
    currentExitLastDistance = null;
    currentExitPassedReadings = 0;
    exitNowSeen = false;
    exitTaken = false;
    lastExitLookup = null;

    if (currentInterstate) {
      setExitStatus("locating", "Searching…", `Ahead on ${currentInterstate}`);
      identifyNextExit(position);
    } else {
      showQuietOffInterstateState();
    }
    return;
  }

  if (!exitTaken) {
    setExitStatus(
      "ready",
      exitLabel(currentExit.node.tags),
      exitDescription(currentExit.node.tags, meters)
    );
  }
}

async function identifyNextExit(position) {
  if (!currentInterstate || exitLookupInProgress) return;

  if (
    lastExitLookup &&
    distanceMeters(lastExitLookup, position.coords) < 800 &&
    Date.now() - lastExitLookup.timestamp < 60000
  ) {
    return;
  }

  exitLookupInProgress = true;
  lastExitLookup = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    timestamp: Date.now()
  };

  if (!currentExitKey) {
    setExitStatus("locating", "Searching…", `Ahead on ${currentInterstate}`);
  }

  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;

  /*
   * Motorway junction nodes carry exit numbers and destination labels in
   * OpenStreetMap. A 30 km search radius is broad enough for rural highways
   * without requesting a state-sized dataset.
   */
  const routeRegex = overpassRouteRegex(currentInterstate);
  const query = `
    [out:json][timeout:20];
    way(around:30000,${latitude},${longitude})
      ["highway"="motorway"]
      ["ref"~"${routeRegex}",i];
    node(w)["highway"="motorway_junction"];
    out body;
  `;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: new URLSearchParams({ data: query }).toString()
    });

    if (!response.ok) {
      throw new Error(`Exit lookup returned ${response.status}`);
    }

    const data = await response.json();
    const heading = Number.isFinite(currentHeading)
      ? currentHeading
      : previousPosition
        ? previousPosition.coords.heading
        : null;

    const rawCandidates = (data.elements || [])
      .filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lon))
      .map((node) => {
        const coords = { latitude: node.lat, longitude: node.lon };
        const meters = distanceMeters(position.coords, coords);
        const bearing = bearingBetween(position.coords, coords);
        const angle = Number.isFinite(heading)
          ? angularDifference(heading, bearing)
          : 0;

        return { node, meters, bearing, angle };
      })
      .filter((candidate) => {
        if (candidate.meters < 120) return false;
        if (!Number.isFinite(heading)) return candidate.meters < 16000;
        return candidate.angle <= 55;
      })
      .sort((a, b) => {
        const scoreA = a.meters + a.angle * 140;
        const scoreB = b.meters + b.angle * 140;
        return scoreA - scoreB;
      });

    const candidates = deduplicateExitCandidates(rawCandidates);
    const next = candidates[0];

    if (!next) {
      currentExitKey = null;
      setExitStatus("waiting", "Not found", "No mapped exit ahead nearby");
      return;
    }

    currentExitKey = String(next.node.id);
    currentExit = next;
    currentExitLastDistance = next.meters;
    currentExitPassedReadings = 0;
    setExitStatus(
      "ready",
      exitLabel(next.node.tags),
      exitDescription(next.node.tags, next.meters)
    );
  } catch (error) {
    console.warn("Next-exit lookup failed:", error);
    if (!currentExitKey) {
      setExitStatus("error", "Lookup delayed", "Will retry automatically");
    }
  } finally {
    exitLookupInProgress = false;
  }
}

async function identifyRoad(position) {
  if (lookupInProgress) return;

  if (
    lastRoadLookup &&
    distanceMeters(lastRoadLookup, position.coords) < 150 &&
    Date.now() - lastRoadLookup.timestamp < 30000
  ) {
    return;
  }

  lookupInProgress = true;
  lastRoadLookup = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    timestamp: Date.now()
  };

  /*
   * Keep the current route and direction visible while the lookup refreshes
   * in the background. This prevents the status card from flickering.
   */
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    zoom: "16",
    addressdetails: "1"
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Road lookup returned ${response.status}`);
    }

    const data = await response.json();
    const interstate = findInterstate(data);

    if (interstate) {
      currentInterstate = interstate;

      if (previousPosition && Number.isFinite(previousPosition.coords.heading)) {
        currentDirection = directionFromHeading(
          previousPosition.coords.heading,
          currentInterstate
        );
      }

      setLocationStatus("ready", currentInterstate, currentDirection);
      identifyNextExit(position);
    } else {
      const nearbyRoad =
        data.address?.road ||
        data.address?.highway ||
        data.name ||
        "No interstate nearby";

      interstateMissReadings += 1;

      if (exitNowSeen && currentExit) {
        exitTaken = true;
        currentInterstate = null;
        setLocationStatus("waiting", "—", "");
        setExitStatus("ready", exitLabel(currentExit.node.tags), "Exit taken");
      } else if (interstateMissReadings >= 2) {
        currentInterstate = null;
        currentExit = null;
        currentExitKey = null;
        currentExitLastDistance = null;
        currentExitPassedReadings = 0;
        exitNowSeen = false;
        exitTaken = false;
        showQuietOffInterstateState();
      }
    }
  } catch (error) {
    console.warn("Road identification failed:", error);
    if (currentInterstate) {
      setLocationStatus("ready", currentInterstate, currentDirection);
    } else {
      showQuietOffInterstateState();
    }
  } finally {
    lookupInProgress = false;
  }
}

function handlePosition(position) {
  updateDirection(position);

  if (currentInterstate) {
    setLocationStatus("ready", currentInterstate, currentDirection);
  } else {
    showQuietOffInterstateState();
  }

  updateCurrentExitFromPosition(position);
  identifyRoad(position);
  identifyNextExit(position);
}

function handleLocationError(error) {
  if (error.code === error.PERMISSION_DENIED) {
    setLocationStatus("error", "Location blocked", "Allow location and reload");
    return;
  }

  if (error.code === error.TIMEOUT) {
    setLocationStatus("error", "Location timed out", "Tap this box to retry");
    return;
  }

  setLocationStatus("error", "Not detected", "Tap this box to retry");
}

function locateVehicle() {
  showQuietOffInterstateState();

  if (!window.isSecureContext) {
    setLocationStatus("error", "HTTPS required", "Open the published secure page");
    return;
  }

  if (!("geolocation" in navigator)) {
    setLocationStatus("error", "Unavailable", "Location is not supported");
    return;
  }

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }

  previousPosition = null;
  currentInterstate = null;
  currentDirection = "Direction pending";
  lastRoadLookup = null;
  lastExitLookup = null;
  currentExitKey = null;
  currentExit = null;
  currentExitLastDistance = null;
  currentExitPassedReadings = 0;
  interstateMissReadings = 0;
  exitNowSeen = false;
  exitTaken = false;
  currentHeading = null;
  setExitStatus("waiting", "Searching…", "Waiting for interstate");

  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    handleLocationError,
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000
    }
  );
}

tripStatus.addEventListener("click", locateVehicle);
tripStatus.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    locateVehicle();
  }
});

tripStatus.setAttribute("role", "button");
tripStatus.setAttribute("tabindex", "0");
tripStatus.setAttribute("title", "Retry interstate identification");

locateVehicle();
