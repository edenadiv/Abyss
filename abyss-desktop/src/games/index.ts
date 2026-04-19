/* Game registry. Each game receives a render target + state callbacks.
   Blackjack / Roulette / Coin are fully implemented; baccarat / slots /
   poker / dice use the simplified bet-and-reveal template (same UX shape,
   deeper rulesets can grow in later iterations). */

import { playBlackjack } from './blackjack.js';
import { playRoulette } from './roulette.js';
import { playCoin } from './coin.js';
import { playSimple } from './simple.js';

export type Outcome = 'win' | 'lose' | 'push' | 'bust' | 'blackjack';

export interface GameContext {
  body: HTMLElement;
  getBreath: () => number;
  /* edgeBias: 1.0 baseline. Games multiply their win probability by this. */
  edgeBias: number;
  onResult: (delta: number, outcome: Outcome) => void;
  onClose: () => void;
}

export interface GameDef {
  title: string;
  play: (ctx: GameContext) => void;
}

export const GAMES: Record<string, GameDef> = {
  blackjack: { title: 'Blackjack',   play: playBlackjack },
  coin:      { title: 'The Coin',    play: playCoin },
  roulette:  { title: 'Omens Wheel', play: playRoulette },
  baccarat:  { title: 'Baccarat',    play: (c) => playSimple(c, 'baccarat') },
  slots:     { title: 'Glyphs',      play: (c) => playSimple(c, 'slots') },
  poker:     { title: 'Ghost Poker', play: (c) => playSimple(c, 'poker') },
  dice:      { title: 'Bones',       play: (c) => playSimple(c, 'dice') },
};
