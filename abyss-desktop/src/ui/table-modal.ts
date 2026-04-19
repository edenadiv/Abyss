/* Table modal — one DOM overlay for all seven games. The game's play
   function renders into `body`; modal owns header/framing/breath readout. */

const CSS = `
.at-root { position: fixed; inset: 0; z-index: 80;
  display: flex; align-items: center; justify-content: center;
  background: rgba(4,3,8,0.82);
  font-family: 'Cormorant Upright', serif; color: #e8ddbc;
  animation: at-in 0.14s ease-out; }
@keyframes at-in { from { opacity: 0 } to { opacity: 1 } }
.at-panel { background: linear-gradient(180deg, rgba(10,6,12,0.96), rgba(6,4,10,0.98));
  border: 1px solid rgba(196,154,74,0.3);
  width: min(760px, 96vw); max-height: 90vh; overflow: auto;
  padding: 28px 32px; box-shadow: 0 0 40px rgba(196,154,74,0.08); }
.at-header { display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(196,154,74,0.15); padding-bottom: 14px; margin-bottom: 18px; }
.at-title { font-family: 'UnifrakturMaguntia', serif; font-size: 28px;
  letter-spacing: 0.06em; color: #e8ddbc; }
.at-close { background: none; border: none; color: #8a7a58;
  font-size: 30px; cursor: pointer; padding: 0 6px; line-height: 1; }
.at-close:hover { color: #ff6b8a; }
.at-breath { font-family: 'UnifrakturMaguntia', serif; color: #c49a4a; font-size: 18px; }

.at-btn { padding: 10px 20px; margin: 4px;
  background: rgba(4,3,8,0.7); border: 1px solid rgba(196,154,74,0.3);
  color: #e8ddbc; font-family: 'Cormorant Upright', serif;
  font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase;
  cursor: pointer; transition: all 0.15s; }
.at-btn:hover { border-color: rgba(196,154,74,0.7); color: #c49a4a; }
.at-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.at-btn.primary { border-color: rgba(138,95,176,0.55); color: #c7a6ff; }
.at-btn.danger { border-color: rgba(196,69,93,0.55); color: #ff6b8a; }
.at-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
.at-chip { width: 54px; height: 54px; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-family: 'UnifrakturMaguntia', serif; font-size: 18px;
  border: 3px solid rgba(196,154,74,0.4);
  transition: transform 0.1s; }
.at-chip:hover { transform: translateY(-2px) scale(1.05); }
.at-cards { display: flex; gap: 6px; margin: 12px 0; min-height: 100px; }
.at-card { width: 62px; height: 90px; border-radius: 6px;
  background: #f5eed8; color: #1a0e0a; border: 1px solid #8a7050;
  display: flex; align-items: center; justify-content: center;
  font-family: serif; font-size: 22px; font-weight: bold;
  box-shadow: 2px 3px 6px rgba(0,0,0,0.45); }
.at-card.red { color: #7a1420; }
.at-card.back { background: linear-gradient(135deg, #1c1022, #3a1830);
  color: #c49a4a; }
.at-total { font-family: 'UnifrakturMaguntia', serif; font-size: 15px;
  letter-spacing: 0.12em; color: #8a7a58; margin-top: 4px; }
.at-board { background: rgba(10,6,12,0.6); padding: 16px 18px;
  border: 1px solid rgba(196,154,74,0.12); margin-bottom: 14px; }
`;

function ensureStyle() {
  if (document.getElementById('at-style')) return;
  const s = document.createElement('style'); s.id = 'at-style';
  s.textContent = CSS; document.head.appendChild(s);
}

export interface TableModalHandle {
  element: HTMLElement;
  body: HTMLElement;
  updateBreath(): void;
  mount(t?: HTMLElement): void;
  unmount(): void;
}

export function createTableModal(opts: {
  title: string;
  breathRef: () => number;
  onClose: () => void;
}): TableModalHandle {
  ensureStyle();
  const root = document.createElement('div'); root.className = 'at-root';
  const panel = document.createElement('div'); panel.className = 'at-panel';
  panel.onclick = (e) => e.stopPropagation();
  root.onclick = opts.onClose;

  const header = document.createElement('div'); header.className = 'at-header';
  const titleEl = document.createElement('div'); titleEl.className = 'at-title'; titleEl.textContent = opts.title;
  const right = document.createElement('div'); right.style.cssText = 'display:flex;align-items:center;gap:18px';
  const breathEl = document.createElement('div'); breathEl.className = 'at-breath';
  const close = document.createElement('button'); close.className = 'at-close'; close.textContent = '×'; close.onclick = opts.onClose;
  right.appendChild(breathEl); right.appendChild(close);
  header.appendChild(titleEl); header.appendChild(right);
  panel.appendChild(header);

  const body = document.createElement('div'); panel.appendChild(body);

  const updateBreath = () => { breathEl.textContent = `Breath · ${opts.breathRef()}`; };
  updateBreath();

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') opts.onClose(); };
  window.addEventListener('keydown', onKey);

  root.appendChild(panel);
  return {
    element: root, body, updateBreath,
    mount(t = document.body) { t.appendChild(root); },
    unmount() { window.removeEventListener('keydown', onKey); if (root.parentNode) root.parentNode.removeChild(root); },
  };
}
