/* Eight endings + their backdrop painting slugs. */

import type { EndingKind } from '../types.js';

export interface EndingCard {
  id: EndingKind;
  label: string;
  hint: string;
  paintingSlug: string;
  /* voicing: which siren-line pool to draw from for the final monologue */
  closingLine: string;
}

export const ENDING_CARDS: EndingCard[] = [
  { id: 'drown',      label: 'The Breath Runs Dry',   hint: 'The water takes everything eventually.',           paintingSlug: 'isle-dead',
    closingLine: 'Breathe in. You cannot. The city keeps what was lent.' },
  { id: 'escape',     label: 'The Door Opens',         hint: 'Five hundred breaths will always open it.',        paintingSlug: 'wanderer',
    closingLine: 'The door opens onto a sea of fog. You do not look back.' },
  { id: 'house',      label: 'You Sit With Her',        hint: 'Some doors are kinder than others.',               paintingSlug: 'mermaid',
    closingLine: "She takes your hand. You stop counting breaths. You stay." },
  { id: 'ghost',      label: 'The Drowned Chorus',      hint: 'Dying is also staying.',                           paintingSlug: 'isle-dead',
    closingLine: 'You become one of the patrons. Another face at another table.' },
  { id: 'revelation', label: 'The Next Round',          hint: 'All twelve pieces. All one door.',                 paintingSlug: 'ulysses-sirens',
    closingLine: 'You remember everything. Everything ends. Everything begins again.' },
  { id: 'mirror',     label: 'You Become Her',          hint: 'A thousand breaths will make a dealer of anyone.', paintingSlug: 'danae-k',
    closingLine: 'You deal the next hand. The house wears your face now.' },
  { id: 'sovereign',  label: 'You Stayed',              hint: 'The house wears your face now.',                   paintingSlug: 'pygmalion',
    closingLine: 'The door is sealed. You own the seat, the chair, the abyss.' },
  { id: 'walkAway',   label: 'The Tide Took You',       hint: 'You remembered nothing. You left anyway.',         paintingSlug: 'great-wave',
    closingLine: 'The tide pulls sideways. You float out, remembering nothing.' },
];
