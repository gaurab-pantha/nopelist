import {
  load, isActive, isLocked, inSchedule, matchesEntry, splitEntry, normalizeEntry, dayKey, DEFAULTS
} from './common.js';

let chain = Promise.resolve();
const enqueue = fn => {
  const run = chain.then(() => fn());
  chain = run.catch(() => {});
  return run;
};

const blockedPath = (entry, auto = false) =>
  `/blocked.html?site=${encodeURIComponent(entry)}${auto ? '&auto=1' : ''}`;

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function conditionFor(entry) {
  const { host, path } = splitEntry(entry);
  return {
    regexFilter: `^https?://([^/]*\\.)?${escapeRegex(host)}(:[0-9]+)?${escapeRegex(path)}([/?#].*)?$`,
    isUrlFilterCaseSensitive: false,
    resourceTypes: ['main_frame']
  };
}

const redirectTo = entry => ({
  regexSubstitution: `${chrome.runtime.getURL('blocked.html')}?site=${encodeURIComponent(entry)}&u=\\0`
});

async function enforceLock() {
  const st = await load();
  if (!st.lockUntil) return;
  if (!isLocked(st)) {
    await chrome.storage.local.set({ lockUntil: 0, lockList: [] });
    return;
  }
  const patch = {};
  if (!st.enabled) patch.enabled = true;
  if (st.pausedUntil > Date.now()) patch.pausedUntil = 0;
  const missing = st.lockList.filter(e => !st.blocklist.includes(e));
  if (missing.length) patch.blocklist = [...st.blocklist, ...missing];
  const union = [...new Set([...st.lockList, ...st.blocklist, ...missing])];
  if (union.length !== st.lockList.length) patch.lockList = union;
  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
}

async function syncRules() {
  await enforceLock();
  const st = await load();
  const on = isActive(st);
  const old = await chrome.declarativeNetRequest.getDynamicRules();

  const rules = on
    ? st.blocklist.map((entry, i) => ({
        id: i + 1,
        priority: 1,
        action: { type: 'redirect', redirect: redirectTo(entry) },
        condition: conditionFor(entry)
      }))
    : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map(r => r.id),
    addRules: rules
  });
  await chrome.storage.session.set({ applied: on });

  if (on) await redirectOpenTabs(st.blocklist);
}

async function redirectOpenTabs(blocklist) {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  } catch { return; }
  for (const t of tabs) {
    const hit = blocklist.find(e => matchesEntry(t.url, e));
    if (!hit) continue;
    try {
      await chrome.tabs.update(t.id, { url: chrome.runtime.getURL(blockedPath(hit, true)) + `&u=${t.url}` });
    } catch { /* tab closed in the meantime */ }
  }
}

async function updateBadge() {
  const st = await load();
  let text = '';
  let color = '#6b7280';
  if (isLocked(st)) { text = 'lock'; color = '#ff4f81'; }
  else if (!st.enabled) text = 'off';
  else if (Date.now() < st.pausedUntil) { text = 'zz'; color = '#f59f00'; }
  else if (!inSchedule(st.schedule)) text = 'zz';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
  if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({ color: '#ffffff' });
}

async function ensureAlarms() {
  const st = await load();
  if (st.schedule.on) await chrome.alarms.create('sched', { periodInMinutes: 1 });
  else await chrome.alarms.clear('sched');
  if (st.pausedUntil > Date.now()) await chrome.alarms.create('resume', { when: st.pausedUntil });
  if (st.lockUntil > Date.now()) await chrome.alarms.create('lockEnd', { when: st.lockUntil });
}

const refreshAll = async () => {
  await syncRules();
  await updateBadge();
  await ensureAlarms();
};

function pruneDaily(daily) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const min = dayKey(cutoff);
  for (const k of Object.keys(daily)) if (k < min) delete daily[k];
  return daily;
}

async function handle(msg) {
  switch (msg?.type) {
    case 'hit': {
      const st = await load();
      const site = String(msg.site || '').slice(0, 200);
      if (!site) return { ok: false };
      const daily = pruneDaily({ ...st.daily });
      daily[dayKey()] = (daily[dayKey()] || 0) + 1;
      await chrome.storage.local.set({
        counts: { ...st.counts, [site]: (st.counts[site] || 0) + 1 },
        daily
      });
      return { ok: true };
    }
    
    case 'pause': {
      const st = await load();
      if (isLocked(st)) return { ok: false, error: 'locked' };
      const mins = Math.min(240, Math.max(1, Number(msg.minutes) || 5));
      const until = Date.now() + mins * 60000;
      await chrome.storage.local.set({ pausedUntil: until });
      await chrome.alarms.create('resume', { when: until });
      await refreshAll(); 
      return { ok: true, until };
    }
    case 'resume': {
      await chrome.storage.local.set({ pausedUntil: 0 });
      await chrome.alarms.clear('resume');
      await refreshAll();
      return { ok: true };
    }
    case 'lock': {
      const st = await load();
      if (!st.blocklist.length) return { ok: false, error: 'empty' };
      const mins = Math.min(480, Math.max(5, Number(msg.minutes) || 60));
      const until = Math.max(st.lockUntil, Date.now() + mins * 60000);
      await chrome.storage.local.set({
        lockUntil: until,
        lockList: [...new Set([...st.lockList, ...st.blocklist])],
        enabled: true,
        pausedUntil: 0
      });
      await chrome.alarms.create('lockEnd', { when: until });
      await refreshAll();
      return { ok: true, until };
    }
    default:
      return { ok: false, error: 'unknown message' };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  enqueue(() => handle(msg))
    .then(respond)
    .catch(e => respond({ ok: false, error: String(e) }));
  return true;
});

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId !== 'block-site') return;
  enqueue(async () => {
    try {
      const host = normalizeEntry(new URL(info.linkUrl || info.pageUrl).hostname);
      if (!host) return;
      const st = await load();
      if (!st.blocklist.includes(host)) await chrome.storage.local.set({ blocklist: [...st.blocklist, host] });
    } catch { /* weird url, ignore */ }
  });
});

chrome.commands.onCommand.addListener(cmd => {
  if (cmd !== 'toggle-blocking') return;
  enqueue(async () => {
    const st = await load();
    if (isLocked(st)) return;
    await chrome.storage.local.set({ enabled: !st.enabled, pausedUntil: 0 });
  });
});


chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.enabled || changes.blocklist || changes.pausedUntil || changes.schedule || changes.lockUntil || changes.lockList) {
    enqueue(refreshAll);
  }
});

chrome.alarms.onAlarm.addListener(alarm => {
  enqueue(async () => {
    if (alarm.name === 'sched') {
      const st = await load();
      const { applied } = await chrome.storage.session.get('applied');
      if (isActive(st) !== applied) await refreshAll();
      return;
    }
    if (alarm.name === 'resume' || alarm.name === 'lockEnd') await refreshAll();
  });
});

chrome.runtime.onInstalled.addListener(details => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'block-site',
      title: 'Block this site',
      contexts: ['page', 'link']
    });
  });

  enqueue(async () => {
    if (details.reason === 'install') await chrome.storage.local.set(DEFAULTS);
    await refreshAll();
  });
});


chrome.runtime.onStartup.addListener(() => enqueue(refreshAll));
