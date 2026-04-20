#!/usr/bin/env node
/* Convenience wrapper: runs abyss-desktop/scripts/export-content.mjs and
   copies abyss-desktop/scripts/fetch-art.mjs into assets/. Use this from
   abyss-ue/ rather than cd-ing into abyss-desktop. */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UE_ROOT = path.resolve(HERE, '..');
const DESK_ROOT = path.resolve(UE_ROOT, '..', 'abyss-desktop');

if (!fs.existsSync(DESK_ROOT)) {
  console.error(`abyss-desktop/ not found at ${DESK_ROOT}. This stub assumes both projects live side-by-side.`);
  process.exit(1);
}

console.log(`[export-data-stub] running abyss-desktop export → ${UE_ROOT}/ThirdParty/data/`);
const r = spawnSync('npx', ['tsx', 'scripts/export-content.mjs'], {
  cwd: DESK_ROOT,
  stdio: 'inherit',
});
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('\n[export-data-stub] ok.');
