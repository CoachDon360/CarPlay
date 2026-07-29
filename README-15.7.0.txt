NEXT EXIT — PHASE 15.7.0 LIVE OSM DATA BRIDGE

Upload all files in this ZIP to the repository root.

What this build does:
- Preserves the existing GPS/navigation engine.
- Reads the committed exit target from sessionStorage.
- Queries nearby named businesses through OpenStreetMap Overpass API.
- Filters those raw names through the existing favorites matcher.
- Attempts to identify the next motorway junction ahead and populate sign two.
- Caches each business lookup for 30 minutes.
- Keeps URL business-test mode available.

Live desk-test URL format:
nexit.html?liveLat=38.2004&liveLon=-84.8776&liveExit=53&interstate=64&direction=EAST

Important:
OpenStreetMap completeness varies by location. A blank favorite grid can mean that
no matching favorite brand was tagged within approximately 3 km of that exit.
