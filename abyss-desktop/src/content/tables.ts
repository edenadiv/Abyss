/* Seven tables of the casino floor. */

export type TableKey = 'blackjack' | 'roulette' | 'baccarat' | 'slots' | 'poker' | 'dice' | 'coin';

export interface TableDef {
  key: TableKey;
  name: string;
  icon: string;
  desc: string;
  minBet: number;
  /* cosmetic accent color used for the table marker + cloth */
  accent: number;
}

export const TABLES: TableDef[] = [
  { key: 'blackjack', name: 'Blackjack',   icon: '♠', desc: 'Twenty-one. The Siren deals.',             minBet:  5, accent: 0x2a0e12 },
  { key: 'roulette',  name: 'Omens Wheel', icon: 'Ψ', desc: 'Twelve cursed symbols, one pointer.',      minBet:  5, accent: 0x1a2a3a },
  { key: 'baccarat',  name: 'Baccarat',    icon: '♦', desc: 'Player, Banker, or the rare Tie.',         minBet: 10, accent: 0x2a1810 },
  { key: 'slots',     name: 'Glyphs',      icon: '𓂀', desc: 'Three reels of ancient tongues.',          minBet:  5, accent: 0x3a1a2a },
  { key: 'poker',     name: 'Ghost Poker', icon: '♣', desc: 'Five-card draw. Three dead patrons.',      minBet: 10, accent: 0x1a2010 },
  { key: 'dice',      name: 'Bones',       icon: '⚀', desc: 'Two dice cut from drowned ribs.',          minBet:  5, accent: 0x2a2010 },
  { key: 'coin',      name: 'The Coin',    icon: '◉', desc: 'Siren or Kraken. Nothing is truly even.',  minBet:  5, accent: 0x1a1a28 },
];
