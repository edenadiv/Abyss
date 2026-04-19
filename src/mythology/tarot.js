/* 12 Major-Arcana cards, one flipped per bet outcome. */
export const TAROT_CARDS = [
  { id: 'sun',        numeral: 'XIX',   name: 'THE SUN',          color: '#f4c04e', accent: '#b59248', min:  50,       max: Infinity,  tier: 'big-win'    },
  { id: 'magician',   numeral: 'I',     name: 'THE MAGICIAN',     color: '#ff6b8a', accent: '#8b1e2c', min:  50,       max: Infinity,  tier: 'big-win'    },
  { id: 'wheel',      numeral: 'X',     name: 'WHEEL OF FORTUNE', color: '#7ef0ff', accent: '#3fb8cc', min:  50,       max: Infinity,  tier: 'big-win'    },
  { id: 'empress',    numeral: 'III',   name: 'THE EMPRESS',      color: '#c7a6ff', accent: '#8b6fd6', min:   1,       max: 49,        tier: 'small-win'  },
  { id: 'star',       numeral: 'XVII',  name: 'THE STAR',         color: '#5be0c2', accent: '#3a8e78', min:   1,       max: 49,        tier: 'small-win'  },
  { id: 'temperance', numeral: 'XIV',   name: 'TEMPERANCE',       color: '#e8e2cc', accent: '#a39a7e', min:   0,       max:  0,        tier: 'push'       },
  { id: 'moon',       numeral: 'XVIII', name: 'THE MOON',         color: '#8b6fd6', accent: '#442e78', min: -49,       max: -1,        tier: 'small-loss' },
  { id: 'hanged',     numeral: 'XII',   name: 'THE HANGED MAN',   color: '#5a6a74', accent: '#2a3a44', min: -49,       max: -1,        tier: 'small-loss' },
  { id: 'tower',      numeral: 'XVI',   name: 'THE TOWER',        color: '#c4455d', accent: '#8b1e2c', min: -Infinity, max: -50,       tier: 'big-loss'   },
  { id: 'death',      numeral: 'XIII',  name: 'DEATH',            color: '#e8e2cc', accent: '#0a1a24', min: -Infinity, max: -50,       tier: 'big-loss'   },
  { id: 'devil',      numeral: 'XV',    name: 'THE DEVIL',        color: '#8b1e2c', accent: '#2a0810', min: -Infinity, max: Infinity,  tier: 'cursed'     },
  { id: 'fool',       numeral: '0',     name: 'THE FOOL',         color: '#ffc07a', accent: '#8a5e20', min: -Infinity, max: Infinity,  tier: 'special'    },
];

export function pickTarotCard(delta, cursed) {
  if (cursed && Math.random() < 0.5) return TAROT_CARDS.find(c => c.id === 'devil');
  const candidates = TAROT_CARDS.filter(c => delta >= c.min && delta <= c.max);
  if (!candidates.length) return TAROT_CARDS[5]; // temperance
  return candidates[Math.floor(Math.random() * candidates.length)];
}
