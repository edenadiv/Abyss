/* Meta stats — persisted in sessionStorage; wipe on tab close. */

export const META_KEY = 'abyss_meta';
export const RUN_KEY  = 'abyss_state';

export const META_DEFAULTS = {
  deaths: 0,
  totalRuns: 0,
  handsPlayedEver: 0,
  breathsSurrendered: 0,
  maxBreathEver: 0,
  fragmentsEverFound: [],      // fragment ids ever collected
  endingsReached: [],          // ending kinds ever seen
  hasSeenRevelation: false,
  hasSeenMirror: false,
  hasSeenGhost: false,
  creditsSeen: false,
  lastDeathAt: null,           // timestamp
};

export function loadMeta() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(META_KEY) || '{}');
    return { ...META_DEFAULTS, ...raw };
  } catch { return { ...META_DEFAULTS }; }
}

export function saveMeta(m) {
  try { sessionStorage.setItem(META_KEY, JSON.stringify(m)); } catch {}
}

export function updateMeta(patch) {
  const m = loadMeta();
  const next = { ...m, ...patch };
  saveMeta(next);
  return next;
}
