// Steamworks.js bridge — lazy-loaded so the game still runs without
// Steam installed or without the native binaries bundled.

let client: any = null;
let initialized = false;
let appIdCached: number | null = null;
const granted = new Set<string>();

const DEFAULT_APP_ID = 480; // Spacewar — Steam's public test app

function readAppIdFromEnv(): number | null {
  const raw = process.env.STEAM_APP_ID || process.env.ABYSS_STEAM_APP_ID;
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readAppIdFromDisk(): number | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path');
    const candidates = [
      path.join((process as any).resourcesPath || '', 'steam_appid.txt'),
      path.join(process.cwd(), 'steam_appid.txt'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const n = parseInt(fs.readFileSync(p, 'utf8').trim(), 10);
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
  } catch {}
  return null;
}

async function loadSteamModule() {
  try {
    const mod = await import('steamworks.js');
    return (mod as any).default || mod;
  } catch {
    return null;
  }
}

export const steam = {
  async init() {
    if (initialized) return;
    initialized = true;
    appIdCached = readAppIdFromEnv() || readAppIdFromDisk() || DEFAULT_APP_ID;
    const steamworks = await loadSteamModule();
    if (!steamworks) {
      console.log('[steam] steamworks.js unavailable — running without Steam.');
      return;
    }
    try {
      client = steamworks.init(appIdCached);
      console.log(`[steam] initialized appId=${appIdCached}`);
    } catch (err: any) {
      console.log('[steam] init failed (is Steam running?):', err?.message || err);
      client = null;
    }
  },
  shutdown() {
    try { if (client?.shutdown) client.shutdown(); } catch {}
    client = null;
  },
  isRunning(): boolean { return !!client; },
  appId(): number { return appIdCached ?? DEFAULT_APP_ID; },
  activateAchievement(id: string): boolean {
    if (!id || granted.has(id)) return true;
    granted.add(id);
    if (!client) return false;
    try { client.achievement.activate(id); return true; }
    catch (err: any) { console.log('[steam] activate failed', id, err?.message); return false; }
  },
  setRichPresence(k: string, v: string): boolean {
    if (!client) return false;
    try { client.localplayer.setRichPresence(String(k), String(v)); return true; }
    catch { return false; }
  },
  clearRichPresence(): boolean {
    if (!client) return false;
    try { client.localplayer.clearRichPresence(); return true; }
    catch { return false; }
  },
};
