/* Template game used by Baccarat / Slots / Poker / Dice — bet size +
   pick-an-option + reveal. Consistent UX shape across the four games
   while we defer deeper rule implementations. */

import type { GameContext } from './index.js';

type Variant = 'baccarat' | 'slots' | 'poker' | 'dice';

const VARIANTS: Record<Variant, {
  spinLabel: string;
  prompt: string;
  options: Array<{ label: string; odds: number; pays: number }>;
}> = {
  baccarat: {
    spinLabel: 'Dealing…',
    prompt: 'Banker, Player, or the rare Tie?',
    options: [
      { label: 'Player', odds: 0.47, pays: 1 },
      { label: 'Banker', odds: 0.48, pays: 0.95 },
      { label: 'Tie',    odds: 0.08, pays: 8 },
    ],
  },
  slots: {
    spinLabel: 'The glyphs fall…',
    prompt: 'Pull the handle.',
    options: [{ label: 'Pull', odds: 0.28, pays: 1.2 }],
  },
  poker: {
    spinLabel: 'Cards burn…',
    prompt: 'Raise, call, or fold?',
    options: [
      { label: 'Call',  odds: 0.46, pays: 1 },
      { label: 'Raise', odds: 0.33, pays: 2 },
      { label: 'Bluff', odds: 0.20, pays: 3 },
    ],
  },
  dice: {
    spinLabel: 'The bones tumble…',
    prompt: 'Call your roll.',
    options: [
      { label: 'Under 7', odds: 0.41, pays: 1 },
      { label: 'Seven',   odds: 0.15, pays: 4 },
      { label: 'Over 7',  odds: 0.41, pays: 1 },
    ],
  },
};

export function playSimple(ctx: GameContext, variant: Variant) {
  const cfg = VARIANTS[variant];
  let bet = 25;
  let phase: 'bet' | 'spin' = 'bet';
  let last: { label: string; delta: number } | null = null;

  const render = () => {
    ctx.body.innerHTML = '';
    const p = document.createElement('div');
    p.style.cssText = 'font-family:"UnifrakturMaguntia",serif;color:#c7a6ff;margin-bottom:14px;font-size:18px';
    p.textContent = cfg.prompt;
    ctx.body.appendChild(p);

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
      const r = document.createElement('div');
      r.style.cssText = `text-align:center;font-family:"UnifrakturMaguntia",serif;font-size:20px;margin-bottom:14px;color:${last.delta > 0 ? '#c49a4a' : '#ff6b8a'}`;
      r.textContent = (last.delta > 0 ? `+${last.delta}` : String(last.delta)) + '  ·  ' + last.label;
      ctx.body.appendChild(r);
    }

    const opts = document.createElement('div');
    opts.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
    cfg.options.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'at-btn primary'; b.textContent = opt.label;
      b.disabled = phase !== 'bet' || ctx.getBreath() < bet;
      b.onclick = () => play(opt);
      opts.appendChild(b);
    });
    ctx.body.appendChild(opts);

    const leaveRow = document.createElement('div');
    leaveRow.style.cssText = 'margin-top:20px;text-align:center';
    const leave = document.createElement('button');
    leave.className = 'at-btn danger'; leave.textContent = 'Leave the table';
    leave.onclick = ctx.onClose;
    leaveRow.appendChild(leave);
    ctx.body.appendChild(leaveRow);
  };

  const play = (opt: { label: string; odds: number; pays: number }) => {
    phase = 'spin';
    const spin = document.createElement('div');
    spin.style.cssText = 'text-align:center;padding:30px;font-family:"UnifrakturMaguntia",serif;color:#c7a6ff;font-size:22px';
    spin.textContent = cfg.spinLabel;
    ctx.body.innerHTML = ''; ctx.body.appendChild(spin);
    setTimeout(() => {
      const won = Math.random() < opt.odds * ctx.edgeBias;
      const delta = won ? Math.round(bet * opt.pays) : -bet;
      last = { label: won ? opt.label + ' · won' : opt.label + ' · lost', delta };
      ctx.onResult(delta, won ? 'win' : 'lose');
      phase = 'bet'; render();
    }, 900);
  };

  render();
}
