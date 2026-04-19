/* Pause menu + settings modal. DOM overlay (visible only when paused);
   the game canvas keeps the GUI HUD. */

import type { AppSettings } from '../types.js';

const CSS = `
.ap-root { position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  background: rgba(4,3,8,0.84);
  animation: ap-in 0.14s ease-out; }
@keyframes ap-in { from { opacity: 0 } to { opacity: 1 } }
.ap-panel { background: linear-gradient(180deg, rgba(10,6,12,0.95), rgba(4,3,8,0.98));
  border: 1px solid rgba(196,154,74,0.3);
  padding: 36px 44px; min-width: 320px; text-align: center;
  box-shadow: 0 0 40px rgba(196,154,74,0.08);
  font-family: 'Cormorant Upright', serif; color: #e8ddbc; }
.ap-title { font-family: 'UnifrakturMaguntia', serif; font-size: 36px;
  letter-spacing: 0.06em; margin-bottom: 20px; }
.ap-btn { display: block; width: 300px; padding: 11px 22px; margin: 6px 0;
  background: rgba(4,3,8,0.7); border: 1px solid rgba(196,154,74,0.22);
  color: #e8ddbc; font-family: 'Cormorant Upright', serif; font-size: 15px;
  letter-spacing: 0.22em; text-transform: uppercase;
  cursor: pointer; transition: all 0.15s; }
.ap-btn:hover { border-color: rgba(196,154,74,0.7); color: #c49a4a; }
.ap-btn.primary { border-color: rgba(138,95,176,0.55); color: #c7a6ff; }
.ap-btn.danger:hover { color: #ff6b8a; border-color: #7a1420; }
.ap-hint { margin-top: 18px; font-size: 11px; letter-spacing: 0.2em;
  color: #6b5f40; font-family: 'JetBrains Mono', monospace; }

.as-panel { background: rgba(6,4,10,0.97); border: 1px solid rgba(196,154,74,0.28);
  width: min(620px, 92vw); max-height: 82vh; overflow-y: auto;
  padding: 28px 32px; font-family: 'Cormorant Upright', serif; color: #e8ddbc; }
.as-title { font-family: 'UnifrakturMaguntia', serif; font-size: 30px;
  letter-spacing: 0.04em; text-align: center; margin-bottom: 24px; }
.as-tabs { display: flex; gap: 2px; margin-bottom: 18px;
  border-bottom: 1px solid rgba(196,154,74,0.15); }
.as-tab { padding: 8px 16px; background: transparent; border: none;
  color: #8a7a58; font-family: 'Cormorant Upright', serif; font-size: 13px;
  letter-spacing: 0.22em; text-transform: uppercase; cursor: pointer; }
.as-tab.active { color: #c49a4a; border-bottom: 2px solid #c49a4a; }
.as-row { margin-bottom: 14px; padding-bottom: 12px;
  border-bottom: 1px solid rgba(196,154,74,0.08); }
.as-label { display: flex; justify-content: space-between; align-items: baseline;
  font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;
  margin-bottom: 6px; color: #e8ddbc; }
.as-row input[type=range] { width: 100%; accent-color: #c49a4a; }
.as-row select { width: 100%; padding: 8px 10px;
  background: rgba(4,3,8,0.9); border: 1px solid rgba(196,154,74,0.3);
  color: #e8ddbc; font-family: 'Cormorant Upright', serif; font-size: 15px; }
.as-row input[type=checkbox] { accent-color: #c49a4a; width: 16px; height: 16px; }
.as-hint { font-size: 12px; font-style: italic; color: #8a7a58; margin-top: 4px; }
.as-footer { display: flex; justify-content: space-between; margin-top: 18px; }
.as-btn { padding: 9px 18px; background: rgba(4,3,8,0.7);
  border: 1px solid rgba(196,154,74,0.28); color: #e8ddbc;
  font-family: 'Cormorant Upright', serif; font-size: 13px;
  letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer;
  transition: all 0.15s; }
.as-btn:hover { border-color: rgba(196,154,74,0.7); color: #c49a4a; }
.as-btn.primary { border-color: rgba(138,95,176,0.55); color: #c7a6ff; }
`;

