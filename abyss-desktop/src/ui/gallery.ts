/* Endings gallery — grid of all 8, unreached entries show a ? hint. */

import { ENDING_CARDS } from '../content/endings.js';
import type { EndingKind } from '../types.js';

const CSS = `
.ag-root { position: fixed; inset: 0; z-index: 70;
  display: flex; align-items: center; justify-content: center;
  background: rgba(4,3,8,0.88);
  font-family: 'Cormorant Upright', serif; color: #e8ddbc;
  animation: ag-in 0.2s ease-out; }
@keyframes ag-in { from { opacity: 0 } to { opacity: 1 } }
.ag-panel { background: linear-gradient(180deg, rgba(8,5,14,0.97), rgba(4,3,8,0.98));
  border: 1px solid rgba(196,154,74,0.3);
  width: min(920px, 94vw); max-height: 90vh; overflow-y: auto; padding: 28px 32px; }
.ag-head { display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px; border-bottom: 1px solid rgba(196,154,74,0.15); padding-bottom: 14px; }
.ag-title { font-family: 'UnifrakturMaguntia', serif; font-size: 32px; letter-spacing: 0.06em; }
.ag-prog { font-family: 'JetBrains Mono', monospace; color: #c49a4a; font-size: 14px; }
.ag-close { background: none; border: none; color: #8a7a58; font-size: 28px; cursor: pointer; }
.ag-close:hover { color: #ff6b8a; }
.ag-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.ag-card { padding: 16px; background: rgba(6,4,10,0.75);
  border: 1px solid rgba(196,154,74,0.18); min-height: 140px;
  transition: all 0.2s; }
.ag-card.seen { border-color: rgba(138,95,176,0.45); }
.ag-card.locked { opacity: 0.45; font-style: italic; }
.ag-num { font-family: 'JetBrains Mono', monospace; font-size: 10px;
  letter-spacing: 0.3em; color: #8a5fb0; margin-bottom: 8px; text-transform: uppercase; }
.ag-label { font-family: 'UnifrakturMaguntia', serif; font-size: 20px;
  color: #e8ddbc; margin-bottom: 8px; }
.ag-hint { font-size: 14px; color: #8a7a58; line-height: 1.4; }
`;

function ensureStyle() {
  if (document.getElementById('ag-style')) return;
  const s = document.createElement('style'); s.id = 'ag-style';
  s.textContent = CSS; document.head.appendChild(s);
}

export interface GalleryHandle { element: HTMLElement; mount(t?: HTMLElement): void; unmount(): void; }

export function createGallery(reached: EndingKind[], onClose: () => void): GalleryHandle {
  ensureStyle();
  const root = document.createElement('div'); root.className = 'ag-root';
  root.onclick = onClose;
  const panel = document.createElement('div'); panel.className = 'ag-panel';
  panel.onclick = e => e.stopPropagation();

  const head = document.createElement('div'); head.className = 'ag-head';
  head.innerHTML = `
    <div class="ag-title">Endings</div>
    <div class="ag-prog">${reached.length} / ${ENDING_CARDS.length}</div>
  `;
  const close = document.createElement('button'); close.className = 'ag-close'; close.textContent = '×';
  close.onclick = onClose; head.appendChild(close);
  panel.appendChild(head);

  const grid = document.createElement('div'); grid.className = 'ag-grid';
  ENDING_CARDS.forEach(card => {
    const seen = reached.includes(card.id);
    const el = document.createElement('div');
    el.className = 'ag-card ' + (seen ? 'seen' : 'locked');
    el.innerHTML = `
      <div class="ag-num">ending · ${card.id}</div>
      <div class="ag-label">${seen ? card.label : '???'}</div>
      <div class="ag-hint">${seen ? card.hint : 'undiscovered — play to unlock'}</div>
    `;
    grid.appendChild(el);
  });
  panel.appendChild(grid);

  root.appendChild(panel);
  return {
    element: root,
    mount(t = document.body) { t.appendChild(root); },
    unmount() { if (root.parentNode) root.parentNode.removeChild(root); },
  };
}
