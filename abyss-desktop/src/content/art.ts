/* Central map of every painting slug → local/remote URL resolver.
   Local `/art/{slug}.jpg` shipped with the installer; Wikimedia fallback
   for web dev. */

interface PaintingEntry {
  local: string;
  remote: string;
  /* optional specialty crop area (0-1 uv) used when the character baker
     slices a figure out of a larger composition */
  crop?: { u: number; v: number; w: number; h: number };
}

export const PAINTINGS: Record<string, PaintingEntry> = {
  mermaid:          { local: 'art/mermaid.jpg',          remote: 'https://upload.wikimedia.org/wikipedia/commons/7/73/A_Mermaid.jpg' },
  'ulysses-sirens': { local: 'art/ulysses-sirens.jpg',   remote: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/John_William_Waterhouse_-_Ulysses_and_the_Sirens_%281891%29.jpg' },
  hylas:            { local: 'art/hylas.jpg',            remote: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Hylas_and_the_Nymphs_Manchester_Art_Gallery_1896.15.jpg' },
  'nymphs-pan':     { local: 'art/nymphs-pan.jpg',       remote: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Nymphs_and_Satyr_Bouguereau.jpg' },
  'birth-venus-b':  { local: 'art/birth-venus-b.jpg',    remote: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/William-Adolphe_Bouguereau_%281825-1905%29_-_The_Birth_of_Venus_%281879%29.jpg' },
  'the-wave':       { local: 'art/the-wave.jpg',         remote: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/William-Adolphe_Bouguereau_-_The_Wave_-_Google_Art_Project.jpg' },
  'danae-k':        { local: 'art/danae-k.jpg',          remote: 'https://upload.wikimedia.org/wikipedia/commons/9/93/KLIMT_-_Dan%C3%A1e_%281907-1908%29.jpg' },
  'water-serpents-ii': { local: 'art/water-serpents-ii.jpg', remote: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Gustav_Klimt_048.jpg' },
  'beethoven-frieze': { local: 'art/beethoven-frieze.jpg', remote: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Gustav_Klimt_-_Beethovenfries%2C_Detail_%28Gorgonen%29.jpg' },
  'isle-dead':      { local: 'art/isle-dead.jpg',        remote: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Arnold_B%C3%B6cklin_-_Die_Toteninsel_III_%28Alte_Nationalgalerie%2C_Berlin%29.jpg' },
  ondine:           { local: 'art/ondine.jpg',           remote: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Im_Spiel_der_Wellen.jpg' },
  'depths-sea':     { local: 'art/depths-sea.jpg',       remote: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Edward_Burne-Jones_-_The_Depths_of_the_Sea_%281887%29.jpg' },
  proserpine:       { local: 'art/proserpine.jpg',       remote: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Proserpine-1874.jpg' },
  'oedipus-sphinx': { local: 'art/oedipus-sphinx.jpg',   remote: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Gustave_Moreau_005.jpg' },
  cyclops:          { local: 'art/cyclops.jpg',          remote: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Odilon_Redon_-_The_Cyclops.jpg' },
  wanderer:         { local: 'art/wanderer.jpg',         remote: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Caspar_David_Friedrich_-_Wanderer_above_the_Sea_of_Fog.jpeg' },
  'great-wave':     { local: 'art/great-wave.jpg',       remote: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/The_Great_Wave_off_Kanagawa.jpg' },
  cardplayers:      { local: 'art/cardplayers.jpg',      remote: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Paul_C%C3%A9zanne%2C_The_Card_Players%2C_1892-95%2C_Courtauld_Institute.jpg' },
  cardsharps:       { local: 'art/cardsharps.jpg',       remote: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Michelangelo_Merisi%2C_called_Caravaggio_-_The_Cardsharps_-_Google_Art_Project.jpg' },
  pygmalion:        { local: 'art/pygmalion.jpg',        remote: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Edward_Burne-Jones_-_Pygmalion_and_the_Image_-_The_Soul_Attains_-_1878.jpg' },
  'sappho-erinna':  { local: 'art/sappho-erinna.jpg',    remote: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Simeon_Solomon_-_Sappho_and_Erinna_in_a_Garden_at_Mytilene.jpg' },
  francesca:        { local: 'art/francesca.jpg',        remote: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Alexandre_Cabanel_-_The_Death_of_Francesca_da_Rimini_and_Paolo_Malatesta.jpg' },
};

let localOk: boolean | null = null;

async function probeLocal(): Promise<boolean> {
  try {
    const r = await fetch('art/mermaid.jpg', { method: 'HEAD', cache: 'force-cache' });
    return r.ok;
  } catch { return false; }
}

export async function warmArtCache(): Promise<boolean> {
  if (localOk == null) localOk = await probeLocal();
  return localOk;
}

export function paintingUrl(slug: string): string | null {
  const entry = PAINTINGS[slug];
  if (!entry) return null;
  return localOk ? entry.local : entry.remote;
}

export const ALL_ROOM_PAINTING_SLUGS = [
  'mermaid', 'ulysses-sirens', 'hylas', 'birth-venus-b', 'danae-k',
  'water-serpents-ii', 'depths-sea', 'ondine', 'oedipus-sphinx',
  'great-wave', 'cyclops', 'nymphs-pan', 'the-wave', 'proserpine',
  'beethoven-frieze', 'sappho-erinna', 'francesca', 'pygmalion',
  'cardplayers', 'cardsharps', 'isle-dead', 'wanderer',
];
