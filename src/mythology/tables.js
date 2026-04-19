/* The seven tables of the casino floor. */
export const TABLES = [
  { key: 'blackjack', name: 'Blackjack',   icon: '♠', desc: 'Twenty-one. The Siren deals.',      minBet:  5 },
  { key: 'roulette',  name: 'Omens Wheel', icon: 'Ψ', desc: 'Twelve cursed symbols, one pointer.',minBet:  5 },
  { key: 'baccarat',  name: 'Baccarat',    icon: '♦', desc: 'Player, Banker, or the rare Tie.',  minBet: 10 },
  { key: 'slots',     name: 'Glyphs',      icon: '𓂀', desc: 'Three reels of ancient tongues.',   minBet:  5 },
  { key: 'poker',     name: 'Ghost Poker', icon: '♣', desc: 'Five-card draw. Three dead patrons.',minBet: 10 },
  { key: 'dice',      name: 'Bones',       icon: '⚀', desc: 'Two dice cut from drowned ribs.',   minBet:  5 },
  { key: 'coin',      name: 'The Coin',    icon: '◉', desc: 'Siren or Kraken. Nothing is truly even.', minBet: 5 },
];
