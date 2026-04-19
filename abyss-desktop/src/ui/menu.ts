/* Main menu — DOM overlay with "Occult Ledger" aesthetic (blackletter
   title + wax-sealed buttons + mezzotint backdrop). Unmounts completely
   when gameplay starts — zero compositor cost once you're in the casino. */

import type { SaveSummary } from '../types.js';

const CSS = `
.am-root {
  position: fixed; inset: 0; z-index: 50;
  display: flex; align-items: center; justify-content: center;
  color: #e8ddbc;
  font-family: 'Cormorant Upright', Georgia, serif;
  background:
    radial-gradient(ellipse 70% 40% at 50% 30%, rgba(196,154,74,0.12), transparent 70%),
    radial-gradient(ellipse 60% 40% at 50% 90%, rgba(138,95,176,0.08), transparent 70%),
    linear-gradient(180deg, #050308 0%, #080614 50%, #040206 100%);
  animation: am-in 0.5s cubic-bezier(0.16,1,0.3,1);
}
@keyframes am-in { from { opacity: 0 } to { opacity: 1 } }
.am-inner { max-width: 580px; width: 92%; text-align: center; position: relative; z-index: 2; }
.am-title {
  font-family: 'UnifrakturMaguntia', 'Cloister Black', serif;
  font-size: clamp(88px, 14vw, 176px);
  font-weight: 400;
  letter-spacing: 0.04em;
  color: #e8ddbc;
  text-shadow: 0 0 50px rgba(196,154,74,0.28), 0 4px 0 rgba(0,0,0,0.6);
  margin-bottom: 6px;
  line-height: 0.95;
}
.am-sub {
  font-style: italic;
  color: #a89972;
  font-size: clamp(13px, 1.3vw, 16px);
  letter-spacing: 0.12em;
  margin-bottom: 48px;
  text-transform: lowercase;
}
.am-btn {
  display: block; width: 100%;
  padding: 14px 24px; margin: 8px 0;
  background: linear-gradient(180deg, rgba(10,6,12,0.78), rgba(4,3,8,0.85));
  border: 1px solid rgba(196,154,74,0.30);
  color: #e8ddbc;
  font-family: 'Cormorant Upright', serif;
  font-size: 17px; font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16,1,0.3,1);
  position: relative;
}
.am-btn::before {
  content: '❦'; position: absolute; left: 14px; top: 50%;
  transform: translateY(-50%);
  color: #c49a4a; font-size: 16px; opacity: 0.5;
  transition: opacity 0.18s;
}
.am-btn:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(36,20,20,0.85), rgba(14,8,12,0.9));
  border-color: rgba(196,154,74,0.7);
  color: #f5eed8;
  transform: translateX(3px);
  box-shadow: 0 0 24px rgba(196,154,74,0.12);
}
.am-btn:hover::before { opacity: 1; }
.am-btn.primary { border-color: rgba(138,95,176,0.55); color: #c7a6ff; }
.am-btn.primary::before { color: #8a5fb0; content: '✠'; }
.am-btn.danger:hover { color: #ff6b8a; border-color: #7a1420; }
.am-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
.am-hint { font-style: italic; font-size: 11px; color: #6b5f40;
  letter-spacing: 0.12em; text-transform: uppercase; margin-top: 4px; }
.am-version { position: absolute; bottom: 18px; right: 26px;
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  color: #5a4e30; opacity: 0.6; letter-spacing: 0.12em; }
.am-slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 10px 0 28px; }
.am-slot {
  padding: 18px 14px;
  background: rgba(6,4,10,0.8);
  border: 1px solid rgba(196,154,74,0.2);
  min-height: 160px;
  cursor: pointer; text-align: left;
  transition: all 0.18s;
  display: flex; flex-direction: column; gap: 6px;
}
.am-slot:hover:not(:disabled) {
  border-color: rgba(196,154,74,0.7);
  background: rgba(14,8,18,0.92);
  transform: translateY(-2px);
}
.am-slot:disabled { opacity: 0.3; cursor: not-allowed; }
.am-slot.empty { opacity: 0.55; font-style: italic; }
.am-slot-num {
  font-family: 'UnifrakturMaguntia', serif; font-size: 14px;
  color: #8a5fb0; letter-spacing: 0.1em;
}
.am-slot-breath {
  font-family: 'UnifrakturMaguntia', serif; font-size: 30px;
  color: #c49a4a;
}
.am-slot-meta { font-size: 13px; color: #8a7a58; margin-top: 2px; }
.am-slot-warn { font-size: 10px; color: #c06a40; letter-spacing: 0.2em;
  text-transform: uppercase; margin-top: auto; }
.am-back { background: none; border: none; color: #6b5f40;
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  letter-spacing: 0.25em; text-transform: uppercase;
  cursor: pointer; padding: 8px; }
.am-back:hover { color: #c49a4a; }
.am-slots-heading {
  font-family: 'UnifrakturMaguntia', serif; font-size: 18px;
  color: #c49a4a; margin-bottom: 14px; letter-spacing: 0.06em;
}
`;

