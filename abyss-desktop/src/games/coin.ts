/* The Coin — heads or tails. Slight house edge via edgeBias. */

import type { GameContext } from './index.js';

export function playCoin(ctx: GameContext) {
  let bet = 25;
  let phase: 'bet' | 'flip' | 'done' = 'bet';
  let last: { face: string; delta: number } | null = null;

  const render = () => {
    ctx.body.innerHTML = '';
    const intro = document.createElement('div');
    intro.style.cssText = 'font-family:"UnifrakturMaguntia",serif;color:#c7a6ff;margin-bottom:16px;font-size:18px';
    intro.textContent = 'A single coin. Heads or tails.';
    ctx.body.appendChild(intro);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:14px;margin-bottom:18px';
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:"UnifrakturMaguntia",serif;color:#c49a4a;min-width:160px;font-size:17px';
    lbl.textContent = `Bet · ${bet} breath`;
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '5'; slider.max = String(Math.max(5, ctx.getBreath()));
    slider.step = '5'; slider.value = String(Math.min(bet, Math.max(5, ctx.getBreath())));
    slider.style.cssText = 'flex:1;accent-color:#c49a4a';
    slider.oninput = () => { bet = parseInt(slider.value, 10); lbl.textContent = `Bet · ${bet} breath`; };
    row.appendChild(lbl); row.appendChild(slider);
    ctx.body.appendChild(row);

    if (last) {
      const face = document.createElement('div');
      face.style.cssText = `font-family:"UnifrakturMaguntia",serif;font-size:44px;text-align:center;color:#e8ddbc;letter-spacing:0.1em;margin:18px 0 6px`;
      face.textContent = last.face.toUpperCase();
      ctx.body.appendChild(face);
      const out = document.createElement('div');
      out.style.cssText = `font-family:"UnifrakturMaguntia",serif;text-align:center;font-size:20px;color:${last.delta > 0 ? '#c49a4a' : '#ff6b8a'};margin-bottom:14px`;
      out.textContent = last.delta > 0 ? `+${last.delta}` : last.delta === 0 ? 'PUSH' : String(last.delta);
      ctx.body.appendChild(out);
    }

    const choices = document.createElement('div');
    choices.style.cssText = 'display:flex;gap:8px;justify-content:center';
    ['heads', 'tails'].forEach(face => {
      const b = document.createElement('button');
      b.className = 'at-btn primary'; b.textContent = face.toUpperCase();
      b.disabled = ctx.getBreath() < bet || phase !== 'bet';
      b.onclick = () => {
        phase = 'flip'; render();
        setTimeout(() => {
          // Slight house edge scaled by edgeBias — at easy/normal this is 50/50,
          // at cruel the player wins closer to 42/58.
          const winProb = 0.5 * ctx.edgeBias;
          const won = Math.random() < winProb;
          const actual = won ? face : face === 'heads' ? 'tails' : 'heads';
          const delta = won ? bet : -bet;
          last = { face: actual, delta };
          phase = 'done';
          ctx.onResult(delta, won ? 'win' : 'lose');
          phase = 'bet'; render();
        }, 700);
      };
      choices.appendChild(b);
    });
    ctx.body.appendChild(choices);

    const leaveRow = document.createElement('div');
    leaveRow.style.cssText = 'margin-top:22px;text-align:center';
    const leave = document.createElement('button');
    leave.className = 'at-btn danger'; leave.textContent = 'Leave the table';
    leave.onclick = ctx.onClose;
    leaveRow.appendChild(leave);
    ctx.body.appendChild(leaveRow);
  };

  render();
}
