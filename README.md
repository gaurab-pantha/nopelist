# Nopelist — chrome extension that blocks the sites you waste time on

paste a link, it's blocked. that's it. you can also set a schedule, lock yourself in before exams, and see how many times you tried to sneak back in. no account, no tracking, everything stays in your browser local storage.

made by [Gaurab Pantha](https://gaurabdev.com)

## What it do
*   **paste anything.** `youtube.com`, a full `https://` link, `*.reddit.com`, `localhost`, even an IP address. it cleans it up for you automatically so u dont have to type it perfect.
*   **block a whole site or just one part.** `youtube.com` blocks everything on it, `://youtube.com` blocks only shorts.
*   **schedule.** only block at certain times, like school hours or weekdays. overnight works too (like 22:00 to 06:00).
*   **lock me in.** pick 30 min, 1h, 2h or 4h. until it ends you cant turn blocking off, pause it or remove a site. if you try messing with the extension's storage data it gets undone automatically by the background script.
*   **pause for 5 min, 15 min or 1 hour.** on the block page there's an "i really need it" button, but you have to wait 10 seconds countdown first (you can still back out). then it pauses for 5 minutes and takes you to the page.
*   **slip counter.** tally marks for every site, a 7 day chart and your top sites you try to sneak into.
*   **quick ways to block.** "block this site" in the popup menu, right click on any page or link, or press `Alt+Shift+B` shortcut to turn blocking on and off fast.
*   **bulk add, export your list, write your own block page message.**
*   **tabs you already have open get blocked right when you add the site.**
*   **light mode by default, dark mode with the sun/moon button.** it remembers what you choose.

## files code structure

```text
nopelist/
├── manifest.json      # extension settings (Manifest V3 metadata declaration)
├── background.js     # the blocking engine, schedule checks, lock timers, and shortcut handlers
├── common.js         # link cleanup functions and schedule math stuff that every page uses
├── ui.js             # small drawing helpers (site stickers, tally marks, layout renderers)
├── theme.js          # sets light/dark mode before the page shows up to stop screen flashing
├── popup.html        # the popup window layout you see when clicking icon
├── popup.js          # popup click triggers and button listeners
├── options.html      # advanced dashboard settings page layout
├── options.js        # settings logic, lock managers, and stats calculations
├── blocked.html      # the custom page you see instead of the blocked distraction website
├── blocked.js        # countdown handler for the delay pause button logic
├── base.css          # shared stylesheet styles and both theme color profiles
└── fonts/            # Inter font folder, cut down to the letters used
```

## how it works internally
for every site on your custom list, `background.js` registers a chrome `declarativeNetRequest` rule that redirects the target page to `blocked.html` and passes along the original page you were trying to open. it never reads what is inside your text pages or messages. read more inside `PRIVACY.md`.

## things it can't do (limitations)
*   **sites that change pages without reloading page** (like modern YouTube dashboard updates) only show the block page after you click reload or open a new browser tab.
*   `chrome://` internal dashboard pages can't be blocked because google engine security dont allow extensions to touch them.
*   lock in mode stops everything inside Nopelist settings, but you can still disable or completely delete the extension from `chrome://extensions`. i can't stop that by code, that's a built-in chrome safety feature for users.

## permissions you need to give
*   `storage` — saves your block lists, custom schedules and slip stats on your device safely.
*   `alarms` — turns the schedule on and off, ends temporary pauses and clear locks on time.
*   `declarativeNetRequest` — sends bad distracting sites to the block page interceptor.
*   `contextMenus` — the right click mouse "Block this site" quick button.
*   `access to all sites` — chrome framework needs this for running redirects, and to instantly move tabs that are already open.

## credits
*   font: [Inter](https://github.com) by The Inter Project Authors, SIL Open Font License 1.1
