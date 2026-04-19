/* Global types — the Electron preload bridge. */

export interface AbyssApi {
  env: {
    isElectron: true;
    platform: string;
    version(): Promise<string>;
    userDataPath(): Promise<string>;
  };
  app: {
    quit(): Promise<void>;
    minimize(): void;
    toggleFullscreen(): void;
  };
  saves: {
    load(slot: number): Promise<RunSave | null>;
    save(slot: number, data: RunSave): Promise<boolean>;
    list(): Promise<SaveSummary[]>;
    delete(slot: number): Promise<boolean>;
  };
  settings: {
    load(): Promise<Partial<AppSettings> | null>;
    save(data: AppSettings): Promise<boolean>;
  };
  steam: {
    isRunning(): Promise<boolean>;
    activateAchievement(id: string): Promise<boolean>;
    setRichPresence(key: string, value: string): Promise<boolean>;
    clearRichPresence(): Promise<boolean>;
    appId(): Promise<number>;
  };
  dialog: {
    showMessage(options: MessageBoxOptions): Promise<MessageBoxReturnValue>;
  };
}

// Shapes mirrored from electron's types so the renderer stays framework-free.
export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}
export interface MessageBoxReturnValue {
  response: number;
  checkboxChecked?: boolean;
}

declare global {
  interface Window { abyss?: AbyssApi; }
}

export interface SaveSummary {
  slot: number;
  exists: boolean;
  updatedAt?: number | null;
  breath?: number | null;
  scene?: string | null;
  room?: string | null;
  totalRuns?: number;
  endingsReached?: string[];
  playerName?: string | null;
}

export interface RunSave {
  schemaVersion?: number;
  updatedAt?: number;
  scene?: string;
  breath?: number;
  gamesPlayed?: number;
  worldRoom?: string;
  fragments?: string[];
  trinkets?: { id: string; charges: number }[];
  mirrorUnlocked?: boolean;
  revelationForeclosed?: boolean;
  lockedIn?: boolean;
  meta?: PlayerMeta;
}

export interface PlayerMeta {
  deaths: number;
  totalRuns: number;
  handsPlayedEver: number;
  breathsSurrendered: number;
  maxBreathEver: number;
  fragmentsEverFound: string[];
  endingsReached: string[];
  hasSeenRevelation: boolean;
  hasSeenMirror: boolean;
  hasSeenGhost: boolean;
  creditsSeen: boolean;
  lastDeathAt: number | null;
  playerName: string | null;
}

export interface AppSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  renderScale: number;          // 0.5 – 1.0
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  mouseSensitivity: number;
  invertY: boolean;
  fov: number;
  showFps: boolean;
  captions: boolean;
  reduceMotion: boolean;
  colorblind: 'off' | 'protan' | 'deutan' | 'tritan';
  headBob: boolean;
  hardRoguelike: boolean;
  activeSlot: number;
}

export const META_DEFAULTS: PlayerMeta = {
  deaths: 0,
  totalRuns: 0,
  handsPlayedEver: 0,
  breathsSurrendered: 0,
  maxBreathEver: 0,
  fragmentsEverFound: [],
  endingsReached: [],
  hasSeenRevelation: false,
  hasSeenMirror: false,
  hasSeenGhost: false,
  creditsSeen: false,
  lastDeathAt: null,
  playerName: null,
};

export const SETTINGS_DEFAULTS: AppSettings = {
  quality: 'high',         // M4 Max can handle high by default
  renderScale: 1.0,
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  voiceVolume: 0.9,
  mouseSensitivity: 1.0,
  invertY: false,
  fov: 76,
  showFps: false,
  captions: true,
  reduceMotion: false,
  colorblind: 'off',
  headBob: true,
  hardRoguelike: false,
  activeSlot: 1,
};

export type Scene =
  | 'boot' | 'menu' | 'settings'
  | 'casino' | 'pawnshop' | 'dressing' | 'confessional'
  | 'table' | 'ending';

export type EndingKind =
  | 'drown' | 'escape' | 'house' | 'ghost'
  | 'revelation' | 'mirror' | 'sovereign' | 'walkAway';

export type Tier = 'easy' | 'normal' | 'hard' | 'rigged' | 'cruel';
export type OutfitTier = 'soft' | 'chain' | 'teeth' | 'hero';
