/* Playing-card utilities for blackjack, baccarat, poker. */

export interface Card {
  rank: string;
  suit: string;
  red: boolean;
}

const SUITS = [
  { glyph: '♠', red: false },
  { glyph: '♥', red: true  },
  { glyph: '♦', red: true  },
  { glyph: '♣', red: false },
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function buildDeck(decks = 1): Card[] {
  const out: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS) for (const r of RANKS) {
      out.push({ rank: r, suit: s.glyph, red: s.red });
    }
  }
  return out;
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cardValue(c: Card): number {
  if (c.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(c.rank)) return 10;
  return parseInt(c.rank, 10);
}

export function handValue(cards: Card[]): number {
  let total = 0, aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

/* Lightweight poker hand ranking — for Ghost Poker. Returns { rank, score }.
   Higher rank beats lower; ties broken by score. */
export type PokerRank = 'high' | 'pair' | 'two-pair' | 'trips' | 'straight' | 'flush' | 'full' | 'quads' | 'straight-flush';
export interface PokerResult { rank: PokerRank; score: number; name: string; }

const RANK_INDEX: Record<string, number> = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };

export function pokerEvaluate(hand: Card[]): PokerResult {
  if (hand.length !== 5) return { rank: 'high', score: 0, name: 'High card' };
  const vals = hand.map(c => RANK_INDEX[c.rank] ?? 0).sort((a, b) => b - a);
  const suits = hand.map(c => c.suit);
  const counts: Record<number, number> = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
  const flush = new Set(suits).size === 1;
  const straightVals = [...new Set(vals)].sort((a, b) => a - b);
  let straight = false;
  if (straightVals.length >= 5 && straightVals[straightVals.length - 1] - straightVals[0] === 4) straight = true;
  // Wheel straight A-2-3-4-5
  if ([2, 3, 4, 5, 14].every(v => vals.includes(v))) straight = true;

  const highCard = vals[0];
  if (straight && flush) return { rank: 'straight-flush', score: 900 + highCard, name: 'Straight flush' };
  if (sorted[0][1] === 4) return { rank: 'quads', score: 800 + Number(sorted[0][0]), name: 'Four of a kind' };
  if (sorted[0][1] === 3 && sorted[1][1] === 2) return { rank: 'full', score: 700 + Number(sorted[0][0]), name: 'Full house' };
  if (flush) return { rank: 'flush', score: 600 + highCard, name: 'Flush' };
  if (straight) return { rank: 'straight', score: 500 + highCard, name: 'Straight' };
  if (sorted[0][1] === 3) return { rank: 'trips', score: 400 + Number(sorted[0][0]), name: 'Three of a kind' };
  if (sorted[0][1] === 2 && sorted[1][1] === 2) return { rank: 'two-pair', score: 300 + Number(sorted[0][0]) * 15 + Number(sorted[1][0]), name: 'Two pair' };
  if (sorted[0][1] === 2) return { rank: 'pair', score: 200 + Number(sorted[0][0]), name: 'Pair' };
  return { rank: 'high', score: 100 + highCard, name: 'High card' };
}