function ensureStyle() {
  if (document.getElementById('ap-style')) return;
  const s = document.createElement('style'); s.id = 'ap-style';
  s.textContent = CSS; document.head.appendChild(s);
}

export interface PauseHandle { element: HTMLElement; mount(t?: HTMLElement): void; unmount(): void; }

export function createPauseMenu(opts: {
  onResume: () => void;
  onSettings: () => void;
  onMainMenu: () => void;
  onQuit: () => void;
}): PauseHandle {
  ensureStyle();
  const root = document.createElement('div'); root.className = 'ap-root';
  const panel = document.createElement('div'); panel.className = 'ap-panel';
  panel.onclick = (e) => e.stopPropagation();
  root.onclick = opts.onResume;

  const title = document.createElement('div'); title.className = 'ap-title';
  title.textContent = 'PAUSED';
  panel.appendChild(title);

  const btn = (cls: string, label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.className = 'ap-btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.onclick = fn;
    return b;
  };
  panel.appendChild(btn('primary', 'Resume', opts.onResume));
  panel.appendChild(btn('', 'Settings', opts.onSettings));
  panel.appendChild(btn('', 'Main Menu', () => { if (confirm('Return to menu? The run is saved.')) opts.onMainMenu(); }));
  if (window.abyss) panel.appendChild(btn('danger', 'Quit', opts.onQuit));

  const hint = document.createElement('div'); hint.className = 'ap-hint';
  hint.textContent = 'Esc · resume'; panel.appendChild(hint);

  root.appendChild(panel);
  return {
    element: root,
    mount(t = document.body) { t.appendChild(root); },
    unmount() { if (root.parentNode) root.parentNode.removeChild(root); },
  };
}

type SettingsTab = 'display' | 'audio' | 'controls' | 'accessibility' | 'game';
const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'display',       label: 'Display' },
  { id: 'audio',         label: 'Audio' },
  { id: 'controls',      label: 'Controls' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'game',          label: 'Game' },
];

