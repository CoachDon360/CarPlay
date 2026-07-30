RAMSEY MICROBUILD 2 — LIVE EPISODES

UPLOAD TO THE REPOSITORY ROOT:
- ramsey.html
- ramsey.js

WHAT THIS MICROBUILD DOES:
- Uses the verified live feed for The Ramsey Show.
- Corrects the EntreLeadership feed to RM6855404952.
- Uses the live Smart Money Happy Hour feed.
- Attempts the feed directly, then uses two CORS fallbacks.
- Loads up to 30 recent playable episodes.
- Places the newest episode in Now Playing automatically.
- Does not autoplay when the page first opens.
- Clicking an episode loads and plays it.
- Uses episode-specific artwork when a feed supplies it.
- Changes the JavaScript cache query to ramsey.js?v=002.

UNCHANGED:
- ramsey.css
- page layout
- playback-progress storage
- listened status
- filters
