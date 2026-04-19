/* Abyss desktop — entry point.

   Flow:
     boot → hydrate settings → main menu →
       New Run (slot) → casino scene → play → ending → menu
       Continue (slot) → casino scene at saved state
   The menu is plain DOM; the game is pure Babylon. They don't coexist:
   starting a run unmounts the menu and every other DOM overlay. */

import { Vector3 } from '@babylonjs/core';
import { createEngineBundle } from './engine/app.js';
import { startLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { createFpsCamera } from './engine/camera.js';
import { createPlayer } from './engine/player.js';
import { save } from './engine/save.js';
import {
  onEndingReached, onFragmentCollected, onFirstHand,
  onBreathMilestone, setRichPresenceScene,
} from './engine/achievements.js';
import { createPostProcessing, type FxHandle } from './fx/pipeline.js';
import { attachProceduralIBL } from './fx/env.js';
import { buildCasino, type CasinoScene } from './scenes/casino.js';
import { createHud, type Hud } from './ui/hud.js';
import { createMainMenu } from './ui/menu.js';
import { createPauseMenu, createSettings } from './ui/pause.js';
import { createTableModal } from './ui/table-modal.js';
import { createEnding } from './ui/ending.js';
import { createGallery } from './ui/gallery.js';
import { GAMES } from './games/index.js';
import { effectiveHouseEdge, edgeBias, outfitForTier } from './content/house-edge.js';
import { pickLine } from './content/siren-lines.js';
import { warmArtCache } from './content/art.js';
import {
  META_DEFAULTS, SETTINGS_DEFAULTS,
  type AppSettings, type PlayerMeta, type EndingKind, type RunSave, type Tier, type OutfitTier,
} from './types.js';

const TARGET_BREATH = 500;

interface RunState {
  breath: number;
  gamesPlayed: number;
  meta: PlayerMeta;
  fragments: string[];
  tier: Tier;
  outfitTier: OutfitTier;
  worldRoom: 'casino' | 'pawnshop' | 'dressing' | 'confessional';
  lockedIn: boolean;
}

function freshRun(): RunState {
  return {
    breath: 200,
    gamesPlayed: 0,
    meta: { ...META_DEFAULTS },
    fragments: [],
    tier: 'easy',
    outfitTier: 'soft',
    worldRoom: 'casino',
    lockedIn: false,
  };
}

let settings: AppSettings = { ...SETTINGS_DEFAULTS };
let run: RunState = freshRun();
let activeUi: { unmount(): void } | null = null;
let sessionDispose: (() => void) | null = null;

const root = document.getElementById('app')!;

async function boot() {
  try {
    await save.bootstrap();
    settings = save.readSettings();
  } catch (err) {
    console.warn('[boot] bootstrap failed', err);
  }

  await warmArtCache(); // probes /art/mermaid.jpg → uses remote if missing

  const bootEl = document.getElementById('boot');
  if (bootEl) {
    bootEl.classList.add('done');
    setTimeout(() => bootEl.remove(), 600);
  }

  showMainMenu();
}

function clearActiveUi() {
  if (activeUi) { activeUi.unmount(); activeUi = null; }
}

function showMainMenu() {
  if (sessionDispose) { sessionDispose(); sessionDispose = null; }
  clearActiveUi();
  setRichPresenceScene('menu');

  const menu = createMainMenu({
    version: '0.1',
    listSlots: () => save.listSlots(),
    onNewRun: (slot) => startRun(slot, true),
    onContinue: (slot) => startRun(slot, false),
    onSettings: () => openSettings(),
    onGallery: () => openGallery(),
    onQuit: () => window.abyss?.app?.quit(),
  });
  activeUi = menu;
  menu.mount(root);
}

function openSettings() {
  const modal = createSettings({
    initial: settings,
    onApply: (next) => {
      settings = next;
      save.writeSettings(settings);
      // Some changes (quality preset) require full rebuild, handled on next launch
    },
    onClose: () => { modal.unmount(); },
  });
  modal.mount(root);
}

function openGallery() {
  const g = createGallery(run.meta.endingsReached as EndingKind[], () => g.unmount());
  g.mount(root);
}

async function startRun(slot: number, fresh: boolean) {
  save.setSlot(slot);
  if (fresh) await save.deleteSlot(slot);
  const persisted: RunSave | null = await save.hydrate();

  run = freshRun();
  if (!fresh && persisted) {
    run.breath = persisted.breath ?? 200;
    run.gamesPlayed = persisted.gamesPlayed ?? 0;
    run.fragments = persisted.fragments ?? [];
    run.meta = { ...META_DEFAULTS, ...(persisted.meta ?? {}) };
    run.lockedIn = !!persisted.lockedIn;
  }
  if (fresh) {
    run.meta.totalRuns = (persisted?.meta?.totalRuns ?? 0) + 1;
  }
  run.tier = effectiveHouseEdge('normal', run.gamesPlayed);
  run.outfitTier = outfitForTier(run.tier);

  clearActiveUi();
  persistRun();

  await enterSession();
}

async function enterSession() {
  // Canvas + engine
  const canvas = document.createElement('canvas');
  canvas.id = 'game';
  canvas.tabIndex = 0;
  root.appendChild(canvas);

  const bundle = await createEngineBundle(canvas, settings.quality);
  const { scene } = bundle;

  attachProceduralIBL(scene);

  // Camera + player
  const fps = createFpsCamera(scene, {
    fovDeg: settings.fov,
    sensitivity: 0.0022 * settings.mouseSensitivity,
  });
  const player = createPlayer(fps, { start: new Vector3(0, 1.65, 14) });

  const input = createInput(window);

  // World
  const casino: CasinoScene = buildCasino(scene);
  casino.setOutfitTier(run.outfitTier);
  for (const a of casino.aabbs) player.addAabb(a.minX, a.minZ, a.maxX, a.maxZ);

  // Post-processing — after camera exists
  const fx: FxHandle = createPostProcessing(scene, [fps.camera], { preset: settings.quality });
  fx.setBreath(run.breath);

  // HUD
  const hud: Hud = createHud(scene);
  hud.setBreath(run.breath, TARGET_BREATH);
  hud.setDepth(8812);
  hud.setFragmentCount(run.fragments.length);
  hud.setTier(run.tier);
  hud.showFps(settings.showFps);

  setRichPresenceScene('casino');

  // Pointer lock on canvas click
  canvas.addEventListener('click', () => {
    if (activeUi) return;
    input.requestLock(canvas);
  });

  // Key handlers (pause, interact, fullscreen)
  let pauseOpen = false;
  let tableOpen = false;

  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'F11' && window.abyss?.app?.toggleFullscreen) {
      e.preventDefault(); window.abyss.app.toggleFullscreen(); return;
    }
    if (e.code === 'Escape') {
      if (tableOpen) return;
      togglePause();
      return;
    }
    if (e.code === 'KeyE' && !pauseOpen && !tableOpen) tryInteract();
  };
  window.addEventListener('keydown', keyHandler);

  const tryInteract = () => {
    const p = player.position;
    const items = casino.getInteractables();
    let best = null, bestDist = 3.5;
    for (const it of items) {
      const dx = it.position.x - p.x, dz = it.position.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < bestDist) { best = it; bestDist = dist; }
    }
    if (!best) return;
    if (best.kind === 'table') openTable(best.key);
    else if (best.kind === 'door') tryExit();
    else if (best.kind === 'figure') {
      // stub — would open NPC dialog. For now, just flash a caption.
      hud.setPrompt('Their mouth moves. No sound carries.');
      setTimeout(() => hud.setPrompt(null), 1800);
    }
  };

  const openTable = (key: string) => {
    const def = GAMES[key];
    if (!def) return;
    input.releaseLock();
    tableOpen = true;
    const modal = createTableModal({
      title: def.title,
      breathRef: () => run.breath,
      onClose: () => {
        modal.unmount();
        tableOpen = false;
        // attempt re-lock
        input.requestLock(canvas);
      },
    });
    def.play({
      body: modal.body,
      getBreath: () => run.breath,
      edgeBias: edgeBias(run.tier),
      onResult: (delta, _outcome) => {
        if (run.gamesPlayed === 0) onFirstHand();
        run.breath = Math.max(0, run.breath + delta);
        run.gamesPlayed++;
        run.tier = effectiveHouseEdge('normal', run.gamesPlayed);
        run.outfitTier = outfitForTier(run.tier);
        run.meta.handsPlayedEver++;
        if (delta < 0) run.meta.breathsSurrendered += -delta;
        run.meta.maxBreathEver = Math.max(run.meta.maxBreathEver, run.breath);
        hud.setBreath(run.breath, TARGET_BREATH);
        hud.setTier(run.tier);
        fx.setBreath(run.breath);
        casino.setOutfitTier(run.outfitTier);
        onBreathMilestone(run.breath);
        modal.updateBreath();
        persistRun();
        if (run.breath <= 0) {
          modal.unmount(); tableOpen = false;
          setTimeout(() => triggerEnding('drown'), 700);
        }
      },
      onClose: () => modal.unmount(),
    });
    modal.mount(root);
    activeUi = modal;
    const prevUnmount = modal.unmount;
    modal.unmount = () => { activeUi = null; tableOpen = false; prevUnmount.call(modal); };
  };

  const tryExit = () => {
    if (run.breath >= TARGET_BREATH) setTimeout(() => triggerEnding('escape'), 600);
    else {
      hud.setPrompt(`The door is sealed. Need ${TARGET_BREATH - run.breath} more breath.`);
      setTimeout(() => hud.setPrompt(null), 2000);
    }
  };

  const triggerEnding = (kind: EndingKind) => {
    const already = run.meta.endingsReached.includes(kind);
    if (!already) run.meta.endingsReached.push(kind);
    if (kind === 'drown') { run.meta.deaths++; run.meta.lastDeathAt = Date.now(); }
    onEndingReached(kind, run.meta.endingsReached.length);
    persistRun();
    if (settings.hardRoguelike && kind === 'drown') save.deleteSlot(save.activeSlot);
    input.releaseLock();
    const endUi = createEnding(kind, () => {
      endUi.unmount();
      showMainMenu();
    });
    endUi.mount(root);
    activeUi = endUi;
  };

  const togglePause = () => {
    if (pauseOpen) return;
    pauseOpen = true;
    input.releaseLock();
    const pm = createPauseMenu({
      onResume: () => { pm.unmount(); pauseOpen = false; input.requestLock(canvas); },
      onSettings: () => { pm.unmount(); pauseOpen = false; openSettings(); },
      onMainMenu: () => { pm.unmount(); pauseOpen = false; showMainMenu(); },
      onQuit: () => window.abyss?.app?.quit(),
    });
    pm.mount(root);
  };

  // Prompt proximity — only updates when the nearest target changes.
  let lastPromptKey: string | null = null;
  const updatePrompt = () => {
    if (pauseOpen || tableOpen) return;
    const p = player.position;
    const items = casino.getInteractables();
    let best = null, bestDist = 3.5;
    for (const it of items) {
      const dx = it.position.x - p.x, dz = it.position.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < bestDist) { best = it; bestDist = dist; }
    }
    const key = best ? best.key : null;
    if (key !== lastPromptKey) {
      lastPromptKey = key;
      hud.setPrompt(best ? best.label : null);
    }
  };

  const loop = startLoop({
    hz: 60,
    update(dt) {
      if (pauseOpen || tableOpen || activeUi) return;
      const m = input.consumeMouse();
      fps.applyLook(m.dx, m.dy, settings.invertY);
      fps.update(dt);
      player.update(dt, input.keys);
      updatePrompt();
    },
    render() {
      hud.setFps(loop.stats.fps);
      scene.render();
    },
  });

  // Log diagnostics
  console.log(`[abyss] session started · slot=${save.activeSlot} · renderer=${bundle.isWebGPU ? 'WebGPU' : 'WebGL2'} · preset=${settings.quality}`);

  sessionDispose = () => {
    loop.stop();
    window.removeEventListener('keydown', keyHandler);
    input.dispose();
    hud.dispose();
    fx.dispose();
    bundle.dispose();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  };
}

function persistRun() {
  save.writeSave({
    breath: run.breath,
    gamesPlayed: run.gamesPlayed,
    fragments: run.fragments,
    worldRoom: run.worldRoom,
    lockedIn: run.lockedIn,
    meta: run.meta,
  });
}

boot().catch(err => {
  console.error('[boot] failed', err);
  const bootEl = document.getElementById('boot');
  if (bootEl) {
    (bootEl.querySelector('.sub') as HTMLElement).textContent = 'boot failed — check console';
  }
});
