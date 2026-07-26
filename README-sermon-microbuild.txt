BIBLE SERMON MICRO BUILD 1

PURPOSE
This patch changes only the existing left panel in bible.html.

IT DOES
- Removes The Law, History, Poetry & Wisdom, Prophets, and New Testament.
- Adds Insight for Living, Southeast Christian, and Tony Evans.
- Highlights the selected ministry in iPod blue.
- Adds an empty reserved episode area.
- Adds an empty reserved mini-player area.
- Leaves the Verse of the Day and the entire right-side Bible reader untouched.

INSTALL
1. Upload bible-sermon-microbuild.js to the root of the GitHub Pages repository.
2. Open the existing bible.html.
3. Add this line immediately before </body>:

<script src="bible-sermon-microbuild.js?v=001"></script>

4. Save, commit, and deploy.
5. Test with bible.html?v=001 to bypass browser caching.

ROLLBACK
Remove the script line from bible.html and delete bible-sermon-microbuild.js.
