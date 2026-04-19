/* Charms + cursed trinkets sold in the Pawn Shop / Dressing Room. */

export interface Trinket {
  id: string;
  name: string;
  desc: string;
  cost: number;
  charges: number;
  effect: 'edge-1' | 'coin-win' | 'dice-bias' | 'bj-bust' | 'payout+' | 'reroll' | 'wheel-peek' | 'cursed-drip';
  color: string;
  cursed?: boolean;
}

export const TRINKETS: Trinket[] = [
  { id: 'kraken-tooth',   name: 'Kraken Tooth',              desc: 'Softens the house for the next 10 hands.',                        cost:  80, charges: 10,  effect: 'edge-1',     color: '#7ef0ff' },
  { id: 'silver-coin',    name: 'Silver Coin',               desc: 'The next flip lands where you asked it to.',                      cost:  40, charges:  1,  effect: 'coin-win',   color: '#e8e2cc' },
  { id: 'loaded-die',     name: 'Loaded Die',                desc: 'Dice lean toward your number for 5 rolls.',                       cost:  60, charges:  5,  effect: 'dice-bias',  color: '#f0e8d0' },
  { id: 'marked-cards',   name: 'Marked Cards',              desc: 'Dealer busts more often in Blackjack, 5 hands.',                  cost: 100, charges:  5,  effect: 'bj-bust',    color: '#c7a6ff' },
  { id: 'lucky-kiss',     name: 'Lucky Kiss',                desc: 'Payouts +25% for the next 5 wins.',                                cost:  70, charges:  5,  effect: 'payout+',    color: '#ff6b8a' },
  { id: 'siren-feather',  name: 'Siren Feather',             desc: 'Re-roll a single losing result. Once.',                            cost: 120, charges:  1,  effect: 'reroll',     color: '#c7a6ff' },
  { id: 'mirror-shard',   name: 'Mirror Shard',              desc: "See the wheel's landing spot before you bet (3 peeks).",          cost:  50, charges:  3,  effect: 'wheel-peek', color: '#7ef0ff' },
  { id: 'drowning-chain', name: 'Drowning Chain (cursed)',   desc: 'Payouts x1.5 · but you lose 1 breath per second, for 2 minutes.', cost:   0, charges: 120, effect: 'cursed-drip',color: '#8b1e2c', cursed: true },
];
