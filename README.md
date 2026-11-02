# Nopelist

a chrome extension that blocks the sites you waste time on. paste a link, it's blocked. that's it.

you can also set a schedule, lock yourself in before exams, and see how many times you tried to sneak back in. no account, no tracking, everything stays in your browser.

made by [Gaurab Pantha](https://gaurabdev.com)

## What it does

- paste anything. `youtube.com`, a full `https://` link, `*.reddit.com`, `localhost`, even an IP address. it cleans it up for you
- block a whole site or just one part. `youtube.com` blocks everything on it, `youtube.com/shorts` blocks only shorts
- schedule. only block at certain times, like school hours or weekdays. overnight works too (22:00 to 06:00)
- lock me in. pick 30 min, 1h, 2h or 4h. until it ends you can't turn blocking off, pause it or remove a site. if you try messing with the extension's storage it gets undone
- pause for 5 min, 15 min or 1 hour. on the block page there's an "i really need it" button, but you have to wait 10 seconds first (you can still back out). then it pauses for 5 minutes and takes you to the page
- slip counter. tally marks for every site, a 7 day chart and your top sites
- quick ways to block: "block this site" in the popup, right click on any page or link, or press `Alt+Shift+B` to turn blocking on and off
- bulk add, export your list, write your own block page message
- tabs you already have open get blocked right when you add the site
- light mode by default, dark mode with the sun/moon button. it remembers

## try it

1. download or clone this repo
2. go to `chrome://extensions` and turn on **Developer mode**
3. click **Load unpacked** and pick the `nopelist` folder
4. pin Nopelist to your toolbar, click it, add a site

needs Chrome 120 or newer. for incognito, open Details on the extension card and turn on "Allow in Incognito".


## files

| file | what it does |
|---|---|
| `manifest.json` | extension settings (Manifest V3) |
| `background.js` | the blocking, schedule, lock in, pause, right click menu and shortcut |
| `common.js` | link cleanup, matching and schedule stuff that every page uses |
| `ui.js` | small drawing helpers (site stickers, tally marks) |
| `theme.js` | sets light/dark before the page shows up |
| `popup.*` | the popup |
| `options.*` | settings page and stats |
| `blocked.*` | the page you see instead of the blocked site |
| `base.css` | shared styles and both themes |
| `fonts/` | Inter font, cut down to the letters used (license is in `fonts/LICENSE.txt`) |
| `icons/` | the icons |

## how it works

for every site on your list, `background.js` makes a `declarativeNetRequest` rule that sends the page to `blocked.html` and passes along the page you were trying to open. it never reads what's on the page. more in [PRIVACY.md](PRIVACY.md).

## things it can't do

- sites that change pages without reloading (like YouTube) only show the block page after a reload or a new tab
- `chrome://` pages can't be blocked
- lock in stops everything inside Nopelist, but you can still disable or remove the extension from `chrome://extensions`. i can't stop that, that's chrome

## permissions

| permission | why |
|---|---|
| `storage` | saves your list, schedule and stats on your device |
| `alarms` | turns the schedule on and off, ends pauses and locks on time |
| `declarativeNetRequest` | sends blocked sites to the block page |
| `contextMenus` | the right click "Block this site" button |
| access to all sites | chrome needs this for redirects, and to move tabs that are already open |

## chrome web store

zip only the extension files:

```
zip -r nopelist-store.zip manifest.json *.js*.css*.html icon fonts
```

use the permission table above for the justification and host `PRIVACY.md` for the privacy policy link.

## credits

- font: [Inter](https://github.com/rsms/inter) by The Inter Project Authors, SIL Open Font License 1.1
- i used Claude (AI) to help with the first version of the code, then i designed it and put it together myself. i take help of Claude AI

## made by

Gaurab Pantha [gaurabdev.com](https://gaurabdev.com)  [github.com/gaurab-pantha](https://github.com/gaurab-pantha)

*designed with curiosity. built through learning.*