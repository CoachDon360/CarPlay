const EXIT_TARGET_STORAGE_KEY = "nexitSelectedExit";

const routeLine = document.getElementById("route-line");
const exitLine = document.getElementById("exit-line");
const destinationLine = document.getElementById("destination-line");
const statusCopy = document.getElementById("status-copy");

function loadSelectedExit() {
  try {
    const saved = sessionStorage.getItem(EXIT_TARGET_STORAGE_KEY);
    if (!saved) return null;

    const target = JSON.parse(saved);
    const validCoordinates =
      Number.isFinite(Number(target.latitude)) &&
      Number.isFinite(Number(target.longitude));

    if (!target.interstate || !target.exitLabel || !validCoordinates) {
      return null;
    }

    return target;
  } catch (error) {
    console.warn("Saved exit could not be read:", error);
    return null;
  }
}

const selectedExit = loadSelectedExit();

if (selectedExit) {
  routeLine.textContent = `${selectedExit.interstate} ${selectedExit.direction || ""}`.trim();
  exitLine.textContent = selectedExit.exitLabel;
  destinationLine.textContent = selectedExit.destination || "";
  destinationLine.hidden = !selectedExit.destination;
  statusCopy.textContent = "This exit is locked as the restroom search target.";

  // Phase 13.2 will use these locked coordinates for the restroom lookup.
  document.body.dataset.exitLatitude = selectedExit.latitude;
  document.body.dataset.exitLongitude = selectedExit.longitude;
} else {
  routeLine.textContent = "—";
  exitLine.textContent = "—";
  destinationLine.hidden = true;
  statusCopy.textContent = "Return to the driving page after an upcoming exit has been identified.";
}
