import { load, parseMany, isLocked, lastDays, fmtLeft, applyTheme, toggleTheme } from './common.js';
import { tile, logoSvg } from './ui.js';

const $ = id => document.getElementById(id);
const DAYS = [[1, 'mon'], [2, 'tue'], [3, 'wed'], [4, 'thu'], [5, 'fri'], [6, 'sat'], [0, 'sun']];

let st = null;
let savedTimer = null;

$('logo').innerHTML = logoSvg();

function flashSaved() {

  $('saved').textContent = 'saved';
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => ($('saved').textContent = ''), 1200);
}

const saveSchedule = patch =>
  chrome.storage.local.set({ schedule: { ...st.schedule, ...patch } }).then(flashSaved);

async function refresh() {
  st = await load();
  applyTheme(st.theme);
  const locked = isLocked(st);


  $('lockNote').hidden = !locked;
  if (locked) $('lockNote').textContent = `you're locked in (${fmtLeft(st.lockUntil - Date.now())} left). some things can't change until it ends.`;

  if (document.activeElement !== $('message')) $('message').value = st.message;

  $('schedOn').checked = st.schedule.on;

  $('schedOn').disabled = locked;
  $('schedBox').classList.toggle('off', !st.schedule.on || locked);
  if (document.activeElement !== $('from')) $('from').value = st.schedule.from;
  if (document.activeElement !== $('to')) $('to').value = st.schedule.to;
  const days = $('days');

  days.textContent = '';
  for (const [num, label] of DAYS) {
    const b = document.createElement('button');
    b.className = 'chip' + (st.schedule.days.includes(num) ? ' on' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      const set = new Set(st.schedule.days);

      set.has(num) ? set.delete(num) : set.add(num);
      saveSchedule({ days: [...set] });
    });
    days.append(b);
  }

  const week = lastDays(st.daily, 7);
  const max = Math.max(5, ...week.map(d => d.n));
  const total = week.reduce((a, d) => a + d.n, 0);
  $('weekInfo').textContent = total
    ? `blocked sites stopped you ${total} time${total === 1 ? '' : 's'} this week.`
    : 'no slips yet. nice.';
  const chart = $('week');
  chart.textContent = '';

  for (const d of week) {
    const col = document.createElement('div');
    col.className = 'wcol' + (d.n ? ' has' : '') + (d.key === week[6].key ? ' today' : '');
    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = d.n || '';

    const bar = document.createElement('div');
    bar.className = 'wbar';
    bar.style.height = `${Math.max(3, (d.n / max) * 78)}px`;
    const lab = document.createElement('div');
    lab.className = 'lab';
    lab.textContent = d.date.toLocaleDateString('en', { weekday: 'short' }).toLowerCase();
    col.append(num, bar, lab);
    chart.append(col);
  }

  const top = $('top');
  top.textContent = '';
  const ranked = Object.entries(st.counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [entry, n] of ranked) {
    const row = document.createElement('div');
    row.className = 'toprow';
    const nm = document.createElement('span');

    nm.className = 'nm';
    nm.textContent = entry;
    const ct = document.createElement('span');
    ct.className = 'ct';
    ct.textContent = `${n}x`;
    row.append(tile(entry), nm, ct);
    top.append(row);
  }

  const n = st.blocklist.length;
  const all = Object.values(st.counts).reduce((a, b) => a + b, 0);
  $('listInfo').textContent = n
    ? `${n} blocked site${n === 1 ? '' : 's'}. all time, it has stopped you ${all} time${all === 1 ? '' : 's'}.`
    : 'nothing blocked yet.';

  $('exportBtn').disabled = !n;
  $('clearList').disabled = !n || locked;
}

$('bulkBtn').addEventListener('click', async () => {
  const { valid, invalid } = parseMany($('bulk').value);
  if (!valid.length) {
    $('bulkMsg').textContent = invalid.length ? 'none of those looked like links.' : 'paste something first.';
    return;
  }
  const fresh = valid.filter(e => !st.blocklist.includes(e));
  await chrome.storage.local.set({ blocklist: [...st.blocklist, ...fresh] });
  $('bulk').value = '';
  $('bulkMsg').textContent =
    `added ${fresh.length}` +
    (valid.length - fresh.length ? `, ${valid.length - fresh.length} were already there` : '') +
    (invalid.length ? `, skipped ${invalid.length} that didn't look like links` : '') + '.';
  flashSaved();
});

$('themeBtn').addEventListener('click', toggleTheme);
$('schedOn').addEventListener('change', e => saveSchedule({ on: e.target.checked }));
$('from').addEventListener('change', e => e.target.value && saveSchedule({ from: e.target.value }));
$('to').addEventListener('change', e => e.target.value && saveSchedule({ to: e.target.value }));

$('message').addEventListener('change', async e => {
  await chrome.storage.local.set({ message: e.target.value.trim() });
  flashSaved();
});

$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([st.blocklist.join('\n') + '\n'], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nopelist-list.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('resetCounts').addEventListener('click', async () => {
  if (!confirm('reset all the counters and the weekly chart?')) return;
  await chrome.storage.local.set({ counts: {}, daily: {} });
  flashSaved();
});

$('clearList').addEventListener('click',async () => {
  if (isLocked(st)) return;
  if (!confirm('remove every site from the list?')) return;
  await chrome.storage.local.set({ blocklist: [], counts: {} });
  flashSaved();
});

chrome.storage.onChanged.addListener((_c, area) => { if (area === 'local') refresh(); });
setInterval(() => st && refresh(), 30000);
refresh();
