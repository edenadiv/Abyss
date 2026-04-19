# ABYSS

> *A casino in the deep. Seven tables. One door. Your breath in every seat.*

Abyss is a first-person 3D walkable underwater casino built with **Vite + React 18 + Three.js**. You descend into a gilt, neon-lit chamber and gamble your breath against a house that silently rigs itself as you play. Eight endings. A showgirl mermaid on a pole. A gallery of public-domain masterpieces on the walls. A Confessional you can visit if you want to stop.

## Play

```bash
npm install
npm run dev
```

Open [http://localhost:8765/](http://localhost:8765/) in a modern browser. Click **Descend** on the title screen, then click again to lock the mouse.

For a production bundle:

```bash
npm run build    # output lands in dist/
npm run preview  # serves dist/ at http://localhost:4173/
```

### Controls

| Key | Action |
|---|---|
| `W A S D` / arrows | Move |
| `Shift` | Swim faster |
| `Mouse` | Look |
| `E` | Approach a table / NPC / portal |
| `Esc` | Release the mouse |

## The casino

A chamber 34 units across. A lit stage with a brass pole and a mermaid dancing on it. Seven tables ringing the floor. Fourteen slot-machine cabinets against the west wall with a flashing "PROGRESSIVE JACKPOT · 9,999 BREATH" sign overhead. Four chandeliers. A mirror ball. Two LED ticker tapes scrolling winners. Four more rooms to find: the **Pawn Shop**, the **Dressing Room**, the **Confessional** (tucked away off the Pawn Shop).

## The mechanics

- **Breath** is the currency. You start with 200. The door out costs 500.
- **The house edge rises** as you play — soft at ~10 hands, cruel by 80.
- **12 story fragments** scattered across the chamber. Pick them all up and the door leads somewhere different.
- **Roguelike**: close the tab, run ends. The `sessionStorage` is the whole save.
- **Eight endings** — Drown, Escape, House, Ghost, Revelation, Mirror, Sovereign, Walk Away. The Endings Tracker on the Ghost intro shows which you've found.

## The women

All the sea-women are painterly 3D mermaids in the Pre-Raphaelite / Klimt / Waterhouse register — procedural geometry with canvas-painted textures.

- **The Siren** — at her altar. Her dress escalates with the house edge: soft → chain → teeth.
- **The Mirror** — appears near the central stage after 1,000 breath. She wears your winnings.
- **The Charm-keeper** — in the Dressing Room. Sells lucky kisses and cursed chains.
- **The Merchant** — in the Pawn Shop. Sells trinkets. Buys memories.
- **The Confessor** — veiled. The one who withholds.
- **The Gambler / Muse / Drowned Chorus** — ambient presences that react to the room.

## Gallery

Real public-domain paintings hotlinked from Wikimedia Commons in gilt-framed 3D panels around the chamber:

- John William Waterhouse, *A Mermaid* (1900)
- Arnold Böcklin, *Isle of the Dead* (1880)
- Gustav Klimt, *Water Serpents II* (1907)
- John William Waterhouse, *Ulysses and the Sirens* (1891)
- Edward Burne-Jones, *The Depths of the Sea* (1887)
- Katsushika Hokusai, *The Great Wave off Kanagawa* (1831)
- Gustav Klimt, *Danaë* (1907)

Each ending cinematic has its own backdrop painting. Procedural painterly placeholders stand in when Wikimedia is unreachable.

## Project layout

```
Abyss/
├── index.html                (thin entry — just a #root + module script)
├── package.json              (vite, react, three)
├── vite.config.js            (port 8765)
├── public/screenshots/
└── src/
    ├── main.jsx              (ReactDOM root)
    ├── App.jsx               (top-level scene router)
    ├── components.jsx        (all non-App React UI: HUD, scenes, modals, world wrapper)
    ├── styles/index.css      (root vars, resets, hud, world, modals, games, endings, animations)
    ├── games/index.jsx       (Blackjack, Roulette, Baccarat, Slots, Poker, Dice, CoinFlip)
    ├── world/TrappedWorld.js (Three.js class — scene, meshes, textures, rooms, postfx)
    ├── audio/TrappedAudio.js (Web Audio — rumble, bells, heartbeats, bubble pops)
    ├── mythology/            (FRAGMENTS, TRINKETS, TAROT_CARDS, ENDING_CARDS, SIREN_LINES, houseEdge, tables)
    ├── state/                (meta, ledger, useFragments, useTrinkets)
    └── utils/                (format, typewriter, deck)
```

## Under the hood

- **Vite 5** for dev + build. Hot module replacement for React and CSS.
- **Three.js 0.128** for the walkable 3D: `LatheGeometry` mermaid torsos, `TubeGeometry` tails, `InstancedMesh` coin scatter, `ShaderMaterial` caustics, `EffectComposer` + `UnrealBloomPass` + custom underwater RGB-split `ShaderPass`.
- **Web Audio API** for everything audible: brown-noise rumble, detuned sine drones on a Phrygian chord progression, vocal-formant Siren humming, bell tolls when the house edge tightens, heartbeat when breath drops below 50, procedural bubble pops, chip-stack clinks, shop bell, fragment-pickup chime.
- **Canvas 2D** for every texture — NPC faces, scale patterns, tarot cards, felt, marble, wood, brass, stained glass.
- **React 18** for the UI layer (intro, endings, shop modals, game modals, tarot reveals, ledger).
- Pure JavaScript + JSX, no TypeScript. Pure CSS, no frameworks.

## Credits

Conceived, designed, and built across many late nights.

> *In the sea monster we trust.*
