#!/usr/bin/env node
/* Upload UE-packaged release/ artifacts via steamcmd.
   Expects env vars STEAM_APP_ID, STEAM_DEPOT_*, STEAM_USERNAME. */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STEAM_DIR = path.join(ROOT, 'steam');
const BUILD_DIR = path.join(STEAM_DIR, 'build');

function arg(name, fb) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fb;
}
function env(k, required = true) {
  const v = process.env[k];
  if (!v && required) { console.error(`Missing env: ${k}`); process.exit(1); }
  return v || '';
}
function sub(src, dest, vars) {
  let t = fs.readFileSync(src, 'utf8');
  for (const [k, v] of Object.entries(vars)) t = t.replaceAll(`$${k}$`, v);
  fs.writeFileSync(dest, t, 'utf8');
}

function main() {
  const branch = arg('branch', 'prerelease');
  const dry = process.argv.includes('--dry-run');
  // Read version from DefaultGame.ini if possible, otherwise Abyss.uproject.
  let version = '0.1.0';
  try {
    const uproj = JSON.parse(fs.readFileSync(path.join(ROOT, 'Abyss.uproject'), 'utf8'));
    version = uproj.EngineAssociation === '5.4' ? (uproj.Description?.match(/\d+\.\d+\.\d+/)?.[0] ?? version) : version;
  } catch {}

  const vars = {
    APPID: env('STEAM_APP_ID'),
    DEPOT_WIN: env('STEAM_DEPOT_WIN'),
    DEPOT_MAC: env('STEAM_DEPOT_MAC'),
    DEPOT_LINUX: env('STEAM_DEPOT_LINUX'),
    BRANCH: branch, VERSION: version,
  };
  const username = env('STEAM_USERNAME');

  fs.mkdirSync(BUILD_DIR, { recursive: true });
  for (const name of ['app_build.vdf', 'depot_build_win.vdf', 'depot_build_mac.vdf', 'depot_build_linux.vdf']) {
    sub(path.join(STEAM_DIR, name), path.join(BUILD_DIR, name), vars);
  }

  const checks = [
    ['release/Windows', vars.DEPOT_WIN],
    ['release/Mac',     vars.DEPOT_MAC],
    ['release/Linux',   vars.DEPOT_LINUX],
  ];
  const present = checks.filter(([d]) => fs.existsSync(path.join(ROOT, d)));
  if (!present.length) {
    console.error('No release/* directories. Package the UE project first:');
    console.error('  UnrealEditor-Cmd Abyss.uproject -run=Cook -targetplatform=Mac,Win64,Linux');
    process.exit(1);
  }
  console.log(`Uploading → branch=${branch} version=${version}`);
  for (const [d, dp] of present) console.log(`  ✓ ${d} → depot ${dp}`);
  const cmd = `steamcmd +login "${username}" +run_app_build "${path.join(BUILD_DIR, 'app_build.vdf')}" +quit`;
  if (dry) { console.log('\n[dry-run]', cmd); return; }
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
  console.log('\n✓ Upload complete.');
}

try { main(); } catch (err) { console.error(err.message); process.exit(1); }
