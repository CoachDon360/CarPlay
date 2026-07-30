const shows = {
  ramsey: {
    title: "The Ramsey Show",
    artwork: "ramsey-show-art.png",
    feed: "https://feeds.megaphone.fm/RM4031649020"
  },
  entre: {
    title: "EntreLeadership",
    artwork: "ramsey-entreleadership-art.png",
    feed: "https://feeds.megaphone.fm/RM6855404952"
  },
  smart: {
    title: "Smart Money Happy Hour",
    artwork: "ramsey-smart-money-art.png",
    feed: "https://feeds.megaphone.fm/smartmoneyhappyhour"
  }
};

const feedFetchers = [
  feedUrl => feedUrl,
  feedUrl => `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
  feedUrl => `https://corsproxy.io/?url=${encodeURIComponent(feedUrl)}`
];

async function fetchFeedXml(feedUrl) {
  let lastError;

  for (const makeUrl of feedFetchers) {
    try {
      const response = await fetch(makeUrl(feedUrl), {
        cache: "no-store",
        headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" }
      });

      if (!response.ok) {
        throw new Error(`Feed request returned ${response.status}`);
      }

      const text = await response.text();
      if (!text.includes("<rss") && !text.includes("<feed")) {
        throw new Error("The response was not a podcast feed");
      }

      return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("The podcast feed could not be loaded");
}
const storageKey = "ramseyPodcastProgressV1";

const audio = document.querySelector("#audioPlayer");
const showArtwork = document.querySelector("#showArtwork");
const pageTitle = document.querySelector("#pageTitle");
const episodesShowName = document.querySelector("#episodesShowName");
const episodeTitle = document.querySelector("#episodeTitle");
const episodeShow = document.querySelector("#episodeShow");
const episodeMeta = document.querySelector("#episodeMeta");
const episodeList = document.querySelector("#episodeList");
const feedMessage = document.querySelector("#feedMessage");
const playPauseButton = document.querySelector("#playPauseButton");
const progressBar = document.querySelector("#progressBar");
const elapsedTime = document.querySelector("#elapsedTime");
const remainingTime = document.querySelector("#remainingTime");
const markListenedButton = document.querySelector("#markListenedButton");

let activeShowKey = "ramsey";
let episodes = [];
let currentEpisode = null;
let currentFilter = "all";
let progressData = readProgress();

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(storageKey, JSON.stringify(progressData));
}

function episodeId(showKey, episode) {
  return `${showKey}:${episode.guid || episode.audio || episode.title}`;
}

function cleanText(value = "") {
  const div = document.createElement("div");
  div.innerHTML = value;
  return div.textContent.trim();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return hours
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${secs}`
    : `${minutes}:${secs}`;
}

function updateClock() {
  document.querySelector("#clock").textContent =
    new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
updateClock();
setInterval(updateClock, 15000);

async function loadShow(showKey) {
  activeShowKey = showKey;
  currentEpisode = null;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();

  const show = shows[showKey];
  pageTitle.textContent = show.title;
  episodesShowName.textContent = show.title;
  episodeShow.textContent = show.title;
  episodeTitle.textContent = "Choose an episode";
  episodeMeta.textContent = "Latest episodes will appear on the right.";
  showArtwork.src = show.artwork;
  showArtwork.alt = `${show.title} artwork`;
  markListenedButton.disabled = true;
  markListenedButton.classList.remove("listened");
  markListenedButton.textContent = "✓ Mark as listened";

  document.querySelectorAll(".show-tab").forEach(button => {
    button.classList.toggle("active", button.dataset.show === showKey);
  });

  feedMessage.hidden = false;
  feedMessage.textContent = "Loading episodes…";
  episodeList.innerHTML = "";

  try {
    const xmlText = await fetchFeedXml(show.feed);
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    if (xml.querySelector("parsererror")) throw new Error("Feed could not be read");

    episodes = [...xml.querySelectorAll("item")].slice(0, 30).map(item => ({
      title: cleanText(item.querySelector("title")?.textContent || "Untitled episode"),
      date: formatDate(item.querySelector("pubDate")?.textContent || ""),
      duration: item.getElementsByTagName("itunes:duration")[0]?.textContent || "",
      audio: item.querySelector("enclosure")?.getAttribute("url") || "",
      guid: item.querySelector("guid")?.textContent || "",
      artwork:
        item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") ||
        item.querySelector("image url")?.textContent ||
        show.artwork
    })).filter(item => item.audio);

    if (!episodes.length) throw new Error("No playable episodes were found");

    feedMessage.hidden = true;
    renderEpisodes();

    if (episodes[0]) {
      selectEpisode(episodes[0], false);
    }
  } catch (error) {
    feedMessage.hidden = false;
    console.error(error);
    feedMessage.textContent =
      "The live episode feed could not load. Check your connection, then tap this show again.";
  }
}

function renderEpisodes() {
  episodeList.innerHTML = "";
  const visible = episodes.filter(episode => {
    if (currentFilter === "all") return true;
    const state = progressData[episodeId(activeShowKey, episode)];
    return !state?.listened;
  });

  if (!visible.length) {
    feedMessage.hidden = false;
    feedMessage.textContent = currentFilter === "unplayed"
      ? "You've listened to every episode currently shown."
      : "No episodes are available.";
    return;
  }

  feedMessage.hidden = true;

  visible.forEach(episode => {
    const id = episodeId(activeShowKey, episode);
    const state = progressData[id] || {};
    const row = document.createElement("button");
    row.type = "button";
    row.className = "episode-row";
    if (state.listened) row.classList.add("is-listened");
    if (currentEpisode && episodeId(activeShowKey, currentEpisode) === id) {
      row.classList.add("active");
    }

    const percent = state.duration
      ? Math.min(100, Math.round((state.currentTime / state.duration) * 100))
      : 0;

    row.innerHTML = `
      <img class="row-art" src="${episode.artwork}" alt="" />
      <span class="row-copy">
        <span class="row-title">
          ${state.listened ? '<span class="listened-check">✓</span>' : ''}
          <strong>${episode.title}</strong>
        </span>
        <span class="row-meta">${episode.date}</span>
      </span>
      <span class="row-side">
        ${percent > 0 && !state.listened ? `<span class="row-progress">${percent}%</span>` : ""}
        <span>${episode.duration || ""}</span>
        <span class="chevron">›</span>
      </span>
    `;

    row.addEventListener("click", () => selectEpisode(episode, true));
    episodeList.appendChild(row);
  });
}

function selectEpisode(episode, shouldPlay = true) {
  currentEpisode = episode;
  const id = episodeId(activeShowKey, episode);
  const state = progressData[id] || {};

  episodeTitle.textContent = episode.title;
  episodeShow.textContent = shows[activeShowKey].title;
  episodeMeta.textContent = `${episode.date}${episode.duration ? ` • ${episode.duration}` : ""}`;
  showArtwork.src = episode.artwork;

  audio.src = episode.audio;
  audio.addEventListener("loadedmetadata", function restorePosition() {
    if (state.currentTime && state.currentTime < audio.duration - 5) {
      audio.currentTime = state.currentTime;
    }
    audio.removeEventListener("loadedmetadata", restorePosition);
  });

  markListenedButton.disabled = false;
  updateListenedButton();
  renderEpisodes();

  if (shouldPlay) {
    audio.play().catch(() => {});
  }
}

function updateListenedButton() {
  if (!currentEpisode) return;
  const state = progressData[episodeId(activeShowKey, currentEpisode)] || {};
  markListenedButton.classList.toggle("listened", Boolean(state.listened));
  markListenedButton.textContent = state.listened
    ? "✓ Listened"
    : "✓ Mark as listened";
}

playPauseButton.addEventListener("click", () => {
  if (!audio.src) return;
  if (audio.paused) audio.play();
  else audio.pause();
});

document.querySelector("#rewindButton").addEventListener("click", () => {
  audio.currentTime = Math.max(0, audio.currentTime - 15);
});

document.querySelector("#forwardButton").addEventListener("click", () => {
  audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 15);
});

audio.addEventListener("play", () => {
  playPauseButton.textContent = "❚❚";
});

audio.addEventListener("pause", () => {
  playPauseButton.textContent = "▶";
});

audio.addEventListener("timeupdate", () => {
  elapsedTime.textContent = formatTime(audio.currentTime);
  remainingTime.textContent = `-${formatTime(Math.max(0, (audio.duration || 0) - audio.currentTime))}`;
  progressBar.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;

  if (!currentEpisode || !Number.isFinite(audio.duration)) return;

  const id = episodeId(activeShowKey, currentEpisode);
  const previous = progressData[id] || {};
  progressData[id] = {
    ...previous,
    currentTime: audio.currentTime,
    duration: audio.duration,
    listened: previous.listened || audio.currentTime / audio.duration >= 0.9
  };

  saveProgress();
  if (progressData[id].listened !== previous.listened) {
    updateListenedButton();
    renderEpisodes();
  }
});

progressBar.addEventListener("input", () => {
  if (audio.duration) {
    audio.currentTime = (Number(progressBar.value) / 100) * audio.duration;
  }
});

markListenedButton.addEventListener("click", () => {
  if (!currentEpisode) return;
  const id = episodeId(activeShowKey, currentEpisode);
  const state = progressData[id] || {};
  progressData[id] = {
    ...state,
    listened: !state.listened,
    currentTime: state.currentTime || audio.currentTime || 0,
    duration: state.duration || audio.duration || 0
  };
  saveProgress();
  updateListenedButton();
  renderEpisodes();
});

document.querySelectorAll(".show-tab").forEach(button => {
  button.addEventListener("click", () => loadShow(button.dataset.show));
});

document.querySelector("#allFilter").addEventListener("click", () => {
  currentFilter = "all";
  document.querySelector("#allFilter").classList.add("active");
  document.querySelector("#unplayedFilter").classList.remove("active");
  renderEpisodes();
});

document.querySelector("#unplayedFilter").addEventListener("click", () => {
  currentFilter = "unplayed";
  document.querySelector("#unplayedFilter").classList.add("active");
  document.querySelector("#allFilter").classList.remove("active");
  renderEpisodes();
});

loadShow("ramsey");
