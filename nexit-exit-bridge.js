(() => {
  "use strict";

  /*
   * Phase 15.6.1 — Exit Data Bridge
   *
   * Desk-test examples:
   *   nexit.html?testExit=104&nextExit=108
   *   nexit.html?testExit=127&nextExit=131&interstate=75&direction=NORTH
   *
   * Remove the query parameters to return to normal live operation.
   */

  const firstCardNumber = document.querySelector(
    ".upcoming-exit-card:nth-child(1) .exit-card-number"
  );
  const secondCardNumber = document.querySelector(
    ".upcoming-exit-card:nth-child(2) .exit-card-number"
  );
  const firstSign = document.getElementById("exit-sign-1");
  const secondSign = document.getElementById("exit-sign-2");

  const hiddenInterstate = document.getElementById("interstate-status");
  const hiddenDirection = document.getElementById("location-detail");
  const hiddenExit = document.getElementById("exit-number");

  const shieldNumber = document.getElementById("shield-route-number");
  const directionPlaque = document.getElementById("direction-plaque");
  const shield = document.getElementById("interstate-shield");

  let lastCommittedExit = null;
  const testState = readTestState();

  function cleanExitValue(value) {
    const text = String(value ?? "").trim();
    if (!text || text === "—" || /search|waiting|detect/i.test(text)) return "";
    return text.replace(/^exit\s+/i, "").trim();
  }

  function cleanInterstateNumber(value) {
    const match = String(value ?? "").match(/\b(?:I[-\s]?)?(\d{1,3})\b/i);
    return match ? match[1] : "";
  }

  function cleanDirection(value) {
    const match = String(value ?? "").toUpperCase().match(
      /\b(NORTH|SOUTH|EAST|WEST|NORTHEAST|NORTHWEST|SOUTHEAST|SOUTHWEST)\b/
    );
    return match ? match[1] : "";
  }

  function readTestState() {
    const params = new URLSearchParams(window.location.search);
    const currentExit = cleanExitValue(params.get("testExit"));
    if (!currentExit) return null;

    return {
      currentExit,
      nextExit: cleanExitValue(params.get("nextExit")),
      interstate: cleanInterstateNumber(params.get("interstate")),
      direction: cleanDirection(params.get("direction"))
    };
  }

  function updateSignAccessibility(exitValue, cardNumber, sign) {
    if (!exitValue) return;
    cardNumber.textContent = exitValue;
    sign.setAttribute("aria-label", `Favorite businesses at Exit ${exitValue}`);
  }

  function dispatchExitChange(currentExit, nextExit, source) {
    window.dispatchEvent(
      new CustomEvent("nexit:exitschanged", {
        detail: Object.freeze({ currentExit, nextExit, source })
      })
    );
  }

  function setRouteHeader(interstate, direction) {
    const routeNumber = cleanInterstateNumber(interstate);
    const routeDirection = cleanDirection(direction);

    if (routeNumber && shieldNumber) {
      shieldNumber.textContent = routeNumber;
      shield?.setAttribute("aria-label", `Interstate ${routeNumber}`);
    }

    if (routeDirection && directionPlaque) {
      directionPlaque.textContent = routeDirection;
    }
  }

  function setExits(currentExit, nextExit, source = "bridge") {
    const first = cleanExitValue(currentExit);
    const second = cleanExitValue(nextExit);

    if (first && firstCardNumber && firstSign) {
      updateSignAccessibility(first, firstCardNumber, firstSign);
      lastCommittedExit = first;
    }

    if (second && secondCardNumber && secondSign) {
      updateSignAccessibility(second, secondCardNumber, secondSign);
    }

    dispatchExitChange(
      first || firstCardNumber?.textContent.trim() || "",
      second || secondCardNumber?.textContent.trim() || "",
      source
    );
  }

  function applyTestState() {
    if (!testState) return false;
    setRouteHeader(testState.interstate, testState.direction);
    setExits(testState.currentExit, testState.nextExit, "url-test");
    document.documentElement.dataset.nexitTestMode = "true";
    return true;
  }

  function syncLiveRouteHeader() {
    if (testState) return;
    setRouteHeader(hiddenInterstate?.textContent, hiddenDirection?.textContent);
  }

  function syncCommittedExit() {
    if (testState) return;
    const committed = cleanExitValue(hiddenExit?.textContent);
    if (!committed || committed === lastCommittedExit) return;
    setExits(committed, "", "live-committed-exit");
  }

  function observeElement(element, callback) {
    if (!element) return null;
    const observer = new MutationObserver(callback);
    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true
    });
    return observer;
  }

  window.NextExitExitBridge = Object.freeze({
    setExits,
    setRouteHeader,
    isTestMode: () => Boolean(testState),
    getTestState: () => (testState ? { ...testState } : null)
  });

  function start() {
    if (applyTestState()) return;

    syncLiveRouteHeader();
    syncCommittedExit();

    observeElement(hiddenExit, syncCommittedExit);
    observeElement(hiddenInterstate, syncLiveRouteHeader);
    observeElement(hiddenDirection, syncLiveRouteHeader);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
