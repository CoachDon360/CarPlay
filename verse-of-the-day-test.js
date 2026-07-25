(() => {
  "use strict";

  // Tiny test set: one verse for each day of the week.
  // After we confirm the display works, this becomes the full 365-verse list.
  const verses = [
    {
      reference: "Deuteronomy 31:8",
      text: "The Lord himself goes before you and will be with you; he will never leave you nor forsake you. Do not be afraid; do not be discouraged."
    },
    {
      reference: "Isaiah 41:10",
      text: "Do not fear, for I am with you; do not be dismayed, for I am your God."
    },
    {
      reference: "Jeremiah 29:11",
      text: "For I know the plans I have for you, declares the Lord, plans to give you hope and a future."
    },
    {
      reference: "John 14:27",
      text: "Peace I leave with you; my peace I give you."
    },
    {
      reference: "Philippians 4:6–7",
      text: "Do not be anxious about anything, but in everything, by prayer and petition, with thanksgiving, present your requests to God."
    },
    {
      reference: "Proverbs 3:5–6",
      text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways acknowledge him."
    },
    {
      reference: "Psalm 46:1",
      text: "God is our refuge and strength, an ever-present help in trouble."
    }
  ];

  const referenceElement = document.getElementById("verseReference");
  const textElement = document.getElementById("verseText");

  if (!referenceElement || !textElement) {
    console.warn("Verse of the Day elements were not found.");
    return;
  }

  // Normal behavior: today's local day of the week picks the verse.
  // Testing shortcut: add ?verse=1 through ?verse=7 to the URL.
  const params = new URLSearchParams(window.location.search);
  const requestedVerse = Number.parseInt(params.get("verse"), 10);

  let index = new Date().getDay();

  if (
    Number.isInteger(requestedVerse) &&
    requestedVerse >= 1 &&
    requestedVerse <= verses.length
  ) {
    index = requestedVerse - 1;
  }

  const verse = verses[index];
  referenceElement.textContent = verse.reference;
  textElement.textContent = `“${verse.text}”`;
})();
