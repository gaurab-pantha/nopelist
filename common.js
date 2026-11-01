export const DEFAULTS = {
    enabled: true,
    blocklist: [],
    pausedUntil: 0,
    counts: {},
    daily: {},
    message: '',
    theme: 'light',
    schedule: { on: false, days: [1, 2, 3, 4, 5], from: '09:00', to: '17:00' },
    lockUntil: 0,
    lockList: []
};

export const LINES = [
    'nope.',
    'not today.',
    'go touch grass.',
    'bro. no.',
    'close the tab. i believe in you.',
    'really? again?',
    'you have things to do.',
    'future you is watching.'
];

export const ME = {
    name: 'Gaurab Pantha',
    site: 'https://gaurabdev.com',
    github: 'https://github.com/gaurab-pantha',
    club: 'https://shantisirc.com',
    tagline: 'Designed with curiosity. Built through learning.'
};

export async function load() {
  const d = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...d, schedule: { ...DEFAULTS.schedule, ...(d.schedule || {}) } };
}

export const send = (type, extra = {}) => chrome.runtime.sendMessage({ type, ...extra });

export function normalizeEntry(raw) {
  let s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^\*\./, '');
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = 'http://' + s;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;

  const host = u.hostname.replace(/^www\./, '').replace(/\.$/, '');
  const okHost =
    /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(host) || 
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||                              
    host === 'localhost';
  if (!okHost) return null;

  const path = u.pathname.replace(/\/+$/, '').replace(/[*^|]/g, '');
  return path ? host + path : host;
}


export function parseMany(text) {
  const valid = [];
  const invalid = [];
  for (const part of String(text || '').split(/[\s,;]+/).filter(Boolean)) {
    const e = normalizeEntry(part);
    if (!e) invalid.push(part);
    else if (!valid.includes(e)) valid.push(e);
  }
  return { valid, invalid };
}

export function splitEntry(entry) {
  const i = entry.indexOf('/');
  return i === -1 ? { host: entry, path: '' } : { host: entry.slice(0, i), path: entry.slice(i) };
}

export function matchesEntry(urlStr, entry) {
  let u;
  try { u = new URL(urlStr); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const { host: eh, path: ep } = splitEntry(entry);
  if (!(host === eh || host.endsWith('.' + eh))) return false;
  if (!ep) return true;
  const p = u.pathname.toLowerCase().replace(/\/+$/, '');
  return p === ep || p.startsWith(ep + '/');
}


const toMin = hhmm => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function inSchedule(sch, d = new Date()) {
  if (!sch.on) return true;
  const day = d.getDay();
  const now = d.getHours() * 60 + d.getMinutes();
  const from = toMin(sch.from);
  const to = toMin(sch.to);
  if (from === to) return sch.days.includes(day);            
  if (from < to) return sch.days.includes(day) && now >= from && now < to;

  return (sch.days.includes(day) && now >= from) || (sch.days.includes((day + 6) % 7) && now < to);
}

export const isLocked = (st, now = Date.now()) => now < st.lockUntil;

export function isActive(st, now = Date.now()) {
  if (isLocked(st, now)) return true;              
  if (!st.enabled || now < st.pausedUntil) return false;
  return inSchedule(st.schedule, new Date(now));
}


export function dayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function lastDays(daily, n = 7) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ key: dayKey(d), date: d, n: daily[dayKey(d)] || 0 });
  }
  return out;
}

export function fmtClock(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtLeft(ms) {
  const m = Math.ceil(ms / 60000);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  if (m > 1) return `${m}m`;
  return fmtClock(ms);
}

export function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem('sb-theme', dark ? 'dark' : 'light'); } catch { /* fine */ }
}

export async function toggleTheme() {
    const { theme } = await load();
    const next = theme === 'dark' ? 'light' : 'dark';
    await chrome.storage.local.set({ theme: next });
    applyTheme(next);
}
