/* Steamworks achievement helpers — mirror the Steamworks partner portal
   IDs. Graceful no-op when Steam isn't available. */

import type { EndingKind } from '../types.js';

const granted = new Set<string>();

function available(): boolean {
  return typeof window !== 'undefined' && !!window.abyss?.steam;
}

export function unlock(id: string) {
  if (!id || granted.has(id)) return;
  granted.add(id);
  if (!available()) {
    console.log('[achievement]', id);
    return;
  }
  window.abyss!.steam.activateAchievement(id).catch(err => console.warn('[achievement] failed', id, err));
}

export const ACHIEVEMENTS = {
  ENDING_DROWN:          'ending_drown',
  ENDING_ESCAPE:         'ending_escape',
  ENDING_HOUSE:          'ending_house',
  ENDING_GHOST:          'ending_ghost',
  ENDING_REVELATION:     'ending_revelation',
  ENDING_MIRROR:         'ending_mirror',
  ENDING_SOVEREIGN:      'ending_sovereign',
  ENDING_WALK_AWAY:      'ending_walk_away',
  ALL_ENDINGS:           'all_endings',
  ALL_FRAGMENTS:         'all_fragments',
  FIRST_BREATH:          'first_breath',
  HOUSE_BROKEN:          'house_broken',
  CONFESSIONAL_VISITED:  'confessional_visited',
  MIRROR_MET:            'mirror_met',
  SELL_YOUR_MEMORY:      'sell_your_memory',
  KRAKEN_ARMED:          'kraken_armed',
};

export function onEndingReached(kind: EndingKind, allCount: number) {
  unlock('ending_' + kind.toLowerCase());
  if (allCount >= 8) unlock(ACHIEVEMENTS.ALL_ENDINGS);
}

export function onFragmentCollected(count: number) {
  if (count >= 12) unlock(ACHIEVEMENTS.ALL_FRAGMENTS);
}

export function onFirstHand() { unlock(ACHIEVEMENTS.FIRST_BREATH); }
export function onBreathMilestone(b: number) { if (b >= 1000) unlock(ACHIEVEMENTS.HOUSE_BROKEN); }

export function setRichPresenceScene(scene: string) {
  if (!available()) return;
  const key = 'steam_display';
  const val = scene === 'casino' ? '#Status_InCasino'
            : scene === 'pawnshop' ? '#Status_InPawnshop'
            : scene === 'dressing' ? '#Status_InDressing'
            : scene === 'confessional' ? '#Status_InConfessional'
            : scene === 'menu' ? '#Status_MainMenu'
            : scene.startsWith('game:') ? '#Status_AtTable'
            : '#Status_InCasino';
  window.abyss!.steam.setRichPresence(key, val).catch(() => {});
}
