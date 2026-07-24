(() => {
  "use strict";

  const WEATHER_LOCATION = {
    name: "Frankfort, Kentucky",
    latitude: 38.2009,
    longitude: -84.8733,
    timezone: "America/New_York"
  };

  const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

  const screen = document.querySelector(".home-screen");
  const trigger = document.getElementById("weather-trigger");
  const panel = document.getElementById("forecast-panel");
  const closeButton = document.getElementById("forecast-close");
  const backdrop = document.getElementById("forecast-backdrop");
  const temperature = document.getElementById("temperature");
  const weatherIcon = document.getElementById("weather-icon");
  const forecastStrip = document.getElementById("forecast-strip");
  const updatedText = document.getElementById("forecast-updated");
  const clock = document.getElementById("home-time");

  let weatherLoaded = false;
  let weatherRequest = null;

  function updateClock() {
    clock.textContent = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function iconFor(code, isDay) {
    if (code === 0) return isDay ? "weather-sun.svg" : "weather-moon.svg";
    if (code === 1 || code === 2) {
      return isDay ? "weather-partly-cloudy.svg" : "weather-night-cloudy.svg";
    }
    if (code === 3 || code === 45 || code === 48) return "weather-cloud.svg";
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) {
      return "weather-rain.svg";
    }
    if ([71,73,75,77,85,86].includes(code)) return "weather-snow.svg";
    if ([95,96,99].includes(code)) return "weather-storm.svg";
    return isDay ? "weather-partly-cloudy.svg" : "weather-night-cloudy.svg";
  }

  function conditionName(code) {
    if (code === 0) return "Clear";
    if (code === 1) return "Mostly clear";
    if (code === 2) return "Partly cloudy";
    if (code === 3) return "Cloudy";
    if (code === 45 || code === 48) return "Fog";
    if ([51,53,55,56,57].includes(code)) return "Drizzle";
    if ([61,63,65,66,67].includes(code)) return "Rain";
    if ([71,73,75,77,85,86].includes(code)) return "Snow";
    if ([80,81,82].includes(code)) return "Showers";
    if ([95,96,99].includes(code)) return "Thunderstorms";
    return "Current conditions";
  }

  function formatHour(isoTime) {
    return new Date(isoTime).toLocaleTimeString([], {
      hour: "numeric",
      hour12: true
    }).replace(" ", "\u00a0");
  }

  function buildWeatherUrl() {
    const params = new URLSearchParams({
      latitude: String(WEATHER_LOCATION.latitude),
      longitude: String(WEATHER_LOCATION.longitude),
      current: "temperature_2m,weather_code,is_day",
      hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
      temperature_unit: "fahrenheit",
      timezone: WEATHER_LOCATION.timezone,
      forecast_days: "2"
    });
    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  }

  function firstFutureHourIndex(times) {
    const now = Date.now();
    const index = times.findIndex(value => new Date(value).getTime() > now);
    return index === -1 ? Math.max(0, times.length - 12) : index;
  }

  function renderForecast(hourly) {
    const start = firstFutureHourIndex(hourly.time);
    const end = Math.min(start + 12, hourly.time.length);
    const cards = [];

    for (let i = start; i < end; i += 1) {
      const code = hourly.weather_code[i];
      const isDay = Boolean(hourly.is_day[i]);
      const rainChance = Math.round(hourly.precipitation_probability[i] ?? 0);
      const label = conditionName(code);

      cards.push(`
        <article class="forecast-hour" aria-label="${formatHour(hourly.time[i])}, ${label}, ${Math.round(hourly.temperature_2m[i])} degrees, ${rainChance} percent chance of precipitation">
          <div class="forecast-time">${formatHour(hourly.time[i])}</div>
          <img src="${iconFor(code, isDay)}" alt="${label}">
          <div class="forecast-temp">${Math.round(hourly.temperature_2m[i])}°</div>
          <div class="forecast-rain">${rainChance}%</div>
        </article>
      `);
    }

    forecastStrip.innerHTML = cards.join("");
    forecastStrip.scrollLeft = 0;
  }

  async function loadWeather(force = false) {
    if (weatherRequest && !force) return weatherRequest;

    weatherRequest = fetch(buildWeatherUrl(), { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
        return response.json();
      })
      .then(data => {
        const current = data.current;
        temperature.textContent = `${Math.round(current.temperature_2m)}°`;
        weatherIcon.src = iconFor(current.weather_code, Boolean(current.is_day));
        weatherIcon.alt = conditionName(current.weather_code);
        renderForecast(data.hourly);
        updatedText.textContent = `Updated ${new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit"
        })}`;
        weatherLoaded = true;
      })
      .catch(error => {
        console.error(error);
        if (!weatherLoaded) {
          temperature.textContent = "--°";
          weatherIcon.src = "weather-partly-cloudy.svg";
          weatherIcon.alt = "Weather unavailable";
          forecastStrip.innerHTML =
            '<div class="forecast-error">Forecast unavailable. Tap the weather again to retry.</div>';
          updatedText.textContent = "";
        }
      })
      .finally(() => {
        weatherRequest = null;
      });

    return weatherRequest;
  }

  function openForecast() {
    screen.classList.add("forecast-open");
    panel.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
    loadWeather(!weatherLoaded);
  }

  function closeForecast({ returnFocus = false } = {}) {
    screen.classList.remove("forecast-open");
    panel.setAttribute("aria-hidden", "true");
    trigger.setAttribute("aria-expanded", "false");
    if (returnFocus) trigger.focus();
  }

  function toggleForecast() {
    if (screen.classList.contains("forecast-open")) {
      closeForecast();
    } else {
      openForecast();
    }
  }

  trigger.addEventListener("click", toggleForecast);
  closeButton.addEventListener("click", () => closeForecast({ returnFocus: true }));
  backdrop.addEventListener("click", () => closeForecast());

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && screen.classList.contains("forecast-open")) {
      closeForecast({ returnFocus: true });
    }
  });

  updateClock();
  setInterval(updateClock, 30000);
  loadWeather();
  setInterval(() => loadWeather(true), REFRESH_INTERVAL_MS);
})();
