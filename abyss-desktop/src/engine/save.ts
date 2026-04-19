/* Save bridge — routes through window.abyss in Electron, localStorage
   in web dev. Synchronous readers read from a hydrated in-memory cache. */

import type { AppSettings, RunSave, SaveSummary } from '../types.js';
import { SETTINGS_DEFAULTS } from '../types.js';

const ELECTRON = typeof window !== 'undefined' && !!window.abyss;
const LS_PREFIX = 'abyss-desktop:';

let activeSlot = 1;
const cache: { save: RunSave | null; settings: AppSettings } = {
  save: null,
  settings: { ...SETTINGS_DEFAULTS },
};

function lsGet<T>(k: string, fb: T): T {
  try { const v = localStorage.getItem(LS_PREFIX + k); return v ? JSON.parse(v) : fb; }
  catch { return fb; }
}
function lsSet(k: string, v: any) { try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); } catch {} }
function lsDel(k: string) { try { localStorage.removeItem(LS_PREFIX + k); } catch {} }

export const save = {
  get activeSlot() { return activeSlot; },
  get snapshot() { return cache; },
  setSlot(slot: number) { activeSlot = Math.max(1, Math.min(3, slot | 0)); cache.settings.activeSlot = activeSlot; },

  async bootstrap(): Promise<{ activeSlot: number; settings: AppSettings }> {
    let loaded: Partial<AppSettings> | null = null;
    if (ELECTRON) {
      try { loaded = await window.abyss!.settings.load(); }
      catch (err) { console.warn('[save] settings load failed', err); }
    } else {
      loaded = lsGet<Partial<AppSettings> | null>('settings', null);
    }
    cache.settings = { ...SETTINGS_DEFAULTS, ...(loaded || {}) };
    activeSlot = cache.settings.activeSlot || 1;
    return { activeSlot, settings: cache.settings };
  },

  async listSlots(): Promise<SaveSummary[]> {
    if (ELECTRON) {
      try { return await window.abyss!.saves.list(); }
      catch { /* fall through */ }
    }
    return [1, 2, 3].map(slot => {
      const d = lsGet<any>(`slot-${slot}`, null);
      if (!d) return { slot, exists: false };
      return {
        slot, exists: true,
        updatedAt: d.updatedAt ?? null,
        breath: d.breath ?? null,
        scene: d.scene ?? null,
        room: d.worldRoom ?? null,
        totalRuns: d.meta?.totalRuns ?? 0,
        endingsReached: d.meta?.endingsReached ?? [],
        playerName: d.meta?.playerName ?? null,
      };
    });
  },

  async hydrate(): Promise<RunSave | null> {
    if (ELECTRON) {
      try { cache.save = await window.abyss!.saves.load(activeSlot); }
      catch { cache.save = null; }
    } else {
      cache.save = lsGet<RunSave | null>(`slot-${activeSlot}`, null);
    }
    return cache.save;
  },

  readSave(): RunSave | null { return cache.save; },
  readSettings(): AppSettings { return cache.settings; },

  writeSave(data: RunSave) {
    cache.save = data;
    if (ELECTRON) window.abyss!.saves.save(activeSlot, data).catch(err => console.warn('[save] write', err));
    else lsSet(`slot-${activeSlot}`, { ...data, updatedAt: Date.now() });
  },

  writeSettings(data: AppSettings) {
    cache.settings = { ...cache.settings, ...data };
    if (ELECTRON) window.abyss!.settings.save(cache.settings).catch(err => console.warn('[save] settings', err));
    else lsSet('settings', cache.settings);
  },

  async deleteSlot(slot: number) {
    const n = Math.max(1, Math.min(3, slot | 0));
    if (ELECTRON) { try { await window.abyss!.saves.delete(n); } catch {} }
    else lsDel(`slot-${n}`);
    if (n === activeSlot) cache.save = null;
  },
};
