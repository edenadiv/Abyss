/* Omens Wheel — Red / Black / Odd / Even / Low / High / single 0-36.
   European single-zero. */

import type { GameContext } from './index.js';

const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

interface Bet { kind: 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' | 'number'; value?: number; amount: number; }

export function playRoulette(ctx: GameContext) {
  let bets: Bet[] = [];
  let phase: 'bet' | 'spin' | 'done' = 'bet';
  let last: number | null = null;
  let chip = 10;

  const mkBtn = (label: string, onClick: () => void, kind?: string) => {
    const b = document.createElement('button');
    b.className = 'at-btn' + (kind ? ' ' + kind : '');
    b.textContent = label; b.onclick = onClick;
    return b;
  };

  const render = () => {
    ctx.body.innerHTML = '';

    if (last != null) {
      const rbox = document.createElement('div'); rbox.className = 'at-board';
      rbox.style.textAlign = 'center';
      const face = document.createElement('div');
      face.style.cssText = `font-family:"UnifrakturMaguntia",serif;font-size:48px;color:${last === 0 ? '#c7a6ff' : RED.has(last) ? '#ff6b8a' : '#e8ddbc'};margin-bottom:4px`;
      face.textContent = String(last);
      rbox.appendChild(face);
      const sub = document.createElement('div');
      sub.className = 'at-total';
      sub.textContent = last === 0 ? 'ZERO' : `${RED.has(last) ? 'RED' : 'BLACK'} · ${last % 2 === 0 ? 'EVEN' : 'ODD'}`;
      rbox.appendChild(sub);
      ctx.body.appendChild(rbox);
    }

    if (bets.length) {
      const list = document.createElement('div');
      list.style.cssText = 'margin-bottom:12px;color:#a89972;font-size:13px';
      list.innerHTML = bets.map(b => `<div>${b.kind}${b.value != null ? ' · ' + b.value : ''} — <span style="color:#c49a4a">${b.amount}</span></div>`).join('');
      ctx.body.appendChild(list);
    }

    if (phase === 'bet') {
      const chips = document.createElement('div');
      chips.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;align-items:center';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:13px;color:#a89972;letter-spacing:0.15em;margin-right:8px';
      lbl.textContent = 'CHIP:';
      chips.appendChild(lbl);
      [5, 10, 25, 50, 100].forEach(v => {
        const b = document.createElement('button');
        b.className = 'at-btn' + (chip === v ? ' primary' : '');
        b.style.padding = '6px 14px';
        b.textContent = String(v);
        b.onclick = () => { chip = v; render(); };
        chips.appendChild(b);
      });
      ctx.body.appendChild(chips);

      const staked = bets.reduce((s, b) => s + b.amount, 0);
      const place = (bet: Omit<Bet, 'amount'>) => {
        if (staked + chip > ctx.getBreath()) return;
        bets.push({ ...bet, amount: chip });
        render();
      };

      const line = document.createElement('div');
      line.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px';
      line.appendChild(mkBtn('Red',    () => place({ kind: 'red' })));
      line.appendChild(mkBtn('Black',  () => place({ kind: 'black' })));
      line.appendChild(mkBtn('Odd',    () => place({ kind: 'odd' })));
      line.appendChild(mkBtn('Even',   () => place({ kind: 'even' })));
      line.appendChild(mkBtn('1-18',   () => place({ kind: 'low' })));
      line.appendChild(mkBtn('19-36',  () => place({ kind: 'high' })));
      ctx.body.appendChild(line);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(12,1fr);gap:2px;margin-bottom:14px';
      for (let n = 0; n <= 36; n++) {
        const b = document.createElement('button');
        b.className = 'at-btn';
        b.style.cssText = 'padding:5px;margin:0;font-size:11px;' +
          (n === 0 ? 'color:#c7a6ff' : RED.has(n) ? 'color:#ff6b8a' : '');
        b.textContent = String(n);
        b.onclick = () => place({ kind: 'number', value: n });
        grid.appendChild(b);
      }
      ctx.body.appendChild(grid);

      const ctrls = document.createElement('div');
      const spin = document.createElement('button');
      spin.className = 'at-btn primary'; spin.textContent = 'Spin the wheel';
      spin.disabled = bets.length === 0; spin.onclick = doSpin;
      const clear = document.createElement('button');
      clear.className = 'at-btn'; clear.textContent = 'Clear';
      clear.disabled = bets.length === 0; clear.onclick = () => { bets = []; render(); };
      const leave = document.createElement('button');
      leave.className = 'at-btn danger'; leave.textContent = 'Leave';
      leave.onclick = ctx.onClose;
      ctrls.appendChild(spin); ctrls.appendChild(clear); ctrls.appendChild(leave);
      ctx.body.appendChild(ctrls);
    } else if (phase === 'spin') {
      const s = document.createElement('div');
      s.style.cssText = 'text-align:center;padding:40px;font-family:"UnifrakturMaguntia",serif;color:#c7a6ff;font-size:24px';
      s.textContent = 'the wheel turns…';
      ctx.body.appendChild(s);
    } else if (phase === 'done') {
      const again = document.createElement('button');
      again.className = 'at-btn primary'; again.textContent = 'Place new bets';
      again.onclick = () => { bets = []; phase = 'bet'; render(); };
      const leave = document.createElement('button');
      leave.className = 'at-btn danger'; leave.textContent = 'Leave the table';
      leave.onclick = ctx.onClose;
      ctx.body.appendChild(again);
      ctx.body.appendChild(leave);
    }
  };

  const doSpin = () => {
    phase = 'spin'; render();
    setTimeout(() => {
      const result = Math.floor(Math.random() * 37);
      last = result;
      let delta = 0;
      const isRed = RED.has(result);
      const isEven = result !== 0 && result % 2 === 0;
      for (const b of bets) {
        if (b.kind === 'number' && b.value === result) delta += b.amount * 35;
        else if (b.kind === 'red' && isRed) delta += b.amount;
        else if (b.kind === 'black' && !isRed && result !== 0) delta += b.amount;
        else if (b.kind === 'odd' && result !== 0 && !isEven) delta += b.amount;
        else if (b.kind === 'even' && isEven) delta += b.amount;
        else if (b.kind === 'low' && result >= 1 && result <= 18) delta += b.amount;
        else if (b.kind === 'high' && result >= 19 && result <= 36) delta += b.amount;
        else delta -= b.amount;
      }
      phase = 'done';
      ctx.onResult(delta, delta > 0 ? 'win' : 'lose');
      render();
    }, 1100);
  };

  render();
}