function ensureStyle() {
  if (document.getElementById('am-style')) return;
  const s = document.createElement('style'); s.id = 'am-style';
  s.textContent = CSS; document.head.appendChild(s);
}

function timeAgo(ts?: number | null): string {
  if (!ts) return '';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'moments ago';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export interface MenuOptions {
  version: string;
  listSlots: () => Promise<SaveSummary[]>;
  onNewRun: (slot: number) => void;
  onContinue: (slot: number) => void;
  onSettings: () => void;
  onGallery: () => void;
  onQuit: () => void;
}

export interface MenuHandle {
  element: HTMLElement;
  mount(target?: HTMLElement): void;
  unmount(): void;
}

export function createMainMenu(opts: MenuOptions): MenuHandle {
  ensureStyle();
  const root = document.createElement('div');
  root.className = 'am-root';
  let view: 'main' | 'new' | 'continue' = 'main';
  let slots: SaveSummary[] = [];

  async function refresh() {
    try { slots = await opts.listSlots(); }
    catch { slots = [{ slot: 1, exists: false }, { slot: 2, exists: false }, { slot: 3, exists: false }]; }
    render();
  }

  function btn(cls: string, label: string, hint: string | null, onClick: () => void, disabled = false) {
    const b = document.createElement('button');
    b.className = 'am-btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.disabled = disabled;
    b.onclick = onClick;
    if (hint) {
      const h = document.createElement('div');
      h.className = 'am-hint';
      h.textContent = hint;
      b.appendChild(document.createElement('br'));
      b.appendChild(h);
    }
    return b;
  }

  function slotCard(s: SaveSummary, isNew: boolean) {
    const el = document.createElement('div');
    el.className = 'am-slot' + (s.exists ? '' : ' empty');
    if (s.exists) {
      el.innerHTML = `
        <div class="am-slot-num">SLOT ${s.slot}</div>
        <div class="am-slot-breath">${s.breath ?? '—'} <span style="font-size:11px;color:#8a7a58">breath</span></div>
        <div class="am-slot-meta">Endings · ${(s.endingsReached || []).length} / 8</div>
        <div class="am-slot-meta" style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6b5f40">${timeAgo(s.updatedAt)}</div>
        ${isNew ? '<div class="am-slot-warn">new run overwrites</div>' : ''}
      `;
    } else {
      el.innerHTML = `<div class="am-slot-num">SLOT ${s.slot}</div><div style="margin:auto;color:#5a4e30">— empty —</div>`;
    }
    if (!isNew && !s.exists) { el.style.pointerEvents = 'none'; el.style.opacity = '0.2'; }
    else el.onclick = () => isNew ? opts.onNewRun(s.slot) : opts.onContinue(s.slot);
    return el;
  }

  function render() {
    root.innerHTML = '';
    const inner = document.createElement('div');
    inner.className = 'am-inner';
    root.appendChild(inner);

    if (view === 'main') {
      const title = document.createElement('h1');
      title.className = 'am-title';
      title.textContent = 'Abyss';
      inner.appendChild(title);

      const sub = document.createElement('div');
      sub.className = 'am-sub';
      sub.textContent = 'a casino in the deep · seven tables · one door · your breath in every seat';
      inner.appendChild(sub);

      inner.appendChild(btn('primary', 'New Run', null, () => { view = 'new'; render(); refresh(); }));
      const hasAny = slots.some(s => s.exists);
      inner.appendChild(btn('', 'Continue', null, () => { view = 'continue'; render(); refresh(); }, !hasAny));
      inner.appendChild(btn('', 'Endings', null, opts.onGallery));
      inner.appendChild(btn('', 'Settings', null, opts.onSettings));
      if (window.abyss) inner.appendChild(btn('danger', 'Quit', null, opts.onQuit));
    } else {
      const h = document.createElement('div');
      h.className = 'am-slots-heading';
      h.textContent = view === 'new' ? 'choose a slot · new descent' : 'resume which descent?';
      inner.appendChild(h);
      const grid = document.createElement('div');
      grid.className = 'am-slots';
      slots.forEach(s => grid.appendChild(slotCard(s, view === 'new')));
      inner.appendChild(grid);
      const back = document.createElement('button');
      back.className = 'am-back';
      back.textContent = '← back';
      back.onclick = () => { view = 'main'; render(); };
      inner.appendChild(back);
    }

    const v = document.createElement('div');
    v.className = 'am-version';
    v.textContent = `v${opts.version}`;
    root.appendChild(v);
  }

  render();
  refresh();

  return {
    element: root,
    mount(target = document.body) { target.appendChild(root); },
    unmount() { if (root.parentNode) root.parentNode.removeChild(root); },
  };
}
