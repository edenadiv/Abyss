export const SUITS = [
  { s: '♠', color: 'black', name: 'abyss' },
  { s: '♥', color: 'red',   name: 'coral' },
  { s: '♦', color: 'red',   name: 'pearl' },
  { s: '♣', color: 'black', name: 'kelp'  },
];

export const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

export function makeDeck() {
  const d = [];
  for (const suit of SUITS) for (const rank of RANKS) {
    d.push({ rank, suit: suit.s, color: suit.color });
  }
  return d;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardValue(c) {
  if (c.rank === 'A') return 11;
  if (['K','Q','J'].includes(c.rank)) return 10;
  return parseInt(c.rank, 10);
}

export function handTotal(hand) {
  let t = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (t > 21 && aces > 0) { t -= 10; aces--; }
  return t;
}
