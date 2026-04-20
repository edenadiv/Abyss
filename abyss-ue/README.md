# Abyss — Unreal Engine 5 rewrite

Marvelous-tier graphics + high FPS + Steam-shippable. UE 5.4, Lumen + Nanite + Virtual Shadow Maps, `OnlineSubsystemSteam` plugin for achievements / Cloud / rich presence.

## Setup (one-time)

1. **Install Unreal Engine 5.4** — [Epic Games Launcher](https://store.epicgames.com/en-US/download) → Unreal Engine tab → Install 5.4.
2. **Install Xcode** (macOS target builds) or the Windows SDK (Windows target builds).
3. **Clone + open:**
   ```bash
   cd abyss-ue
   ./scripts/fetch-art.mjs              # downloads 22 paintings → Content/Art/
   ./scripts/export-data-stub.mjs       # emits JSON → ThirdParty/data/
   ```
4. **Generate Xcode/VS project files:** right-click `Abyss.uproject` in Finder → "Services" → "Generate Xcode Project" (Mac), or double-click on Windows.
5. **Open in UE:** double-click `Abyss.uproject`. UE will compile the C++ module on first open (~2 minutes).

## Content/Art and Fonts

The art pipeline downloads JPEGs into `Content/Art/`. Drag them into the Content Browser so UE imports them as `UTexture2D` assets. Same for the fonts in `Content/Fonts/` — drag and create `UFont` assets.

## Data (fragments, trinkets, tables, endings)

`ThirdParty/data/*.json` is the canonical source of truth — generated from the existing `abyss-desktop/src/content/*.ts`. The UE side reads them at startup via `UAbyssContent` (C++ `UGameInstanceSubsystem`).

When you edit narrative content in `abyss-desktop`, run:

```bash
./scripts/export-data-stub.mjs
```

No UE-side changes needed; the JSON is read at every boot.

## Blueprints to build (next iteration in the editor)

- `BP_AbyssGameMode` — references `UAbyssGameInstance` + default pawn
- `BP_Player` — first-person ACharacter + Enhanced Input mappings (WASD, mouse, sprint, E, Esc, F11)
- `BP_Painting` — actor with frame static mesh + dynamic material that swaps `T_Painting` instance by slug
- `BP_Figure` — camera-facing sprite billboard actor; material switches texture by `EAbyssOutfitTier`
- `BP_Chandelier` / `BP_Candelabra` — static mesh assemblies with point lights + Niagara candle flame
- `WBP_MainMenu` / `WBP_HUD` / `WBP_Pause` / `WBP_Settings` / `WBP_TableModal` / `WBP_Ending` / `WBP_Gallery` — UMG widgets styled with UnifrakturMaguntia + Cormorant Upright

## Package for Steam

```bash
# UE command-line (example for Mac):
$UE_ENGINE/Engine/Binaries/Mac/UnrealEditor-Cmd.app/Contents/MacOS/UnrealEditor-Cmd \
  Abyss.uproject -run=Cook -targetplatform=MacEditor -CookAll -unversioned
```

Or use the editor: **File → Package Project → Mac / Windows / Linux**. Output lands in `release/`.

## Upload to Steam

Once release/ has the per-platform folders:

```bash
STEAM_APP_ID=… STEAM_DEPOT_WIN=… STEAM_DEPOT_MAC=… STEAM_DEPOT_LINUX=… \
STEAM_USERNAME=… \
  ./scripts/upload-steam.mjs --branch prerelease
```

## Steamworks partner portal checklist

- Create the app + 3 depots (Win/Mac/Linux)
- Set `steam_appid.txt` placeholder locally to your real appid; commit to `Config/DefaultEngine.ini [OnlineSubsystemSteam] SteamDevAppId=…`
- Configure achievements with IDs matching `AbyssGameInstance.cpp::TriggerEnding` (`ending_drown`, `ending_escape`, … `all_endings`, `first_breath`, `house_broken`, `mirror_met`, `confessional_visited`, `sell_your_memory`, `kraken_armed`, `all_fragments`)
- Configure Steam Cloud to sync `%APPDATA%/Abyss/Saved/SaveGames/*.sav`
- Localize rich-presence tokens: `#Status_InCasino`, `#Status_InPawnshop`, `#Status_InDressing`, `#Status_InConfessional`, `#Status_MainMenu`, `#Status_AtTable`, `#Status_SeenEnding`

## Directory

```
abyss-ue/
├── Abyss.uproject
├── Config/                       engine / game / input .ini
├── Content/
│   ├── Art/                      paintings (fetched)
│   ├── Characters/               baked figure sprites (bake-characters.mjs)
│   ├── Audio/                    ambient + SFX
│   ├── Fonts/                    UnifrakturMaguntia, Cormorant Upright, JetBrains Mono
│   ├── Maps/                     Casino, Pawnshop, Dressing, Confessional, Endings/*
│   ├── Materials/                master PBR materials
│   ├── Blueprints/               BP_Player, BP_Painting, BP_Figure, BP_Chandelier, …
│   ├── UI/                       WBP_MainMenu, WBP_HUD, WBP_Pause, …
│   └── Core/                     BP_AbyssGameMode, BP_AbyssPlayerController
├── Source/
│   ├── Abyss.Target.cs           shipping target
│   ├── AbyssEditor.Target.cs     editor target
│   └── Abyss/                    C++ module
│       ├── AbyssTypes.h          USTRUCTs for Fragment / Trinket / Table / Ending / RunState / Settings
│       ├── AbyssGameInstance.*   per-session state + save/load + steam bridge
│       ├── AbyssSaveGame.h       USaveGame subclass
│       ├── AbyssSteam.*          achievement / presence helpers
│       ├── AbyssContent.*        JSON loader subsystem (fragments.json etc.)
│       ├── Abyss.Build.cs        module dependencies
│       └── Abyss.{h,cpp}         IMPLEMENT_PRIMARY_GAME_MODULE entry
├── ThirdParty/data/              JSON content (regen via export-data-stub.mjs)
├── scripts/
│   ├── fetch-art.mjs             paintings downloader
│   ├── export-data-stub.mjs      wraps abyss-desktop/scripts/export-content.mjs
│   └── upload-steam.mjs          steamcmd upload
├── steam/                        VDF templates
└── build/                        entitlements, icons
```

## Status

- [x] Project scaffold (`.uproject`, `.ini`, `.gitignore`)
- [x] C++ module (`UAbyssGameInstance`, `UAbyssContent`, `UAbyssSaveGame`, `FAbyssSteam`)
- [x] Data types (`USTRUCT` for all content)
- [x] JSON export pipeline from `abyss-desktop/src/content/`
- [x] Steam upload pipeline (VDF templates + script)
- [x] Paintings downloader
- [ ] Open `Abyss.uproject` in UE 5.4 — first compile
- [ ] Create `BP_Player` + Enhanced Input mappings
- [ ] Build `Casino.umap` with Lumen + Nanite (**Phase 2 gate: 120 fps at 1440p**)
- [ ] Master materials (M_Marble / M_Brass / M_Velvet / M_Felt / M_Wood / M_PaintingCanvas)
- [ ] `BP_Painting`, `BP_Chandelier`, `BP_Candelabra`, `BP_Figure`, `BP_Table`
- [ ] UMG widgets (menu / HUD / pause / settings / ending / gallery)
- [ ] Seven game modals (Blackjack, Roulette, Coin, Baccarat, Slots, Poker, Dice)
- [ ] Pawnshop / Dressing / Confessional levels
- [ ] 8 ending Sequencer shots
- [ ] Packaged + notarized Mac DMG
- [ ] First Steam depot upload on `prerelease`

## License

Code: MIT (repo root). Painting art: public domain (pre-1928). Fonts: OFL.
