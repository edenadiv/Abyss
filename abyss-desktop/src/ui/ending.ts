/* Ending cinematic — a full-viewport painting backdrop with blackletter
   title + one-line monologue. Click anywhere to return to menu. */

import { ENDING_CARDS } from '../content/endings.js';
import { paintingUrl } from '../content/art.js';
import type { EndingKind } from '../types.js';

const CSS = `
.ae-root { position: fixed; inset: 0; z-index: 90;
  display: flex; align-items: center; justify-content: center;
  background: #020104; color: #e8ddbc;
  font-family: 'Cormorant Upright', serif;
  animation: ae-in 1.2s ease-out;
  cursor: pointer;
  overflow: hidden;
}
@keyframes ae-in { from { opacity: 0 } to { opacity: 1 } }
.ae-bg { position: absolute; inset: 0;
  background-position: center; background-size: cover;
  filter: brightness(0.28) saturate(0.75) blur(0.5px); }
.ae-vignette { position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, rgba(2,1,4,0.85) 80%); }
.ae-inner { position: relative; z-index: 2; text-align: center; max-width: 720px; padding: 0 32px; }
.ae-kind { font-family: 'JetBrains Mono', monospace; font-size: 12px;
  letter-spacing: 0.4em; color: #8a5fb0; margin-bottom: 16px; text-transform: uppercase; }
.ae-title { font-family: 'UnifrakturMaguntia', serif; font-size: clamp(54px, 8vw, 96px);
  letter-spacing: 0.04em; margin-bottom: 36px; line-height: 1;
  text-shadow: 0 0 40px rgba(196,154,74,0.3); }
.ae-line { font-style: italic; color: #c4b082; font-size: clamp(15px, 1.4vw, 20px);
  line-height: 1.55; max-width: 560px; margin: 0 auto; }
.ae-hint { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%);
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  letter-spacing: 0.3em; color: #5a4e30; animation: ae-pulse 2s ease-in-out infinite; }
@keyframes ae-pulse { 0%,100% { opacity: 0.35 } 50% { opacity: 0.75 } }
`;

function ensureStyle() {
  if (document.getElementById('ae-style')) return;
  const s = document.createElement('style'); s.id = 'ae-style';
  s.textContent = CSS; document.head.appendChild(s);
}

export interface EndingHandle { element: HTMLElement; mount(t?: HTMLElement): void; unmount(): void; }

export function createEnding(kind: EndingKind, onDone: () => void): EndingHandle {
  ensureStyle();
  const card = ENDING_CARDS.find(c => c.id === kind) ?? ENDING_CARDS[0];
  const root = document.createElement('div'); root.className = 'ae-root';

  const bg = document.createElement('div'); bg.className = 'ae-bg';
  const url = paintingUrl(card.paintingSlug);
  if (url) bg.style.backgroundImage = `url('${url}')`;
  root.appendChild(bg);

  const vg = document.createElement('div'); vg.className = 'ae-vignette';
  root.appendChild(vg);

  const inner = document.createElement('div'); inner.className = 'ae-inner';
  inner.innerHTML = `
    <div class="ae-kind">ending — ${card.id}</div>
    <div class="ae-title">${card.label}</div>
    <div class="ae-line">${card.closingLine}</div>
  `;
  root.appendChild(inner);

  const hint = document.createElement('div'); hint.className = 'ae-hint';
  hint.textContent = 'click to return to the menu';
  root.appendChild(hint);

  root.onclick = onDone;

  return {
    element: root,
    mount(t = document.body) { t.appendChild(root); },
    unmount() { if (root.parentNode) root.parentNode.removeChild(root); },
  };
}
