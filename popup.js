import {
  load, send, parseMany, normalizeEntry, matchesEntry, splitEntry,
  isLocked, inSchedule, dayKey, fmtClock, fmtLeft, applyTheme, toggleTheme
} from './common.js';
import { tile, tally, logoSvg } from './ui.js';

const $ = id => document.getElementById(id);
const QUICK = ['facebook.com', 'instagram.com', 'youtube.com', 'tiktok.com', 'x.com', 'reddit.com', 'netflix.com'];

let st = null;
let tab = null;      
let pendingLock = 0;   

$('logo').innerHTML = logoSvg();

async function refresh() {
  st = await load();
  applyTheme(st.theme);
  render();
}

const save = list => chrome.storage.local.set({ blocklist: list });

function heroState() {

  const now = Date.now();
  const today = st.daily[dayKey()] || 0;
  if (isLocked(st, now)) return { cls: 'lock', word: 'locked', sub: `${fmtLeft(st.lockUntil - now)} left` };
  if (!st.enabled) return { cls: 'off', word: 'off', sub: 'nothing is blocked' };
  if (now < st.pausedUntil) return { cls: 'pause', word: 'paused', sub: `${fmtClock(st.pausedUntil - now)} left` };
  if (!inSchedule(st.schedule)) return { cls: 'rest', word: 'resting', sub: 'outside your schedule' };
  return { cls: 'on', word: 'on', sub: today ? `stopped you ${today}x today` : 'ready to block' };
}

function renderHero() {
  const h = heroState();
  const locked = isLocked(st);
  const power = $('power');
  power.className = `hero ${h.cls}${h.word.length > 3 ? ' long' : ''}`;
  power.disabled = locked;
  $('state').textContent = h.word;
  $('heroCount').textContent = `${st.blocklist.length} site${st.blocklist.length === 1 ? '' : 's'}`;
  $('heroSub').textContent = h.sub;

}

function render() {
  const locked = isLocked(st);

  renderHero();


  $('count').textContent = st.blocklist.length ? String(st.blocklist.length) : '';
  const list = $('list');
  list.textContent = '';
  for (const entry of [...st.blocklist].reverse()) {
    const li = document.createElement('li');
    li.append(tile(entry));


    const { host, path } = splitEntry(entry);
    const name = document.createElement('span');
    name.className = 'name';
    name.title = entry;
    name.append(host);

    if (path) {
      const em = document.createElement('em');

      em.textContent = path;
      name.append(em);
    }
    li.append(name);

    const n = st.counts[entry] || 0;
    if (n) li.append(tally(n));


    const x = document.createElement('button');
    x.className = 'x';
    x.textContent = '×';

    x.title = locked ? 'locked in' : `unblock ${entry}`;

    x.disabled = locked;
    x.addEventListener('click', () => save(st.blocklist.filter(e => e !== entry)));
    li.append(x);
    list.append(li);
  }

  $('empty').hidden = st.blocklist.length > 0;
  const chips = $('chips');
  chips.textContent = '';

  for (const site of QUICK) {
    const b = document.createElement('button');

    b.className = 'chip';
    b.textContent = site.replace('.com', '');
    b.addEventListener('click', () => save([...st.blocklist, site]));
    chips.append(b);
  }

  renderQuick();
  renderTools();
}

function renderQuick() {
  const box = $('quick');
  if (!tab) { box.hidden = true; return; }
  box.hidden = false;

  const covered = st.blocklist.some(e => matchesEntry(tab.url, e));
  const siteBtn = $('blockSite');
  siteBtn.disabled = covered;
  siteBtn.textContent = covered ? `${tab.host} is blocked` : `block ${tab.host}`;
  $('blockPage').hidden = covered || !tab.page;
}

function renderTools() {

  const locked = isLocked(st);
  const paused = Date.now() < st.pausedUntil;

  $('pauseRow').hidden = locked || !st.enabled;
  $('pauseBtns').hidden = paused;

  $('resumeBtn').hidden = !paused;

  $('lockRow').hidden = locked || !st.blocklist.length;
  $('lockSure').hidden = !pendingLock || locked;

  if (pendingLock) $('lockLen').textContent = pendingLock >= 60 ? `${pendingLock / 60}h` : `${pendingLock}m`;
  for (const b of document.querySelectorAll('#lockBtns button')) b.classList.toggle('on', Number(b.dataset.min) === pendingLock);
}


const showErr = text => {
  $('err').hidden = !text;
  $('err').textContent = text || '';

};

async function addFromInput() {
  showErr('');
  $('hint').hidden = true;

  const { valid, invalid } = parseMany($('url').value);
  if (!valid.length) {
    showErr("that doesn't look like a link. try youtube.com");
    return;

  }
  const fresh = valid.filter(e => !st.blocklist.includes(e));

  if (fresh.length) await save([...st.blocklist, ...fresh]);
  $('url').value = '';
  if (invalid.length) showErr(`skipped ${invalid.length} that didn't look like a link`);

  const withPath = valid.length === 1 && valid[0].includes('/') ? valid[0] : null;
  if (withPath) {
    const { host, path } = splitEntry(withPath);

    $('hintText').textContent = `only blocking ${path} on ${host}.`;
    $('hintBtn').textContent = 'block the whole site';
    $('hintBtn').onclick = async () => {

      const { blocklist } = await load();
      const next = blocklist.filter(e => e !== withPath);
      if (!next.includes(host)) next.push(host);

      await save(next);
      $('hint').hidden = true;
    };

    $('hint').hidden = false;
  }
}

$('addBtn').addEventListener('click', addFromInput);
$('url').addEventListener('keydown', e => { if (e.key === 'Enter') addFromInput(); });
$('blockSite').addEventListener('click', () => save([...st.blocklist, tab.host]));
$('blockPage').addEventListener('click', () => save([...st.blocklist, tab.page]));


$('power').addEventListener('click', async () => {
  if (isLocked(st)) return;
  if (Date.now() < st.pausedUntil) { await send('resume'); return; }
  await chrome.storage.local.set({ enabled: !st.enabled, pausedUntil: 0 });
});

for (const b of document.querySelectorAll('#pauseBtns button')) {
  b.addEventListener('click', () => send('pause', { minutes: Number(b.dataset.min) }));
}
$('resumeBtn').addEventListener('click', () => send('resume'));


for (const b of document.querySelectorAll('#lockBtns button')) {

  b.addEventListener('click', () => {
    pendingLock = Number(b.dataset.min);
    renderTools();
  });
}
$('lockNo').addEventListener('click', () => {

  pendingLock = 0;
  renderTools();
});
$('lockYes').addEventListener('click', async () => {

  await send('lock', { minutes: pendingLock });
  pendingLock = 0;
  refresh();
});

$('themeBtn').addEventListener('click', toggleTheme);


$('optBtn').addEventListener('click', e => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();

  window.close();
});

chrome.storage.onChanged.addListener((_c, area) => { if (area === 'local') refresh(); });


(async () => {
  try {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (t?.url && /^https?:/.test(t.url)) {

      const u = new URL(t.url);
      const host = normalizeEntry(u.hostname);
      if (host) {
        const page = u.pathname.length > 1 ? normalizeEntry(u.hostname + u.pathname) : null;
        tab = { url: t.url, host, page: page && page !== host ? page : null };
      }
    }
  } catch { /* no tab info, the quick buttons just stay hidden */ }
  await refresh();
  setInterval(() => st && (renderHero(), renderTools()), 500);
  
})();
