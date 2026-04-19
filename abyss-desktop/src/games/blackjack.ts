/* Blackjack — standard rules, dealer stands on 17, BJ pays 3:2. */

import { buildDeck, shuffle, handValue, type Card } from '../content/deck.js';
import type { GameContext } from './index.js';

function renderCard(card: Card, faceDown = false): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'at-card' + (faceDown ? ' back' : card.red ? ' red' : '');
  el.textContent = faceDown ? '◆' : `${card.rank}${card.suit}`;
  return el;
}

export function playBlackjack(ctx: GameContext) {
  let deck = shuffle(buildDeck(4));
  let bet = 0;
  let phase: 'bet' | 'play' | 'dealer' | 'done' = 'bet';
  let player: Card[] = [];
  let dealer: Card[] = [];

  const render = () => {
    ctx.body.innerHTML = '';

    // Dealer
    const dBoard = document.createElement('div'); dBoard.className = 'at-board';
    dBoard.innerHTML = '<div class="at-total">DEALER</div>';
    const dRow = document.createElement('div'); dRow.className = 'at-cards';
    dealer.forEach((c, i) => dRow.appendChild(renderCard(c, phase === 'play' && i === 1)));
    dBoard.appendChild(dRow);
    const dTot = document.createElement('div'); dTot.className = 'at-total';
    dTot.textContent = phase === 'play' && dealer.length ? `Showing · ${handValue([dealer[0]])}` : dealer.length ? `Total · ${handValue(dealer)}` : '';
    dBoard.appendChild(dTot);
    ctx.body.appendChild(dBoard);

    // Player
    const pBoard = document.createElement('div'); pBoard.className = 'at-board';
    pBoard.innerHTML = '<div class="at-total">YOU</div>';
    const pRow = document.createElement('div'); pRow.className = 'at-cards';
    player.forEach(c => pRow.appendChild(renderCard(c)));
    pBoard.appendChild(pRow);
    const pTot = document.createElement('div'); pTot.className = 'at-total';
    pTot.textContent = player.length ? `Total · ${handValue(player)}` : '';
    pBoard.appendChild(pTot);
    ctx.body.appendChild(pBoard);

    // Controls
    if (phase === 'bet') {
      const chipRow = document.createElement('div'); chipRow.className = 'at-chip-row';
      const hint = document.createElement('div');
      hint.style.cssText = 'font-family:"UnifrakturMaguntia",serif;color:#c49a4a;font-size:16px;margin-bottom:6px';
      hint.textContent = `Bet · ${bet} breath`;
      ctx.body.appendChild(hint);
      [5, 10, 25, 50].forEach(v => {
        const c = document.createElement('div');
        c.className = 'at-chip';
        c.style.background = v === 5 ? '#1a3a5a' : v === 10 ? '#3a1a1a' : v === 25 ? '#0d2d1f' : '#3a2a10';
        c.textContent = String(v);
        c.onclick = () => {
          if (ctx.getBreath() < bet + v) return;
          bet += v; render();
        };
        chipRow.appendChild(c);
      });
      ctx.body.appendChild(chipRow);

      const ctrls = document.createElement('div');
      const deal = document.createElement('button'); deal.className = 'at-btn primary'; deal.textContent = 'Deal';
      deal.disabled = bet < 5;
      deal.onclick = () => {
        phase = 'play';
        player = [deck.pop()!, deck.pop()!];
        dealer = [deck.pop()!, deck.pop()!];
        render();
        if (handValue(player) === 21) setTimeout(() => finish('blackjack'), 600);
      };
      const clear = document.createElement('button'); clear.className = 'at-btn'; clear.textContent = 'Clear';
      clear.disabled = bet === 0; clear.onclick = () => { bet = 0; render(); };
      const leave = document.createElement('button'); leave.className = 'at-btn danger'; leave.textContent = 'Leave';
      leave.onclick = ctx.onClose;
      ctrls.appendChild(deal); ctrls.appendChild(clear); ctrls.appendChild(leave);
      ctx.body.appendChild(ctrls);
    } else if (phase === 'play') {
      const ctrls = document.createElement('div');
      const hit = document.createElement('button'); hit.className = 'at-btn'; hit.textContent = 'Hit';
      hit.onclick = () => {
        player.push(deck.pop()!);
        if (handValue(player) > 21) finish('bust');
        else render();
      };
      const stand = document.createElement('button'); stand.className = 'at-btn primary'; stand.textContent = 'Stand';
      stand.onclick = () => { phase = 'dealer'; dealerPlay(); };
      ctrls.appendChild(hit); ctrls.appendChild(stand);
      ctx.body.appendChild(ctrls);
    } else if (phase === 'done') {
      const ctrls = document.createElement('div');
      const again = document.createElement('button'); again.className = 'at-btn primary'; again.textContent = 'Another hand';
      again.onclick = () => {
        bet = 0; phase = 'bet'; player = []; dealer = [];
        if (deck.length < 20) deck = shuffle(buildDeck(4));
        render();
      };
      const leave = document.createElement('button'); leave.className = 'at-btn danger'; leave.textContent = 'Leave the table';
      leave.onclick = ctx.onClose;
      ctrls.appendChild(again); ctrls.appendChild(leave);
      ctx.body.appendChild(ctrls);
    }
  };

  const dealerPlay = () => {
    const step = () => {
      render();
      const dv = handValue(dealer);
      if (dv < 17) setTimeout(() => { dealer.push(deck.pop()!); step(); }, 450);
      else {
        const pv = handValue(player);
        if (dv > 21 || pv > dv) finish('win');
        else if (pv < dv) finish('lose');
        else finish('push');
      }
    };
    step();
  };

  const finish = (outcome: 'blackjack' | 'win' | 'lose' | 'push' | 'bust') => {
    phase = 'done';
    let delta = 0;
    if (outcome === 'blackjack') delta = Math.round(bet * 1.5);
    else if (outcome === 'win') delta = bet;
    else if (outcome === 'lose' || outcome === 'bust') delta = -bet;
    ctx.onResult(delta, outcome);
    render();
  };

  render();
}
