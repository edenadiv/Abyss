/* The house tightens as you play. Every 10/25/50/80 hands bumps the tier
   one step. edgeBias multiplies each game's win-probability floor. */

import type { Tier, OutfitTier } from '../types.js';

const TIERS: Tier[] = ['easy', 'normal', 'hard', 'rigged', 'cruel'];

export function effectiveHouseEdge(baseSetting: 'easy' | 'normal' | 'hard', handsPlayed: number): Tier {
  const baseIdx = Math.max(0, TIERS.indexOf(baseSetting as Tier));
  let steps = 0;
  if (handsPlayed >= 10) steps++;
  if (handsPlayed >= 25) steps++;
  if (handsPlayed >= 50) steps++;
  if (handsPlayed >= 80) steps++;
  return TIERS[Math.min(TIERS.length - 1, baseIdx + steps)];
}

export function edgeBias(tier: Tier): number {
  return ({ easy: 1.05, normal: 1.0, hard: 0.88, rigged: 0.78, cruel: 0.68 } as const)[tier] ?? 1.0;
}

export function softenTier(tier: Tier): Tier {
  const i = TIERS.indexOf(tier);
  return TIERS[Math.max(0, i - 1)];
}

/* Outfit tier driven by house edge — SOFT → CHAIN → TEETH → HERO.
   HERO is reserved for the Sovereign / Mirror / Revelation ending
   cinematics and is not returned by this function. */
export function outfitForTier(tier: Tier): OutfitTier {
  if (tier === 'easy' || tier === 'normal') return 'soft';
  if (tier === 'hard' || tier === 'rigged') return 'chain';
  return 'teeth';
}
