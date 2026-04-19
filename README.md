# ABYSS

> *A casino in the deep. Seven tables. One door. Your breath in every seat.*

Abyss is a first-person 3D walkable underwater casino, delivered as a single self-contained HTML file. You descend into a gilt, neon-lit chamber and gamble your breath against a house that silently rigs itself as you play. Eight endings. A showgirl mermaid on a pole. A gallery of public-domain masterpieces on the walls. A Confessional you can visit if you want to stop.

## Play

```bash
python3 -m http.server 8765
```

Open [http://localhost:8765/](http://localhost:8765/) in a modern browser (Chrome/Safari/Firefox all work). Click **Descend** on the title screen, then click again to lock the mouse.

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

## Under the hood

- One `index.html` file. No build. No external JS dependencies beyond `three.js`, `@babel/standalone`, `react` + `react-dom`, all CDN.
- **Three.js** for the walkable 3D: `LatheGeometry` mermaid torsos, `TubeGeometry` tails, `InstancedMesh` coin scatter, `ShaderMaterial` caustics, `EffectComposer` + `UnrealBloomPass` + custom underwater RGB-split `ShaderPass`.
- **Web Audio API** for everything audible: brown-noise rumble, detuned sine drones on a Phrygian chord progression, vocal-formant Siren humming, bell tolls when the house edge tightens, heartbeat when breath drops below 50, procedural bubble pops, chip-stack clinks, shop bell, fragment-pickup chime.
- **Canvas 2D** for every texture — NPC faces, scale patterns, tarot cards, felt, marble, wood, brass, stained glass.
- **React 18** for the UI layer (intro, endings, shop modals, game modals, tarot reveals, ledger).
- Pure JavaScript, no TypeScript. Pure CSS, no frameworks.

## Credits

Conceived, designed, and built across many late nights in a single-file fever.

> *In the sea monster we trust.*
