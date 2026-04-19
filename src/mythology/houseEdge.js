/* The house reveals itself as you play — every 10, 25, 50, 80 hands
   bumps the effective tier one step darker. */
export function effectiveHouseEdge(baseSetting, handsPlayed) {
  const tiers = ['easy', 'normal', 'hard', 'rigged', 'cruel'];
  const baseIdx = Math.max(
    0,
    tiers.indexOf(
      baseSetting === 'easy'   ? 'easy'   :
      baseSetting === 'normal' ? 'normal' :
                                 'hard'
    )
  );
  let steps = 0;
  if (handsPlayed >= 10) steps++;
  if (handsPlayed >= 25) steps++;
  if (handsPlayed >= 50) steps++;
  if (handsPlayed >= 80) steps++;
  return tiers[Math.min(tiers.length - 1, baseIdx + steps)];
}

/* Derived win bias from an effective edge tier. Used by games to modulate payouts. */
export function edgeBias(tier) {
  return ({
    easy:   1.05,
    normal: 1.00,
    hard:   0.88,
    rigged: 0.78,
    cruel:  0.68,
  })[tier] || 1.0;
}