export function createSettings(opts: {
  initial: AppSettings;
  onApply: (s: AppSettings) => void;
  onClose: () => void;
}): PauseHandle {
  ensureStyle();
  const state: AppSettings = JSON.parse(JSON.stringify(opts.initial));
  let active: SettingsTab = 'display';

  const root = document.createElement('div'); root.className = 'ap-root';
  const panel = document.createElement('div'); panel.className = 'as-panel';
  panel.onclick = e => e.stopPropagation();
  root.onclick = opts.onClose;

  const render = () => {
    panel.innerHTML = '';
    const title = document.createElement('div'); title.className = 'as-title';
    title.textContent = 'Settings'; panel.appendChild(title);

    const tabs = document.createElement('div'); tabs.className = 'as-tabs';
    TABS.forEach(t => {
      const b = document.createElement('button');
      b.className = 'as-tab' + (active === t.id ? ' active' : '');
      b.textContent = t.label;
      b.onclick = () => { active = t.id; render(); };
      tabs.appendChild(b);
    });
    panel.appendChild(tabs);

    const body = document.createElement('div');
    panel.appendChild(body);

    const slider = (label: string, key: keyof AppSettings, min: number, max: number, step: number, hint?: string, pct = false) => {
      const row = document.createElement('div'); row.className = 'as-row';
      const lab = document.createElement('div'); lab.className = 'as-label';
      const v = document.createElement('span');
      const fmt = () => pct ? `${Math.round((state[key] as number) * 100)}%` : String(state[key]);
      v.textContent = fmt();
      lab.innerHTML = `<span>${label}</span>`;
      lab.appendChild(v);
      row.appendChild(lab);
      const inp = document.createElement('input');
      inp.type = 'range'; inp.min = String(min); inp.max = String(max); inp.step = String(step);
      inp.value = String(state[key]);
      inp.oninput = () => { (state as any)[key] = parseFloat(inp.value); v.textContent = fmt(); };
      row.appendChild(inp);
      if (hint) { const h = document.createElement('div'); h.className = 'as-hint'; h.textContent = hint; row.appendChild(h); }
      body.appendChild(row);
    };
    const toggle = (label: string, key: keyof AppSettings, hint?: string) => {
      const row = document.createElement('div'); row.className = 'as-row';
      const lab = document.createElement('div'); lab.className = 'as-label';
      lab.style.alignItems = 'center';
      lab.innerHTML = `<span>${label}</span>`;
      const inp = document.createElement('input');
      inp.type = 'checkbox'; inp.checked = !!state[key];
      inp.onchange = () => { (state as any)[key] = inp.checked; };
      lab.appendChild(inp);
      row.appendChild(lab);
      if (hint) { const h = document.createElement('div'); h.className = 'as-hint'; h.textContent = hint; row.appendChild(h); }
      body.appendChild(row);
    };
    const selector = (label: string, key: keyof AppSettings, options: { v: string; l: string }[], hint?: string) => {
      const row = document.createElement('div'); row.className = 'as-row';
      const lab = document.createElement('div'); lab.className = 'as-label';
      lab.innerHTML = `<span>${label}</span>`;
      row.appendChild(lab);
      const sel = document.createElement('select');
      options.forEach(o => {
        const opt = document.createElement('option'); opt.value = o.v; opt.textContent = o.l;
        if (state[key] === o.v) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.onchange = () => { (state as any)[key] = sel.value; };
      row.appendChild(sel);
      if (hint) { const h = document.createElement('div'); h.className = 'as-hint'; h.textContent = hint; row.appendChild(h); }
      body.appendChild(row);
    };

    if (active === 'display') {
      selector('Quality preset', 'quality', [
        { v: 'low', l: 'Low' }, { v: 'medium', l: 'Medium' },
        { v: 'high', l: 'High' }, { v: 'ultra', l: 'Ultra' },
      ], 'Requires restart.');
      slider('Render scale', 'renderScale', 0.5, 1.0, 0.05, 'Sub-sampling multiplier.', true);
      slider('Field of view', 'fov', 60, 100, 1, undefined);
      toggle('Show FPS counter', 'showFps');
    } else if (active === 'audio') {
      slider('Master volume', 'masterVolume', 0, 1, 0.01, undefined, true);
      slider('Music',         'musicVolume',  0, 1, 0.01, undefined, true);
      slider('SFX',           'sfxVolume',    0, 1, 0.01, undefined, true);
      slider('Voice',         'voiceVolume',  0, 1, 0.01, 'Siren whispers.', true);
    } else if (active === 'controls') {
      slider('Mouse sensitivity', 'mouseSensitivity', 0.3, 2.5, 0.05, undefined);
      toggle('Invert Y', 'invertY');
    } else if (active === 'accessibility') {
      toggle('Captions', 'captions');
      toggle('Reduce motion', 'reduceMotion', 'Dampens head-bob + camera shake.');
      toggle('Head bob', 'headBob');
      selector('Colorblind filter', 'colorblind', [
        { v: 'off',     l: 'Off' },
        { v: 'protan',  l: 'Protanopia' },
        { v: 'deutan',  l: 'Deuteranopia' },
        { v: 'tritan',  l: 'Tritanopia' },
      ]);
    } else if (active === 'game') {
      toggle('Hard roguelike', 'hardRoguelike', 'Drown ending wipes the active save slot.');
    }

    const footer = document.createElement('div'); footer.className = 'as-footer';
    const cancel = document.createElement('button'); cancel.className = 'as-btn';
    cancel.textContent = 'Cancel'; cancel.onclick = opts.onClose;
    const apply = document.createElement('button'); apply.className = 'as-btn primary';
    apply.textContent = 'Apply'; apply.onclick = () => { opts.onApply(state); opts.onClose(); };
    footer.appendChild(cancel); footer.appendChild(apply);
    panel.appendChild(footer);
  };

  render();
  root.appendChild(panel);
  return {
    element: root,
    mount(t = document.body) { t.appendChild(root); },
    unmount() { if (root.parentNode) root.parentNode.removeChild(root); },
  };
}
