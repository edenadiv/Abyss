# Abyss — Desktop

Standalone desktop build of Abyss. Babylon.js 7 + WebGPU, Electron 33, TypeScript.

Shipping target: **Steam** (macOS · Windows · Linux).

## Quickstart

```bash
npm install
npm run fetch:art        # downloads the 22 public-domain paintings
npm run electron:dev     # dev window with HMR
```

## Build + package

```bash
npm run build            # typecheck + vite build → dist/
npm run electron:preview # build + run local Electron against dist/
npm run package:mac      # DMG   → release/Abyss-<v>-mac-universal.dmg
npm run package:win      # NSIS  → release/Abyss-<v>-win-x64.exe
npm run package:linux    # AppImage
```

## Ship to Steam

Once per machine: `steamcmd` on PATH, one-time Steam login with 2FA.

```bash
# 1. Sign + package
CSC_LINK=… CSC_KEY_PASSWORD=… APPLE_ID=… npm run package:mac
npm run package:win
npm run package:linux

# 2. Upload
STEAM_APP_ID=… STEAM_DEPOT_WIN=… STEAM_DEPOT_MAC=… STEAM_DEPOT_LINUX=… \
STEAM_USERNAME=… \
  npm run upload:steam -- --branch prerelease
```

Once pre-release QA passes, flip `--branch default` to release to customers.

## Project layout

```
abyss-desktop/
├── electron/         main + preload + store + steam bridge (TS)
├── src/
│   ├── engine/       app, loop, camera, player, input, save, achievements
│   ├── fx/           pipeline, env, materials
│   ├── entities/     figure, painting, table, chandelier, column, candelabra
│   ├── scenes/       casino (pawnshop / dressing / confessional to come)
│   ├── ui/           hud (GUI), menu, pause, settings, ending, gallery, table-modal
│   ├── games/        blackjack, coin, roulette + simple template
│   ├── content/      mythology data (ported from v1 src/)
│   └── main.ts       entry point + session orchestrator
├── assets/           art, characters, hdri, fonts, audio (populated by scripts)
├── scripts/          fetch-art, bake-characters, make-icons, upload-steam
├── build/            icons, entitlements
└── steam/            VDF templates
```

## Controls

- **WASD / arrows** — walk  (Shift to sprint)
- **Mouse** — look (click in the canvas to lock)
- **E** — interact
- **Esc** — pause menu
- **F11** — toggle fullscreen
- **F12** — toggle devtools

## Design notes

### UI — "Occult Ledger"

Blackletter display typography (UnifrakturMaguntia), brass + parchment
palette, wax-sealed buttons. In-game HUD is rendered with Babylon GUI
(no DOM), so there's zero compositor contention during gameplay.

### Graphics bar

- PBR metallic-roughness materials throughout
- Procedural IBL for cheap-but-convincing reflections (swap for real HDRI later)
- Babylon `DefaultRenderingPipeline` = bloom, DOF, chromatic aberration, grain, sharpening
- `SSAO2RenderingPipeline` on medium+
- 2048² shadow cascades on ultra, 1024² on high/medium, off on low
- FSR / FXAA fallback on low presets
- Target: 60+ fps @ 1440p on M-class, 120 fps @ 4K on M-Max

### Characters

Painted sprite billboards (2048×4096), one per tier:
**SOFT → CHAIN → TEETH → HERO**, driven by house edge (higher edge =
higher-escalation outfit). Source paintings from `scripts/fetch-art.mjs`;
`scripts/bake-characters.mjs` composites the tier variants at build time.

If baked sprites aren't present, figures fall back to the painting slug
so Waterhouse's *A Mermaid* stands in for the Siren — still a complete
painterly character, just not the bespoke composite.

### Save / settings

- Three slots, each at `<userData>/saves/slot-{1,2,3}.json`
- Steam Cloud auto-syncs those when configured on the partner portal
- Settings in `<userData>/settings.json`
- Hard roguelike toggle: Drown wipes the active slot

### Achievements + rich presence

IDs match Steamworks partner portal (`ending_*`, `all_endings`,
`first_breath`, `all_fragments`, `house_broken`, `mirror_met`,
`confessional_visited`, `sell_your_memory`, `kraken_armed`). Rich
presence updates per scene (`#Status_InCasino`, `#Status_AtTable`,
`#Status_SeenEnding`, etc.) — localization strings live in the portal.

## License

Code: MIT (see `/LICENSE` in repo root).
Art: public domain (pre-1928), bundled under Wikimedia Commons' PD-Art
terms.
