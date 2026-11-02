import { load, send, isActive, isLocked, dayKey, fmtLeft, applyTheme, LINES } from './common.js';
import { tally, logoSvg } from './ui.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const site = (params.get('site') || '').trim();
const auto = params.get('auto') === '1'; 

let st = null;
let watching = null;
const randomLine = LINES[Math.floor(Math.random() * LINES.length)];

$('logo').innerHTML = logoSvg();
$('site').textContent = site || 'a blocked site';

async function refresh() {
    st = await load();
    applyTheme(st.theme);
    render();
}

function render() {
    const active = isActive(st);
    const locked = isLocked(st);

    $('backBtn').hidden = !active;
    $('pauseBtn').hidden = !active || locked || !!waiting;
    $('openBtn').hidden = active;

    const msg = $('msg');
    if (active) {
        const text = st.message.trim() || raandomLine;
        msg.textContent = text;
        msg.classList.toggle('long', text.length > 16);
        const n = st.counts[site] || 0;
        $('sub').textContent = locked
          ? "you locked yourself in. past you was serious."
          : n > 1 ? `this one has stopped you ${n} times now.` : "this one's on your block list.";
    } else {
        msg.textContent = "you're free";
        msg.classList.remove('long');
        $('sub').textContent = !st.enabled
          ? 'blocking is switched off.'
          : Date.now() < st.pausedUntil ? 'blocking is paused for a bit.' : "it's outside your schedule right now.";
    }

    const tag = $('lockTag');
    tag.hidden = !locked;
    if (locked) tag.textContent = `locked in · ${fmtLeft(st.lockUntil - Date.now())} left`;

    const box = $('tallyBox');
    box.textContent = '';
    const n = st.counts[site] || 0;

    if (n) box.append(tally(n, 25));
    const today = st.daily[dayKey()] || 0;
    $('today').textContent = today ? `${today} slip${today === 1 ? '' : 's'} today` : '';

}
function goBack() {
  if (history.length > 1) history.back();
  else chrome.tabs.update({ url: 'chrome://newtab' });
}

function originalUrl() {
  const i = location.search.indexOf('&u=');
  const raw = i === -1 ? '' : location.search.slice(i + 3) + location.hash;
  return /^https?:\/\//i.test(raw) ? raw : '';
}

function openSite() {
  const url = originalUrl();
  if (url) location.href = url;
  else if (site) location.href = `https://${site}`;
}

$('backBtn').addEventListener('click', goBack);

$('openBtn').addEventListener('click', openSite);

$('pauseBtn').addEventListener('click', () => {
  let left = 10;
  const wait = $('wait');
  const cancel = document.createElement('button');
  cancel.textContent = 'nevermind';
  $('pauseBtn').hidden = true;
  wait.hidden = false;
  wait.after(cancel);

  const text = () => (wait.textContent = `is it really worth it? ${left}s`);
  text();

  const stop = () => {
    clearInterval(waiting);
    waiting = null;
    cancel.remove();
    wait.hidden = true;
    render();
  };
  cancel.addEventListener('click', stop);

  waiting = setInterval(async () => {
    left--;
    if (left > 0) return text();
    clearInterval(waiting);
    waiting = null;
    cancel.remove();
    const res = await send('pause', { minutes: 5 });
    if (res?.ok) openSite();
    else stop();
  }, 1000);
});

chrome.storage.onChanged.addListener((_c, area) => {
    if (area === 'local' && !waiting) refresh();
});

(async () => {
    await refresh();
    if (site && !auto && isActive(st)) send('hit', { site });
    setInterval(() => st && !waiting && isLocked(st) && render(), 15000);
})();