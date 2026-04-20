#!/usr/bin/env node
/* Downloads the 22 public-domain paintings into Content/Art/.
   Identical source-list to abyss-desktop's fetcher, output path differs. */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'Content', 'Art');

const SOURCES = {
  'mermaid':          'https://upload.wikimedia.org/wikipedia/commons/7/73/A_Mermaid.jpg',
  'ulysses-sirens':   'https://upload.wikimedia.org/wikipedia/commons/4/4b/John_William_Waterhouse_-_Ulysses_and_the_Sirens_%281891%29.jpg',
  'hylas':            'https://upload.wikimedia.org/wikipedia/commons/8/83/Hylas_and_the_Nymphs_Manchester_Art_Gallery_1896.15.jpg',
  'nymphs-pan':       'https://upload.wikimedia.org/wikipedia/commons/b/b9/Nymphs_and_Satyr_Bouguereau.jpg',
  'birth-venus-b':    'https://upload.wikimedia.org/wikipedia/commons/e/e1/William-Adolphe_Bouguereau_%281825-1905%29_-_The_Birth_of_Venus_%281879%29.jpg',
  'the-wave':         'https://upload.wikimedia.org/wikipedia/commons/7/7e/William-Adolphe_Bouguereau_-_The_Wave_-_Google_Art_Project.jpg',
  'danae-k':          'https://upload.wikimedia.org/wikipedia/commons/9/93/KLIMT_-_Dan%C3%A1e_%281907-1908%29.jpg',
  'water-serpents-ii':'https://upload.wikimedia.org/wikipedia/commons/2/27/Gustav_Klimt_048.jpg',
  'beethoven-frieze': 'https://upload.wikimedia.org/wikipedia/commons/0/07/Gustav_Klimt_-_Beethovenfries%2C_Detail_%28Gorgonen%29.jpg',
  'isle-dead':        'https://upload.wikimedia.org/wikipedia/commons/e/e1/Arnold_B%C3%B6cklin_-_Die_Toteninsel_III_%28Alte_Nationalgalerie%2C_Berlin%29.jpg',
  'ondine':           'https://upload.wikimedia.org/wikipedia/commons/9/9c/Im_Spiel_der_Wellen.jpg',
  'depths-sea':       'https://upload.wikimedia.org/wikipedia/commons/6/65/Edward_Burne-Jones_-_The_Depths_of_the_Sea_%281887%29.jpg',
  'proserpine':       'https://upload.wikimedia.org/wikipedia/commons/a/a0/Proserpine-1874.jpg',
  'oedipus-sphinx':   'https://upload.wikimedia.org/wikipedia/commons/9/93/Gustave_Moreau_005.jpg',
  'cyclops':          'https://upload.wikimedia.org/wikipedia/commons/3/37/Odilon_Redon_-_The_Cyclops.jpg',
  'wanderer':         'https://upload.wikimedia.org/wikipedia/commons/9/9c/Caspar_David_Friedrich_-_Wanderer_above_the_Sea_of_Fog.jpeg',
  'great-wave':       'https://upload.wikimedia.org/wikipedia/commons/a/a7/The_Great_Wave_off_Kanagawa.jpg',
  'cardplayers':      'https://upload.wikimedia.org/wikipedia/commons/3/3f/Paul_C%C3%A9zanne%2C_The_Card_Players%2C_1892-95%2C_Courtauld_Institute.jpg',
  'cardsharps':       'https://upload.wikimedia.org/wikipedia/commons/0/04/Michelangelo_Merisi%2C_called_Caravaggio_-_The_Cardsharps_-_Google_Art_Project.jpg',
  'pygmalion':        'https://upload.wikimedia.org/wikipedia/commons/7/73/Edward_Burne-Jones_-_Pygmalion_and_the_Image_-_The_Soul_Attains_-_1878.jpg',
  'sappho-erinna':    'https://upload.wikimedia.org/wikipedia/commons/0/08/Simeon_Solomon_-_Sappho_and_Erinna_in_a_Garden_at_Mytilene.jpg',
  'francesca':        'https://upload.wikimedia.org/wikipedia/commons/a/a0/Alexandre_Cabanel_-_The_Death_of_Francesca_da_Rimini_and_Paolo_Malatesta.jpg',
};

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

async function download(url, dest, timeoutMs = 30000) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return 'skip';
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, {
      headers: { 'User-Agent': 'AbyssUEFetchArt/0.1', 'Accept': '*/*' },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); file.close(); try { fs.unlinkSync(dest); } catch {}
        download(new URL(res.headers.location, url).toString(), dest, timeoutMs).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume(); file.close(); try { fs.unlinkSync(dest); } catch {}
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve('ok')));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timeout ${timeoutMs}ms`)));
    req.on('error', err => { file.close(); try { fs.unlinkSync(dest); } catch {}; reject(err); });
  });
}

async function run() {
  ensureDir(OUT);
  const fails = [];
  console.log(`[fetch-art] → ${OUT}`);
  for (const [slug, url] of Object.entries(SOURCES)) {
    const dest = path.join(OUT, `${slug}.jpg`);
    try {
      const state = await download(url, dest);
      console.log(`  ${state === 'skip' ? '·' : '✓'} ${slug}`);
    } catch (err) {
      console.log(`  ✗ ${slug} — ${err.message}`);
      fails.push(slug);
    }
  }
  if (fails.length) { console.log(`\n${fails.length} failures.`); process.exit(1); }
  console.log('\n[fetch-art] complete. Next: import JPEGs in UE (drag into Content/Art).');
}
run().catch(err => { console.error(err); process.exit(1); });
