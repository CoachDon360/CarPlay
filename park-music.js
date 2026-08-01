(() => {
  "use strict";

  // Park World Radio on Live365. Change only this line if the station URL changes.
  const STREAM_URL = "https://streaming.live365.com/a89698";

  // Daytime image: 6:00 AM through 7:59 PM.
  // Nighttime image: 8:00 PM through 5:59 AM.
  const DAY_START_HOUR = 6;
  const NIGHT_START_HOUR = 20;

  const player = document.querySelector(".park-player");
  const audio = document.getElementById("park-audio");
  const button = document.getElementById("play-button");
  const symbol = document.getElementById("control-symbol");
  const meta = document.getElementById("track-meta");
  const status = document.getElementById("status");

  audio.src = STREAM_URL;

  function updateBackground() {
    const hour = new Date().getHours();
    const isDay = hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR;

    player.classList.toggle("is-day", isDay);
    player.classList.toggle("is-night", !isDay);
  }

  function setStatus(message, visible = false) {
    status.textContent = message;
    status.classList.toggle("is-visible", visible);
  }

  function showPlaying() {
    button.classList.add("playing");
    button.setAttribute("aria-label", "Pause Park Music");
    button.setAttribute("aria-pressed", "true");
    symbol.textContent = "Ⅱ";
    meta.textContent = "Streaming Live";
    setStatus("Playing");
  }

  function showPaused(message = "Paused") {
    button.classList.remove("playing");
    button.setAttribute("aria-label", "Play Park Music");
    button.setAttribute("aria-pressed", "false");
    symbol.textContent = "▶";
    setStatus(message);
  }

  async function togglePlayback() {
    if (!audio.paused) {
      audio.pause();
      showPaused();
      return;
    }

    meta.textContent = "Connecting…";
    setStatus("Connecting…");

    try {
      await audio.play();
      showPlaying();
    } catch (error) {
      console.error("Park Music playback failed:", error);
      meta.textContent = "Unable to start the stream";
      showPaused("Tap play to try again");
      setStatus("Tap play to try again", true);
    }
  }

  updateBackground();
  window.setInterval(updateBackground, 60 * 1000);

  button.addEventListener("click", togglePlayback);
  audio.addEventListener("playing", showPlaying);
  audio.addEventListener("pause", () => showPaused());
  audio.addEventListener("waiting", () => {
    meta.textContent = "Buffering…";
    setStatus("Buffering…");
  });
  audio.addEventListener("error", () => {
    meta.textContent = "Stream temporarily unavailable";
    showPaused("Tap play to retry");
    setStatus("Tap play to retry", true);
  });
})();
