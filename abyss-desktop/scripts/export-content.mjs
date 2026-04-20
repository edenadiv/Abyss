#!/usr/bin/env node
/* Export abyss-desktop/src/content/*.ts as JSON into abyss-ue/ThirdParty/data/.
   The UE runtime's UAbyssContent subsystem parses these files at startup —
   fragments.json / trinkets.json / tables.json / endings.json. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UE_DATA = path.resolve(ROOT, '..', 'abyss-ue', 'ThirdParty', 'data');

async function importContent() {
  // Dynamic import so this script stays a zero-deps node .mjs. Vite's path
  // aliasing doesn't apply here — use relative imports.
  const { FRAGMENTS } = await import(path.join(ROOT, 'src/content/fragments.ts'));
  const { TRINKETS } = await import(path.join(ROOT, 'src/content/trinkets.ts'));
  const { TABLES }   = await import(path.join(ROOT, 'src/content/tables.ts'));
  const { ENDING_CARDS } = await import(path.join(ROOT, 'src/content/endings.ts'));
  const { SIREN_LINES } = await import(path.join(ROOT, 'src/content/siren-lines.ts'));
  const { TAROT_CARDS } = await import(path.join(ROOT, 'src/content/tarot.ts'));
  return { FRAGMENTS, TRINKETS, TABLES, ENDING_CARDS, SIREN_LINES, TAROT_CARDS };
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function write(name, data) {
  const p = path.join(UE_DATA, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  ✓ ${name}  (${data.length ?? Object.keys(data).length} entries)`);
}

async function run() {
  // We can't directly `import` .ts files from pure Node, so the cleanest
  // portable path is to use `tsx`. Require it only at runtime so this
  // script stays runnable as-is when tsx is available.
  try {
    // eslint-disable-next-line import/no-unresolved
    await import('tsx/esm/api');
  } catch (err) {
    console.error(`tsx required. Install with:\n  npm i -D tsx\nThen run again.`);
    process.exit(1);
  }
  const { FRAGMENTS, TRINKETS, TABLES, ENDING_CARDS, SIREN_LINES, TAROT_CARDS } = await importContent();

  ensureDir(UE_DATA);
  console.log(`[export-content] → ${UE_DATA}`);

  write('fragments.json', FRAGMENTS);
  write('trinkets.json',  TRINKETS);
  write('tables.json',    TABLES.map(t => ({
    key: t.key, name: t.name, icon: t.icon, desc: t.desc, minBet: t.minBet, accent: t.accent,
  })));
  write('endings.json',   ENDING_CARDS);
  write('siren-lines.json', SIREN_LINES);
  write('tarot.json',     TAROT_CARDS.map(c => ({
    ...c,
    min: c.min === Infinity ? Number.MAX_SAFE_INTEGER : c.min === -Infinity ? Number.MIN_SAFE_INTEGER : c.min,
    max: c.max === Infinity ? Number.MAX_SAFE_INTEGER : c.max === -Infinity ? Number.MIN_SAFE_INTEGER : c.max,
  })));

  console.log('\n[export-content] done.');
}

run().catch(err => { console.error(err); process.exit(1); });
