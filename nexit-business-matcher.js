(() => {
  "use strict";

  /*
   * Phase 15.6.2 — Business Matching Engine
   *
   * This build matches raw business names against the existing favorites
   * catalog and renders only matched favorites on the two frozen signs.
   *
   * Desk-test example:
   *
   * nexit.html?testExit=104&nextExit=108
   *   &exit1Businesses=Pilot|Subway|McDonald's|Love's|Starbucks
   *   &exit2Businesses=Buc-ee's|Chick-fil-A|QuikTrip|Target|RaceTrac
   *
   * Use vertical bars between business names. URL encoding is handled by the
   * browser when the address is pasted normally.
   */

  const EXIT_CHANGED_EVENT = "nexit:exitschanged";
  const BUSINESSES_CHANGED_EVENT = "nexit:businesseschanged";

  const DEFAULT_TEST_BUSINESSES = Object.freeze({
    first: Object.freeze([
      "Pilot Travel Center",
      "Subway",
      "McDonald's",
      "Wendy's",
      "Love's Travel Stop",
      "Dollar General",
      "Starbucks Coffee"
    ]),
    second: Object.freeze([
      "Buc-ee's",
      "Chick-fil-A",
      "QuikTrip",
      "Target",
      "RaceTrac"
    ])
  });

  const latestRawBusinesses = {
    first: [],
    second: []
  };

  function getFavoritesApi() {
    return window.NextExitFavorites || null;
  }

  function splitBusinessList(value) {
    if (!value) return [];

    return String(value)
      .split("|")
      .map((name) => name.trim())
      .filter(Boolean);
  }

  function readUrlBusinessLists() {
    const params = new URLSearchParams(window.location.search);

    return {
      first: splitBusinessList(params.get("exit1Businesses")),
      second: splitBusinessList(params.get("exit2Businesses"))
    };
  }

  function uniqueMatches(rawNames) {
    const favorites = getFavoritesApi();
    if (!favorites) return [];

    const seen = new Set();
    const matches = [];

    rawNames.forEach((rawName) => {
      const brand = favorites.findFavoriteBrand(rawName);
      if (!brand || seen.has(brand.id)) return;

      seen.add(brand.id);
      matches.push({
        rawName,
        brandId: brand.id,
        brand
      });
    });

    return matches.slice(0, favorites.maxPerExit || 9);
  }

  function renderMatches(containerId, rawNames) {
    const favorites = getFavoritesApi();
    const container = document.getElementById(containerId);
    if (!favorites || !container) return [];

    const matches = uniqueMatches(rawNames);
    favorites.renderFavoriteBrands(
      container,
      matches.map((match) => match.brandId)
    );

    container.dataset.matchCount = String(matches.length);
    container.dataset.rawBusinessCount = String(rawNames.length);

    return matches;
  }

  function renderCurrentBusinessLists(source = "matcher") {
    const firstMatches = renderMatches(
      "exit-sign-1",
      latestRawBusinesses.first
    );

    const secondMatches = renderMatches(
      "exit-sign-2",
      latestRawBusinesses.second
    );

    window.dispatchEvent(
      new CustomEvent(BUSINESSES_CHANGED_EVENT, {
        detail: Object.freeze({
          source,
          first: Object.freeze({
            rawBusinesses: Object.freeze([...latestRawBusinesses.first]),
            matchedBrandIds: Object.freeze(
              firstMatches.map((match) => match.brandId)
            )
          }),
          second: Object.freeze({
            rawBusinesses: Object.freeze([...latestRawBusinesses.second]),
            matchedBrandIds: Object.freeze(
              secondMatches.map((match) => match.brandId)
            )
          })
        })
      })
    );
  }

  function setBusinessesForSign(sign, rawNames, source = "api") {
    const key = sign === 2 || sign === "second" ? "second" : "first";
    latestRawBusinesses[key] = Array.isArray(rawNames)
      ? rawNames.map(String).map((name) => name.trim()).filter(Boolean)
      : [];

    renderCurrentBusinessLists(source);
  }

  function setBusinessesForBothExits(firstBusinesses, secondBusinesses, source = "api") {
    latestRawBusinesses.first = Array.isArray(firstBusinesses)
      ? firstBusinesses.map(String).map((name) => name.trim()).filter(Boolean)
      : [];

    latestRawBusinesses.second = Array.isArray(secondBusinesses)
      ? secondBusinesses.map(String).map((name) => name.trim()).filter(Boolean)
      : [];

    renderCurrentBusinessLists(source);
  }

  function applyUrlTestData() {
    const urlLists = readUrlBusinessLists();
    const hasUrlBusinessData =
      urlLists.first.length > 0 || urlLists.second.length > 0;

    if (!hasUrlBusinessData) return false;

    setBusinessesForBothExits(
      urlLists.first,
      urlLists.second,
      "url-test-businesses"
    );

    document.documentElement.dataset.nexitBusinessTestMode = "true";
    return true;
  }

  function applyDefaultDeskTestData() {
    const exitBridge = window.NextExitExitBridge;
    if (!exitBridge?.isTestMode?.()) return false;

    setBusinessesForBothExits(
      DEFAULT_TEST_BUSINESSES.first,
      DEFAULT_TEST_BUSINESSES.second,
      "default-test-businesses"
    );

    return true;
  }

  function onExitsChanged() {
    /*
     * During this microbuild, business lists are independent of the exit
     * numbers. The next live-data phase will replace these arrays whenever
     * the committed exit changes.
     */
    renderCurrentBusinessLists("exit-change-refresh");
  }

  window.NextExitBusinessMatcher = Object.freeze({
    matchBusinessNames: uniqueMatches,
    setBusinessesForSign,
    setBusinessesForBothExits,
    render: renderCurrentBusinessLists,
    getCurrentBusinesses: () => ({
      first: [...latestRawBusinesses.first],
      second: [...latestRawBusinesses.second]
    })
  });

  function start() {
    window.addEventListener(EXIT_CHANGED_EVENT, onExitsChanged);

    if (applyUrlTestData()) return;
    if (applyDefaultDeskTestData()) return;

    /*
     * In normal live mode, leave the existing sample signs alone until a
     * business provider supplies raw names through setBusinessesForBothExits().
     */
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
