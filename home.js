(() => {
  "use strict";

  const clock = document.getElementById("home-time");
  const temperature = document.getElementById("temperature");
  const weatherIcon = document.getElementById("weather-icon");

  // Fixed home location: Frankfort, Kentucky.
  // This avoids relying on Tesla Browser geolocation permissions.
  const WEATHER_URL =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=38.2004&longitude=-84.8776" +
    "&current=temperature_2m,weather_code,is_day" +
    "&temperature_unit=fahrenheit&timezone=America%2FNew_York";

  const WEATHER_REFRESH_MS = 15 * 60 * 1000;

  function updateClock() {
    const now = new Date();
    clock.textContent = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(now);
  }

  function conditionFor(code, isDay) {
    if (code === 0) {
      return isDay
        ? { file: "weather-sun.svg", label: "Clear" }
        : { file: "weather-moon.svg", label: "Clear night" };
    }

    if (code === 1 || code === 2) {
      return isDay
        ? { file: "weather-partly-cloudy.svg", label: "Partly cloudy" }
        : { file: "weather-night-cloudy.svg", label: "Partly cloudy night" };
    }

    if (code === 3 || code === 45 || code === 48) {
      return { file: "weather-cloud.svg", label: code === 3 ? "Cloudy" : "Foggy" };
    }

    if (
      code === 51 || code === 53 || code === 55 ||
      code === 56 || code === 57 ||
      code === 61 || code === 63 || code === 65 ||
      code === 66 || code === 67 ||
      code === 80 || code === 81 || code === 82
    ) {
      return { file: "weather-rain.svg", label: "Rain" };
    }

    if (
      code === 71 || code === 73 || code === 75 || code === 77 ||
      code === 85 || code === 86
    ) {
      return { file: "weather-snow.svg", label: "Snow" };
    }

    if (code === 95 || code === 96 || code === 99) {
      return { file: "weather-storm.svg", label: "Thunderstorms" };
    }

    return { file: "weather-cloud.svg", label: "Current conditions" };
  }

  async function updateWeather() {
    try {
      const response = await fetch(WEATHER_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);

      const data = await response.json();
      const current = data.current;
      if (!current || !Number.isFinite(current.temperature_2m)) {
        throw new Error("Weather response did not include a temperature");
      }

      const condition = conditionFor(Number(current.weather_code), Number(current.is_day) === 1);
      temperature.textContent = `${Math.round(current.temperature_2m)}°`;
      weatherIcon.src = `${condition.file}?v=004`;
      weatherIcon.alt = condition.label;
    } catch (error) {
      console.warn("Live weather unavailable.", error);
      temperature.textContent = "--°";
      weatherIcon.src = "weather-cloud.svg?v=004";
      weatherIcon.alt = "Weather unavailable";
    }
  }

  updateClock();
  updateWeather();
  window.setInterval(updateClock, 1000);
  window.setInterval(updateWeather, WEATHER_REFRESH_MS);
})();
