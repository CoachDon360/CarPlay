const clock = document.getElementById("clock");

function updateClock() {
  const now = new Date();
  clock.textContent = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(now);
}

updateClock();
window.setInterval(updateClock, 15000);
