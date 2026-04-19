import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { app } from 'electron';

const SAVE_SCHEMA_VERSION = 1;

export interface SaveSummary {
  slot: number;
  exists: boolean;
  updatedAt?: number | null;
  breath?: number | null;
  scene?: string | null;
  room?: string | null;
  totalRuns?: number;
  endingsReached?: string[];
  playerName?: string | null;
}

export interface Store {
  loadSave(slot: number): Promise<any>;
  writeSave(slot: number, data: any): Promise<boolean>;
  deleteSave(slot: number): Promise<boolean>;
  listSaves(): Promise<SaveSummary[]>;
  loadSettings(): Promise<any>;
  writeSettings(data: any): Promise<boolean>;
}

async function ensureDir(dir: string) { if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true }); }
async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as T; }
  catch { return fallback; }
}
async function writeJsonAtomic(file: string, data: any) {
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, file);
}
function sanitizeSlot(slot: number): number {
  const n = Number(slot);
  if (!Number.isFinite(n) || n < 1 || n > 3) throw new Error('invalid slot');
  return n;
}

export async function initStore(): Promise<Store> {
  const saveDir = path.join(app.getPath('userData'), 'saves');
  const settingsFile = path.join(app.getPath('userData'), 'settings.json');
  await ensureDir(saveDir);

  return {
    async loadSave(slot) {
      const n = sanitizeSlot(slot);
      const file = path.join(saveDir, `slot-${n}.json`);
      return readJson<any>(file, null);
    },
    async writeSave(slot, data) {
      const n = sanitizeSlot(slot);
      const file = path.join(saveDir, `slot-${n}.json`);
      await writeJsonAtomic(file, { schemaVersion: SAVE_SCHEMA_VERSION, updatedAt: Date.now(), ...data });
      return true;
    },
    async deleteSave(slot) {
      const n = sanitizeSlot(slot);
      try { await fs.unlink(path.join(saveDir, `slot-${n}.json`)); } catch {}
      return true;
    },
    async listSaves() {
      const out: SaveSummary[] = [];
      for (const n of [1, 2, 3]) {
        const data = await readJson<any>(path.join(saveDir, `slot-${n}.json`), null);
        if (data) out.push({
          slot: n, exists: true,
          updatedAt: data.updatedAt ?? null,
          breath: data.breath ?? null,
          scene: data.scene ?? null,
          room: data.worldRoom ?? null,
          totalRuns: data.meta?.totalRuns ?? 0,
          endingsReached: data.meta?.endingsReached ?? [],
          playerName: data.meta?.playerName ?? null,
        });
        else out.push({ slot: n, exists: false });
      }
      return out;
    },
    async loadSettings() { return await readJson<any>(settingsFile, null) || {}; },
    async writeSettings(data) {
      await writeJsonAtomic(settingsFile, { schemaVersion: SAVE_SCHEMA_VERSION, updatedAt: Date.now(), ...data });
      return true;
    },
  };
}
