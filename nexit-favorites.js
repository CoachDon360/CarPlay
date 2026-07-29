(() => {
  "use strict";

  const MAX_FAVORITES_PER_EXIT = 9;

  const FAVORITE_BRANDS = Object.freeze({
    bucees: {
      id: "bucees",
      name: "Buc-ee's",
      category: "fuel",
      aliases: ["buc-ee's", "buc ees", "bucees"],
      logo: "https://www.google.com/s2/favicons?domain=buc-ees.com&sz=128"
    },
    loves: {
      id: "loves",
      name: "Love's",
      category: "fuel",
      aliases: ["love's", "loves", "love's travel stop", "loves travel stop"],
      logo: "https://www.google.com/s2/favicons?domain=loves.com&sz=128"
    },
    pilot: {
      id: "pilot",
      name: "Pilot",
      category: "fuel",
      aliases: ["pilot", "pilot travel center", "pilot travel centers"],
      logo: "https://www.google.com/s2/favicons?domain=pilotflyingj.com&sz=128"
    },
    flyingj: {
      id: "flyingj",
      name: "Flying J",
      category: "fuel",
      aliases: ["flying j", "flying j travel center"],
      logo: "https://www.google.com/s2/favicons?domain=pilotflyingj.com&sz=128"
    },
    ta: {
      id: "ta",
      name: "TA",
      category: "fuel",
      aliases: ["ta", "travelcenters of america", "travel centers of america"],
      logo: "https://www.google.com/s2/favicons?domain=ta-petro.com&sz=128"
    },
    petro: {
      id: "petro",
      name: "Petro",
      category: "fuel",
      aliases: ["petro", "petro stopping center"],
      logo: "https://www.google.com/s2/favicons?domain=ta-petro.com&sz=128"
    },
    quiktrip: {
      id: "quiktrip",
      name: "QuikTrip",
      category: "fuel",
      aliases: ["quiktrip", "qt"],
      logo: "https://www.google.com/s2/favicons?domain=quiktrip.com&sz=128"
    },
    racetrac: {
      id: "racetrac",
      name: "RaceTrac",
      category: "fuel",
      aliases: ["racetrac", "race trac"],
      logo: "https://www.google.com/s2/favicons?domain=racetrac.com&sz=128"
    },
    wawa: {
      id: "wawa",
      name: "Wawa",
      category: "fuel",
      aliases: ["wawa"],
      logo: "https://www.google.com/s2/favicons?domain=wawa.com&sz=128"
    },
    weigels: {
      id: "weigels",
      name: "Weigel's",
      category: "fuel",
      aliases: ["weigel's", "weigels"],
      logo: "https://www.google.com/s2/favicons?domain=weigels.com&sz=128"
    },
    caseys: {
      id: "caseys",
      name: "Casey's",
      category: "fuel",
      aliases: ["casey's", "caseys", "casey's general store"],
      logo: "https://www.google.com/s2/favicons?domain=caseys.com&sz=128"
    },
    circlek: {
      id: "circlek",
      name: "Circle K",
      category: "fuel",
      aliases: ["circle k", "circlek"],
      logo: "https://www.google.com/s2/favicons?domain=circlek.com&sz=128"
    },
    maverik: {
      id: "maverik",
      name: "Maverik",
      category: "fuel",
      aliases: ["maverik", "maverik adventure's first stop"],
      logo: "https://www.google.com/s2/favicons?domain=maverik.com&sz=128"
    },
    chickfila: {
      id: "chickfila",
      name: "Chick-fil-A",
      category: "food",
      aliases: ["chick-fil-a", "chick fil a", "chickfila"],
      logo: "https://www.google.com/s2/favicons?domain=chick-fil-a.com&sz=128"
    },
    culvers: {
      id: "culvers",
      name: "Culver's",
      category: "food",
      aliases: ["culver's", "culvers"],
      logo: "https://www.google.com/s2/favicons?domain=culvers.com&sz=128"
    },
    mcdonalds: {
      id: "mcdonalds",
      name: "McDonald's",
      category: "food",
      aliases: ["mcdonald's", "mcdonalds"],
      logo: "https://www.google.com/s2/favicons?domain=mcdonalds.com&sz=128"
    },
    starbucks: {
      id: "starbucks",
      name: "Starbucks",
      category: "coffee",
      aliases: ["starbucks", "starbucks coffee"],
      logo: "https://www.google.com/s2/favicons?domain=starbucks.com&sz=128"
    },
    shell: {
      id: "shell",
      name: "Shell",
      category: "fuel",
      aliases: ["shell", "shell gas station"],
      logo: "https://www.google.com/s2/favicons?domain=shell.com&sz=128"
    },
    kroger: {
      id: "kroger",
      name: "Kroger",
      category: "retail",
      aliases: ["kroger", "kroger fuel center"],
      logo: "https://www.google.com/s2/favicons?domain=kroger.com&sz=128"
    }
  });

  const SAMPLE_EXIT_BUSINESSES = Object.freeze({
    "53": [
      "bucees", "loves", "pilot",
      "chickfila", "wawa", "quiktrip",
      "starbucks", "caseys", "shell"
    ],
    "60": [
      "culvers", "racetrac", "mcdonalds",
      "ta", "petro", "circlek",
      "weigels", "maverik", "kroger"
    ]
  });

  function normalizeBusinessName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function findFavoriteBrand(rawName) {
    const normalized = normalizeBusinessName(rawName);
    if (!normalized) return null;

    return Object.values(FAVORITE_BRANDS).find((brand) =>
      brand.aliases.some((alias) =>
        normalized.includes(normalizeBusinessName(alias))
      )
    ) || null;
  }

  function createBusinessTile(brand) {
    const tile = document.createElement("div");
    tile.className = "business-tile";
    tile.dataset.brandId = brand.id;

    const image = document.createElement("img");
    image.className = "business-logo";
    image.src = brand.logo;
    image.alt = "";
    image.loading = "eager";
    image.decoding = "async";

    const label = document.createElement("span");
    label.className = "business-name";
    label.textContent = brand.name;

    tile.append(image, label);
    return tile;
  }

  function renderFavoriteBrands(container, brandIds) {
    if (!container) return;

    container.replaceChildren();

    brandIds
      .slice(0, MAX_FAVORITES_PER_EXIT)
      .map((id) => FAVORITE_BRANDS[id])
      .filter(Boolean)
      .forEach((brand) => container.append(createBusinessTile(brand)));
  }

  function renderSampleExits() {
    const firstExitNumber =
      document.querySelector(".upcoming-exit-card:nth-child(1) .exit-card-number")
        ?.textContent.trim() || "53";

    const secondExitNumber =
      document.querySelector(".upcoming-exit-card:nth-child(2) .exit-card-number")
        ?.textContent.trim() || "60";

    renderFavoriteBrands(
      document.getElementById("exit-sign-1"),
      SAMPLE_EXIT_BUSINESSES[firstExitNumber] || SAMPLE_EXIT_BUSINESSES["53"]
    );

    renderFavoriteBrands(
      document.getElementById("exit-sign-2"),
      SAMPLE_EXIT_BUSINESSES[secondExitNumber] || SAMPLE_EXIT_BUSINESSES["60"]
    );
  }

  // Public bridge for the later live-data microbuilds.
  window.NextExitFavorites = Object.freeze({
    brands: FAVORITE_BRANDS,
    maxPerExit: MAX_FAVORITES_PER_EXIT,
    normalizeBusinessName,
    findFavoriteBrand,
    renderFavoriteBrands
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderSampleExits, { once: true });
  } else {
    renderSampleExits();
  }
})();
