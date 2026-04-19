/* The Ledger — every choice made, kept in ink, wiped on tab close. */

export const LEDGER_KEY = 'abyss_ledger';
export const LEDGER_MAX = 600;

export function loadLedger() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(LEDGER_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function saveLedger(entries) {
  try {
    const trimmed = entries.length > LEDGER_MAX
      ? entries.slice(entries.length - LEDGER_MAX)
      : entries;
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function appendLedger(entry) {
  const all = loadLedger();
  const next = [...all, { ts: Date.now(), ...entry }];
  saveLedger(next);
  return next;
}
