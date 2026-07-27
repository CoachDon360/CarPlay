const EXIT_TARGET_STORAGE_KEY = "nexitSelectedExit";

const route = document.getElementById("restroom-route");
const exit = document.getElementById("restroom-exit");
const destination = document.getElementById("restroom-destination");
const status = document.getElementById("restroom-status");

function showLockedExitTarget() {
  let target = null;

  try {
    target = JSON.parse(sessionStorage.getItem(EXIT_TARGET_STORAGE_KEY) || "null");
  } catch (error) {
    console.warn("Stored exit target could not be read:", error);
  }

  if (
    !target ||
    !target.interstate ||
    !target.direction ||
    !target.exitLabel ||
    !Number.isFinite(Number(target.latitude)) ||
    !Number.isFinite(Number(target.longitude))
  ) {
    route.textContent = "—";
    exit.textContent = "—";
    destination.textContent = "";
    status.textContent = "No upcoming exit has been selected.";
    return;
  }

  route.textContent = `${target.interstate} ${target.direction}`;
  exit.textContent = target.exitLabel;
  destination.textContent = target.destination || "";
  status.textContent = "Exit target locked. Restroom searching comes in Phase 13.2.";
}

showLockedExitTarget();
