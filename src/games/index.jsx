/* The seven games of the casino floor.
   Preserved verbatim from the monolith — each game is self-contained. */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { fmt } from '../utils/format.js';
import { useTypewriter } from '../utils/typewriter.js';
import { makeDeck, shuffle, cardValue, handTotal, RANKS, SUITS } from '../utils/deck.js';
import { pickLine } from '../mythology/sirenLines.js';

// ---------- PLAYING CARD + BET + OUTCOME ----------
function PCard({ card, hidden }) {
  if (hidden) return <div className="pcard pcard-back"/>;
  const colorClass = card.color === 'red' ? 'red' : 'black';
  return (
    <div className={`pcard ${colorClass}`}>
      <div className="pcard-top">
        <div className="pcard-rank">{card.rank}</div>
        <div className="pcard-suit">{card.suit}</div>
      </div>
      <div className="pcard-center">{card.suit}</div>
      <div className="pcard-bot">
        <div className="pcard-rank">{card.rank}</div>
        <div className="pcard-suit">{card.suit}</div>
      </div>
    </div>
  );
}

// (legacy window export removed — this module uses ES imports now)


/* ================== GAMES ================== */

// ---------- BET CONTROL ----------
function BetControl({ bet, setBet, max, min = 5, disabled }) {
  const denominations = [
    { v:   5, label:   '5', color: '#ffffff', rim: '#e8e2cc' },
    { v:  10, label:  '10', color: '#5be0c2', rim: '#3a8e78' },
    { v:  25, label:  '25', color: '#7ef0ff', rim: '#3a8ab0' },
    { v: 100, label: '100', color: '#c7a6ff', rim: '#6a4ea8' },
  ];
  const add = (v) => setBet(Math.min(max, bet + v));
  const clear = () => setBet(min);
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => { setFlashKey(k => k + 1); }, [bet]);

  // Build chip stack visual: round up bet / 5 into stacks, one per denomination
  const stacks = [];
  let remaining = bet;
  [100, 25, 10, 5].forEach(d => {
    const count = Math.floor(remaining / d);
    if (count > 0) {
      stacks.push({ d, count });
      remaining -= count * d;
    }
  });

  return (
    <div className="bet-control-stacked">
      <div className="bet-stacks">
        {stacks.map((s, i) => {
          const def = denominations.find(x => x.v === s.d);
          return (
            <div key={i} className="chip-stack">
              {Array.from({ length: Math.min(s.count, 8) }).map((_, k) => (
                <div
                  key={k}
                  className="chip-in-stack"
                  style={{
                    bottom: k * 5 + 'px',
                    background: def.color,
                    borderColor: def.rim,
                    animationDelay: (k * 0.04) + 's',
                  }}
                />
              ))}
              {s.count > 8 && <div className="chip-stack-count">×{s.count}</div>}
              <div className="chip-stack-label">{s.d}</div>
            </div>
          );
        })}
      </div>

      <div className="bet-display">
        <span className="bet-display-label">WAGER</span>
        <span key={flashKey} className="bet-display-value">{fmt(bet)}</span>
      </div>

      <div className="chip-rack">
        {denominations.map(d => (
          <button
            key={d.v}
            className="chip-btn"
            disabled={disabled || bet + d.v > max}
            onClick={() => add(d.v)}
            style={{ background: d.color, borderColor: d.rim }}
          >
            <span className="chip-inner" style={{ color: d.rim }}>{d.label}</span>
          </button>
        ))}
        <button
          className="chip-btn chip-btn-clear"
          disabled={disabled || bet <= min}
          onClick={clear}
          title="Clear back to minimum"
        >✕</button>
      </div>
    </div>
  );
}

// ---------- OUTCOME DISPLAY ----------
function Outcome({ result, delta, message }) {
  if (!result) return <div className="outcome"/>;
  const bigWin = result === 'win' && Math.abs(delta || 0) >= 40;
  const bigLoss = result === 'loss' && Math.abs(delta || 0) >= 40;
  return (
    <>
      {bigWin && <div className="win-shower" key={`win-${delta}`}/>}
      {result === 'loss' && <div className="loss-darken" key={`loss-${delta}`}/>}
      <div className={`outcome ${result}`}>
        <div className="outcome-label">
          {result === 'win' ? 'Breath Returned' : result === 'loss' ? 'Breath Taken' : 'Break Even'}
        </div>
        <div className="outcome-delta">
          {result === 'win' ? '+' : result === 'loss' ? '−' : '±'}{fmt(Math.abs(delta || 0))} breath
        </div>
        {message && <div className="dim text-sm mt-1 script">"{message}"</div>}
      </div>
    </>
  );
}

// ==================================================
// BLACKJACK
// ==================================================
function Blackjack({ breath, onResult, onExit, houseEdge, dialogueStyle }) {
  const [deck, setDeck] = useState(() => shuffle(makeDeck()));
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [phase, setPhase] = useState('bet'); // bet | play | dealer | result
  const [bet, setBet] = useState(Math.min(20, breath));
  const [result, setResult] = useState(null);
  const [delta, setDelta] = useState(0);
  const [msg, setMsg] = useState('');
  const [hidden, setHidden] = useState(true);

  const deal = () => {
    const d = shuffle(makeDeck());
    const p = [d.pop(), d.pop()];
    const dl = [d.pop(), d.pop()];
    setDeck(d); setPlayer(p); setDealer(dl);
    setPhase('play'); setResult(null); setDelta(0); setHidden(true);
    // Natural blackjack?
    if (handTotal(p) === 21) setTimeout(() => dealerPlay(p, dl, d), 400);
  };

  const hit = () => {
    const d = [...deck]; const p = [...player, d.pop()];
    setDeck(d); setPlayer(p);
    if (handTotal(p) > 21) setTimeout(() => finishBust(p), 500);
  };

  const stand = () => dealerPlay(player, dealer, deck);

  const finishBust = (p) => {
    setHidden(false);
    setPhase('result');
    setResult('loss'); setDelta(-bet);
    setMsg(pickLine('loss', dialogueStyle));
    onResult(-bet);
  };

  const dealerPlay = (p, dl, d) => {
    setHidden(false); setPhase('dealer');
    const work = [...dl]; const newDeck = [...d];
    // House edge: with 'hard' she hits on soft 17, pulls slightly better cards feel
    const hitSoft17 = houseEdge === 'hard' || houseEdge === 'rigged' || houseEdge === 'cruel';
    const step = () => {
      const total = handTotal(work);
      const isSoft17 = total === 17 && work.some(c => c.rank === 'A') && work.reduce((s,c)=>s+(c.rank==='A'?1:cardValue(c)),0) + 10 === 17;
      if (total < 17 || (hitSoft17 && isSoft17)) {
        work.push(newDeck.pop());
        setDealer([...work]); setDeck([...newDeck]);
        setTimeout(step, 700);
      } else {
        const pt = handTotal(p); const dt = handTotal(work);
        let r, delt;
        if (dt > 21 || pt > dt) { r = 'win'; delt = Math.floor(bet * (pt === 21 && p.length === 2 ? 1.5 : 1)); }
        else if (pt < dt) { r = 'loss'; delt = -bet; }
        else { r = 'push'; delt = 0; }
        setResult(r); setDelta(delt); setPhase('result');
        setMsg(pickLine(r === 'win' ? 'win' : r === 'loss' ? 'loss' : 'bet_place', dialogueStyle));
        onResult(delt);
      }
    };
    setTimeout(step, 800);
  };

  const reset = () => {
    setPhase('bet'); setPlayer([]); setDealer([]); setResult(null); setMsg('');
    setBet(Math.min(bet, breath));
  };

  return (
    <div className="game-stage">
      <div className="game-header">
        <div className="game-title-block">
          <div className="game-title">Blackjack</div>
          <div className="game-sub">The Siren deals. She never blinks.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onExit}>← Leave Table</button>
      </div>

      <div className="game-body">
        <div className="flex flex-col items-center gap-2">
          <div className="mono text-xs dim" style={{letterSpacing:'0.3em'}}>DEALER {phase !== 'bet' && !hidden ? `· ${handTotal(dealer)}` : ''}</div>
          <div className="card-hand">
            {dealer.map((c, i) => <PCard key={i} card={c} hidden={i === 1 && hidden}/>)}
            {dealer.length === 0 && <div className="dim script">awaiting your wager…</div>}
          </div>
        </div>

        <div className="divider-ornate" style={{width:'60%'}}>∞ In the sea monster we trust ∞</div>

        <div className="flex flex-col items-center gap-2">
          <div className="card-hand">
            {player.map((c, i) => <PCard key={i} card={c}/>)}
          </div>
          <div className="mono text-xs" style={{color: handTotal(player) > 21 ? 'var(--coral)' : 'var(--glow-cyan)', letterSpacing:'0.3em'}}>
            YOU {phase !== 'bet' ? `· ${handTotal(player)}` : ''}
          </div>
        </div>

        {phase === 'result' && <Outcome result={result} delta={delta} message={msg}/>}
      </div>

      <div className="bottom-bar">
        {phase === 'bet' && <>
          <BetControl bet={bet} setBet={setBet} max={breath}/>
          <button className="btn btn-lg" onClick={deal} disabled={bet > breath || bet < 5}>Deal</button>
        </>}
        {phase === 'play' && <>
          <div className="mono text-xs dim">Wagered · {fmt(bet)} breath</div>
          <div className="game-actions">
            <button className="btn" onClick={hit}>Hit</button>
            <button className="btn" onClick={stand}>Stand</button>
            {player.length === 2 && bet * 2 <= breath && (
              <button className="btn btn-coral" onClick={() => { setBet(bet*2); hit(); setTimeout(()=>stand(), 600); }}>Double</button>
            )}
          </div>
        </>}
        {phase === 'dealer' && <div className="mono text-xs dim center" style={{flex:1}}>The Siren draws…</div>}
        {phase === 'result' && <>
          <button className="btn btn-ghost" onClick={onExit}>Leave</button>
          <button className="btn" onClick={reset} disabled={breath < 5}>Another Hand</button>
        </>}
      </div>
    </div>
  );
}

// ==================================================
// ROULETTE
// ==================================================
const ROULETTE_SYMBOLS = [
  { label: '🜃', name: 'Kraken', color: '#143547' },
  { label: 'Ψ', name: 'Trident', color: '#8b1e2c' },
  { label: '◉', name: 'Eye', color: '#143547' },
  { label: '☽', name: 'Moon', color: '#8b1e2c' },
  { label: '⚓', name: 'Anchor', color: '#143547' },
  { label: '✧', name: 'Pearl', color: '#8b1e2c' },
  { label: '⚕', name: 'Caduceus', color: '#143547' },
  { label: '☠', name: 'Skull', color: '#8b1e2c' },
  { label: '∞', name: 'Abyss', color: '#143547' },
  { label: '♅', name: 'Poseidon', color: '#8b1e2c' },
  { label: '✦', name: 'Star', color: '#143547' },
  { label: '⟁', name: 'Trine', color: '#8b1e2c' },
];

function Roulette({ breath, onResult, onExit, houseEdge, dialogueStyle }) {
  const [phase, setPhase] = useState('bet'); // bet | spin | result
  const [bet, setBet] = useState(Math.min(20, breath));
  const [betType, setBetType] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [delta, setDelta] = useState(0);
  const [msg, setMsg] = useState('');
  const [landed, setLanded] = useState(null);

  const betOptions = [
    { key: 'red', label: 'Blood', payout: 2, sub: '1:1' },
    { key: 'black', label: 'Abyss', payout: 2, sub: '1:1' },
    { key: 'even', label: 'Even Tides', payout: 2, sub: '1:1' },
    { key: 'odd', label: 'Odd Tides', payout: 2, sub: '1:1' },
    { key: 'low', label: 'Shallows', payout: 2, sub: '1–6' },
    { key: 'high', label: 'Deep', payout: 2, sub: '7–12' },
    { key: 'kraken', label: 'Kraken', payout: 12, sub: 'single' },
    { key: 'skull', label: 'Skull', payout: 12, sub: 'single' },
  ];

  const spin = () => {
    if (!betType) return;
    const winIdx = Math.floor(Math.random() * 12);
    const turns = 5 + Math.random() * 3;
    const final = turns * 360 + (360 - (winIdx * 30) - 15);
    setRotation(final);
    setPhase('spin');
    setTimeout(() => {
      const sym = ROULETTE_SYMBOLS[winIdx];
      setLanded(sym);
      // Determine win
      const isRed = sym.color === '#8b1e2c';
      const isBlack = sym.color === '#143547';
      const num = winIdx + 1;
      const even = num % 2 === 0;
      let win = false;
      if (betType === 'red') win = isRed;
      else if (betType === 'black') win = isBlack;
      else if (betType === 'even') win = even;
      else if (betType === 'odd') win = !even;
      else if (betType === 'low') win = num <= 6;
      else if (betType === 'high') win = num > 6;
      else if (betType === 'kraken') win = sym.name === 'Kraken';
      else if (betType === 'skull') win = sym.name === 'Skull';

      const opt = betOptions.find(o => o.key === betType);
      // House edge applied subtly
      const winBias = ({easy:1.05, normal:0.95, hard:0.85, rigged:0.72, cruel:0.55})[houseEdge] || 0.95;
      const adjustedWin = win && Math.random() < winBias;

      let d, r;
      if (adjustedWin) { d = bet * (opt.payout - 1); r = 'win'; }
      else { d = -bet; r = 'loss'; }
      setResult(r); setDelta(d);
      setMsg(pickLine(r === 'win' ? 'win' : 'loss', dialogueStyle));
      setPhase('result');
      onResult(d);
    }, 4200);
  };

  const reset = () => {
    setPhase('bet'); setResult(null); setBetType(null); setLanded(null);
    setBet(Math.min(bet, breath));
  };

  return (
    <div className="game-stage">
      <div className="game-header">
        <div className="game-title-block">
          <div className="game-title">Roulette of the Drowned</div>
          <div className="game-sub">Twelve omens. One lands on you.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onExit}>← Leave Table</button>
      </div>

      <div className="game-body">
        <div className="roulette-table">
          <div className="roulette-wheel">
            <div className="roulette-pointer"/>
            <div className="roulette-inner" style={{ transform: `rotate(${rotation}deg)` }}>
              {ROULETTE_SYMBOLS.map((sym, i) => {
                const angle = i * 30;
                return (
                  <div key={i} style={{
                    position: 'absolute', inset: 0,
                    transform: `rotate(${angle}deg)`,
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '4%', left: '50%',
                      transform: 'translateX(-50%)',
                      width: '50px', height: '60px',
                      background: sym.color,
                      clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      paddingTop: '14px',
                      fontFamily: 'Cinzel, serif',
                      fontSize: '20px',
                      color: 'var(--bone)',
                      textShadow: '0 0 6px rgba(126,240,255,0.4)'
                    }}>{sym.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="roulette-hub">
              {landed ? landed.label : '∞'}
            </div>
          </div>

          <div className="roulette-bets">
            {betOptions.map(o => (
              <button
                key={o.key}
                className={`rbet ${betType === o.key ? 'selected' : ''}`}
                disabled={phase !== 'bet'}
                onClick={() => setBetType(o.key)}>
                {o.label}
                <span className="rbet-payout">{o.payout}× · {o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {phase === 'result' && <Outcome result={result} delta={delta} message={msg}/>}
      </div>

      <div className="bottom-bar">
        {phase === 'bet' && <>
          <BetControl bet={bet} setBet={setBet} max={breath}/>
          <button className="btn btn-lg" onClick={spin} disabled={!betType || bet > breath}>Spin</button>
        </>}
        {phase === 'spin' && <div className="mono text-xs dim center" style={{flex:1}}>The wheel turns…</div>}
        {phase === 'result' && <>
          <button className="btn btn-ghost" onClick={onExit}>Leave</button>
          <button className="btn" onClick={reset} disabled={breath < 5}>Spin Again</button>
        </>}
      </div>
    </div>
  );
}



/* ================== GAMES 2: SLOTS, DICE, COIN, BACCARAT ================== */

// ==================================================
// SLOT MACHINE — Atlantean glyphs
// ==================================================
const GLYPHS = [
  { s: '𓂀', name: 'Eye', weight: 3, payout: 4 },      // eye of horus-ish
  { s: '𓆉', name: 'Turtle', weight: 4, payout: 3 },
  { s: '𓆙', name: 'Serpent', weight: 3, payout: 5 },
  { s: '𓊝', name: 'Pillar', weight: 5, payout: 2 },
  { s: '𓇼', name: 'Star', weight: 4, payout: 3 },
  { s: '𓆝', name: 'Fish', weight: 6, payout: 2 },
  { s: '♅', name: 'Trident', weight: 1, payout: 20 }, // rare jackpot
];

function pickGlyph(edge) {
  const weights = GLYPHS.map(g => g.weight);
  // House edge: reduce jackpot weight on hard
  if (edge === 'hard') weights[weights.length - 1] = 0.3;
  if (edge === 'easy') weights[weights.length - 1] = 2;
  const total = weights.reduce((a,b)=>a+b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < GLYPHS.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

function Slots({ breath, onResult, onExit, houseEdge, dialogueStyle }) {
  const [reels, setReels] = useState([0, 1, 2]);
  const [spinning, setSpinning] = useState([false, false, false]);
  const [phase, setPhase] = useState('bet');
  const [bet, setBet] = useState(Math.min(10, breath));
  const [result, setResult] = useState(null);
  const [delta, setDelta] = useState(0);
  const [msg, setMsg] = useState('');
  const tickRef = useRef(null);

  const spin = () => {
    setPhase('spin'); setResult(null);
    setSpinning([true, true, true]);

    // Animate reel flicker
    tickRef.current = setInterval(() => {
      setReels(r => r.map(() => Math.floor(Math.random() * GLYPHS.length)));
    }, 80);

    const final = [pickGlyph(houseEdge), pickGlyph(houseEdge), pickGlyph(houseEdge)];

    setTimeout(() => {
      setSpinning([false, true, true]);
      setReels(r => [final[0], r[1], r[2]]);
    }, 1000);
    setTimeout(() => {
      setSpinning([false, false, true]);
      setReels(r => [final[0], final[1], r[2]]);
    }, 1800);
    setTimeout(() => {
      clearInterval(tickRef.current);
      setSpinning([false, false, false]);
      setReels(final);
      // Calculate
      let d, r;
      if (final[0] === final[1] && final[1] === final[2]) {
        const g = GLYPHS[final[0]];
        d = bet * (g.payout - 1);
        r = 'win';
        setMsg(g.name === 'Trident' ? "A trident! The sea monster winks." : pickLine('win', dialogueStyle));
      } else if (final[0] === final[1] || final[1] === final[2]) {
        d = Math.floor(bet * 0.5); r = 'win';
        setMsg(pickLine('win', dialogueStyle));
      } else {
        d = -bet; r = 'loss';
        setMsg(pickLine('loss', dialogueStyle));
      }
      setResult(r); setDelta(d); setPhase('result'); onResult(d);
    }, 2600);
  };

  useEffect(() => () => clearInterval(tickRef.current), []);

  const reset = () => { setPhase('bet'); setResult(null); setBet(Math.min(bet, breath)); };

  return (
    <div className="game-stage">
      <div className="game-header">
        <div className="game-title-block">
          <div className="game-title">Glyphs of the Drowned</div>
          <div className="game-sub">Three reels. Ancient tongues. Aligned stars.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onExit}>← Leave Machine</button>
      </div>

      <div className="game-body">
        <div className="slot-machine">
          <div className="slot-reels">
            {reels.map((idx, i) => (
              <div key={i} className={`slot-reel ${spinning[i] ? 'spinning' : ''}`}>
                {GLYPHS[idx].s}
              </div>
            ))}
          </div>
          <div className="center mono text-xs dim">
            TRIPLE · 2–5× · TRIDENT TRIPLE · 20× · PAIR · 0.5×
          </div>
        </div>

        {phase === 'result' && <Outcome result={result} delta={delta} message={msg}/>}
      </div>

      <div className="bottom-bar">
        {phase === 'bet' && <>
          <BetControl bet={bet} setBet={setBet} max={breath}/>
          <button className="btn btn-lg" onClick={spin} disabled={bet > breath}>Pull</button>
        </>}
        {phase === 'spin' && <div className="mono text-xs dim center" style={{flex:1}}>The glyphs churn…</div>}
        {phase === 'result' && <>
          <button className="btn btn-ghost" onClick={onExit}>Leave</button>
          <button className="btn" onClick={reset} disabled={breath < 5}>Pull Again</button>
        </>}
      </div>
    </div>
  );
}

// ==================================================
// BONE DICE
// ==================================================
function pipsFor(n) {
  // returns array of 9 slots with pip positions for dice face
  const patterns = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return patterns[n] || [];
}

function Die({ value, rolling }) {
  const pips = pipsFor(value);
  return (
    <div className={`bone-die ${rolling ? 'rolling' : ''}`}>
      {Array.from({length: 9}, (_, i) => (
        <div key={i} style={{width: '12px', height: '12px', justifySelf:'center', alignSelf:'center'}}>
          {pips.includes(i) && <div className="pip"/>}
        </div>
      ))}
    </div>
  );
}

function Dice({ breath, onResult, onExit, houseEdge, dialogueStyle }) {
  const [dice, setDice] = useState([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [phase, setPhase] = useState('bet');
  const [bet, setBet] = useState(Math.min(20, breath));
  const [betType, setBetType] = useState(null);
  const [result, setResult] = useState(null);
  const [delta, setDelta] = useState(0);
  const [msg, setMsg] = useState('');

  const betOptions = [
    { key: 'under', label: 'Under 7', payout: 2, sub: '2–6' },
    { key: 'seven', label: 'Seven', payout: 5, sub: '=7' },
    { key: 'over', label: 'Over 7', payout: 2, sub: '8–12' },
    { key: 'snakes', label: 'Snake Eyes', payout: 30, sub: '1+1' },
    { key: 'boxcars', label: 'Box Cars', payout: 30, sub: '6+6' },
    { key: 'doubles', label: 'Any Doubles', payout: 5, sub: 'a=b' },
  ];

  const roll = () => {
    if (!betType) return;
    setPhase('roll'); setRolling(true);
    const ticks = setInterval(() => setDice([1 + Math.floor(Math.random()*6), 1 + Math.floor(Math.random()*6)]), 80);
    setTimeout(() => {
      clearInterval(ticks);
      let d1 = 1 + Math.floor(Math.random()*6);
      let d2 = 1 + Math.floor(Math.random()*6);
      // House edge nudge
      const cheatChance = ({easy:0, normal:0, hard:0.15, rigged:0.3, cruel:0.5})[houseEdge] || 0;
      if (cheatChance > 0 && Math.random() < cheatChance) {
        if (betType === 'snakes' || betType === 'boxcars') { d1 = 1 + Math.floor(Math.random()*5); d2 = 6 - d1 + 1; }
      }
      setDice([d1, d2]); setRolling(false);
      const sum = d1 + d2;
      let win = false;
      if (betType === 'under') win = sum < 7;
      else if (betType === 'seven') win = sum === 7;
      else if (betType === 'over') win = sum > 7;
      else if (betType === 'snakes') win = d1 === 1 && d2 === 1;
      else if (betType === 'boxcars') win = d1 === 6 && d2 === 6;
      else if (betType === 'doubles') win = d1 === d2;

      const opt = betOptions.find(o => o.key === betType);
      let delt, r;
      if (win) { delt = bet * (opt.payout - 1); r = 'win'; }
      else { delt = -bet; r = 'loss'; }
      setResult(r); setDelta(delt); setPhase('result');
      setMsg(pickLine(r === 'win' ? 'win' : 'loss', dialogueStyle));
      onResult(delt);
    }, 1200);
  };

  const reset = () => { setPhase('bet'); setResult(null); setBetType(null); setBet(Math.min(bet, breath)); };

  return (
    <div className="game-stage">
      <div className="game-header">
        <div className="game-title-block">
          <div className="game-title">Bones of the Forgotten</div>
          <div className="game-sub">Dice cut from the ribs of the first drowned.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onExit}>← Leave Table</button>
      </div>

      <div className="game-body">
        <div className="dice-tray">
          <Die value={dice[0]} rolling={rolling}/>
          <Die value={dice[1]} rolling={rolling}/>
        </div>
        <div className="mono text-md" style={{color:'var(--glow-cyan)', letterSpacing:'0.3em'}}>
          {rolling ? '· · ·' : `SUM · ${dice[0] + dice[1]}`}
        </div>

        <div className="roulette-bets" style={{gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 500}}>
          {betOptions.map(o => (
            <button key={o.key}
              className={`rbet ${betType === o.key ? 'selected' : ''}`}
              disabled={phase !== 'bet'}
              onClick={() => setBetType(o.key)}>
              {o.label}
              <span className="rbet-payout">{o.payout}× · {o.sub}</span>
            </button>
          ))}
        </div>

        {phase === 'result' && <Outcome result={result} delta={delta} message={msg}/>}
      </div>

      <div className="bottom-bar">
        {phase === 'bet' && <>
          <BetControl bet={bet} setBet={setBet} max={breath}/>
          <button className="btn btn-lg" onClick={roll} disabled={!betType || bet > breath}>Cast Bones</button>
        </>}
        {phase === 'roll' && <div className="mono text-xs dim center" style={{flex:1}}>The bones tumble…</div>}
        {phase === 'result' && <>
          <button className="btn btn-ghost" onClick={onExit}>Leave</button>
          <button className="btn" onClick={reset} disabled={breath < 5}>Cast Again</button>
        </>}
      </div>
    </div>
  );
}

// ==================================================
// COIN FLIP / HIGH CARD
// ==================================================
function CoinFlip({ breath, onResult, onExit, houseEdge, dialogueStyle }) {
  const [phase, setPhase] = useState('bet');
  const [bet, setBet] = useState(Math.min(20, breath));
  const [call, setCall] = useState(null);
  const [result, setResult] = useState(null);
  const [delta, setDelta] = useState(0);
  const [msg, setMsg] = useState('');
  const [face, setFace] = useState('siren');
  const [flipping, setFlipping] = useState(false);

  const flip = () => {
    if (!call) return;
    setPhase('flip'); setFlipping(true);
    setTimeout(() => {
      const bias = ({easy:0.55, normal:0.48, hard:0.42, rigged:0.35, cruel:0.28})[houseEdge] || 0.48;
      const sirenWins = Math.random() < bias;
      const landed = sirenWins ? 'siren' : 'kraken';
      setFace(landed); setFlipping(false);
      const win = landed === call;
      const d = win ? bet : -bet;
      setResult(win ? 'win' : 'loss'); setDelta(d);
      setMsg(pickLine(win ? 'win' : 'loss', dialogueStyle));
      setPhase('result'); onResult(d);
    }, 1600);
  };

  const reset = () => { setPhase('bet'); setResult(null); setCall(null); setBet(Math.min(bet, breath)); };

  return (
    <div className="game-stage">
      <div className="game-header">
        <div className="game-title-block">
          <div className="game-title">The Drowned Coin</div>
          <div className="game-sub">Siren's face or Kraken's claw. Even odds. Supposedly.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onExit}>← Leave</button>
      </div>

      <div className="game-body">
        <div style={{perspective:'800px'}}>
          <div className={`coin ${flipping ? 'flipping' : ''}`} style={{
            transform: face === 'siren' ? 'rotateY(0)' : 'rotateY(180deg)',
          }}>
            <div className="coin-face">Ψ</div>
            <div className="coin-face coin-back">☠</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className={`rbet ${call === 'siren' ? 'selected' : ''}`}
            style={{minWidth: 160}}
            disabled={phase !== 'bet'}
            onClick={() => setCall('siren')}>
            Siren (Ψ)
            <span className="rbet-payout">2×</span>
          </button>
          <button
            className={`rbet ${call === 'kraken' ? 'selected' : ''}`}
            style={{minWidth: 160}}
            disabled={phase !== 'bet'}
            onClick={() => setCall('kraken')}>
            Kraken (☠)
            <span className="rbet-payout">2×</span>
          </button>
        </div>

        {phase === 'result' && <Outcome result={result} delta={delta} message={msg}/>}
      </div>

      <div className="bottom-bar">
        {phase === 'bet' && <>
          <BetControl bet={bet} setBet={setBet} max={breath}/>
          <button className="btn btn-lg" onClick={flip} disabled={!call || bet > breath}>Flip</button>
        </>}
        {phase === 'flip' && <div className="mono text-xs dim center" style={{flex:1}}>The coin tumbles through the water…</div>}
        {phase === 'result' && <>
          <button className="btn btn-ghost" onClick={onExit}>Leave</button>
          <button className="btn" onClick={reset} disabled={breath < 5}>Flip Again</button>
        </>}
      </div>
    </div>
  );
}

// ==================================================
// BACCARAT
// ==================================================
function Baccarat({ breath, onResult, onExit, houseEdge, dialogueStyle }) {
  const [phase, setPhase] = useState('bet');
  const [bet, setBet] = useState(Math.min(20, breath));
  const [betType, setBetType] = useState(null);
  const [playerHand, setPlayerHand] = useState([]);
  const [bankerHand, setBankerHand] = useState([]);
  const [result, setResult] = useState(null);
  const [delta, setDelta] = useState(0);
  const [msg, setMsg] = useState('');

  const bacVal = (c) => {
    if (['J','Q','K','10'].includes(c.rank)) return 0;
    if (c.rank === 'A') return 1;
    return parseInt(c.rank, 10);
  };
  const total = (h) => h.reduce((s,c) => s + bacVal(c), 0) % 10;

  const deal = () => {
    if (!betType) return;
    const d = shuffle(makeDeck());
    const p = [d.pop(), d.pop()];
    const b = [d.pop(), d.pop()];
    setPlayerHand(p); setBankerHand(b); setPhase('deal');
    setTimeout(() => {
      // Natural 8/9 = stand
      const pt = total(p); const bt = total(b);
      let pFinal = [...p], bFinal = [...b];
      if (pt < 8 && bt < 8) {
        if (pt <= 5) pFinal.push(d.pop());
        // simplified banker rule
        const newBt = total(bFinal);
        if (newBt <= 5) bFinal.push(d.pop());
      }
      setPlayerHand(pFinal); setBankerHand(bFinal);

      const pf = total(pFinal); const bf = total(bFinal);
      let winner;
      if (pf > bf) winner = 'player';
      else if (bf > pf) winner = 'banker';
      else winner = 'tie';

      const biasRoll = Math.random();
      const edge = ({easy:0, normal:0.05, hard:0.1, rigged:0.2, cruel:0.32})[houseEdge] || 0.05;
      const nudgedWinner = biasRoll < edge ? (winner === 'player' ? 'banker' : winner) : winner;

      let delt, r;
      if (nudgedWinner === betType) {
        if (betType === 'tie') delt = bet * 7;
        else if (betType === 'banker') delt = Math.floor(bet * 0.95);
        else delt = bet;
        r = 'win';
      } else {
        delt = -bet; r = 'loss';
      }
      setResult(r); setDelta(delt);
      setMsg(pickLine(r === 'win' ? 'win' : 'loss', dialogueStyle));
      setPhase('result'); onResult(delt);
    }, 1200);
  };

  const reset = () => {
    setPhase('bet'); setResult(null); setBetType(null);
    setPlayerHand([]); setBankerHand([]); setBet(Math.min(bet, breath));
  };

  return (
    <div className="game-stage">
      <div className="game-header">
        <div className="game-title-block">
          <div className="game-title">Baccarat of the Tides</div>
          <div className="game-sub">Player. Banker. Or the rarest tide — a tie.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onExit}>← Leave</button>
      </div>

      <div className="game-body">
        <div className="bac-hands">
          <div className="bac-hand player">
            <div className="bac-hand-title">Player</div>
            <div className="card-hand">
              {playerHand.map((c, i) => <PCard key={i} card={c}/>)}
            </div>
            {playerHand.length > 0 && <div className="bac-hand-total">{total(playerHand)}</div>}
          </div>
          <div className="bac-hand banker">
            <div className="bac-hand-title">Banker</div>
            <div className="card-hand">
              {bankerHand.map((c, i) => <PCard key={i} card={c}/>)}
            </div>
            {bankerHand.length > 0 && <div className="bac-hand-total">{total(bankerHand)}</div>}
          </div>
        </div>

        <div className="bac-bets">
          <button
            className={`bac-bet ${betType === 'player' ? 'selected' : ''}`}
            disabled={phase !== 'bet'}
            onClick={() => setBetType('player')}>
            Player
            <span className="bac-bet-payout">1:1</span>
          </button>
          <button
            className={`bac-bet ${betType === 'tie' ? 'selected' : ''}`}
            disabled={phase !== 'bet'}
            onClick={() => setBetType('tie')}>
            Tie
            <span className="bac-bet-payout">8:1</span>
          </button>
          <button
            className={`bac-bet ${betType === 'banker' ? 'selected' : ''}`}
            disabled={phase !== 'bet'}
            onClick={() => setBetType('banker')}>
            Banker
            <span className="bac-bet-payout">0.95:1</span>
          </button>
        </div>

        {phase === 'result' && <Outcome result={result} delta={delta} message={msg}/>}
      </div>

      <div className="bottom-bar">
        {phase === 'bet' && <>
          <BetControl bet={bet} setBet={setBet} max={breath}/>
          <button className="btn btn-lg" onClick={deal} disabled={!betType || bet > breath}>Deal</button>
        </>}
        {phase === 'deal' && <div className="mono text-xs dim center" style={{flex:1}}>The tides turn…</div>}
        {phase === 'result' && <>
          <button className="btn btn-ghost" onClick={onExit}>Leave</button>
          <button className="btn" onClick={reset} disabled={breath < 5}>Deal Again</button>
        </>}
      </div>
    </div>
  );
}



/* ================== POKER (vs ghost patrons) ================== */

// Simplified 5-card draw against 3 ghost patrons.
// Player bets ante, gets 5 cards, can discard & draw once, then showdown.

const GHOSTS = [
  { name: 'Lady Narwhal', stack: 340, tell: 'glances at her cards too long' },
  { name: 'The Cartographer', stack: 220, tell: 'breathes out a single bubble' },
  { name: 'Old Marrow', stack: 510, tell: 'never blinks at all' },
];

const HAND_RANKS = [
  { name: 'Royal Flush', payout: 100 },
  { name: 'Straight Flush', payout: 50 },
  { name: 'Four of a Kind', payout: 25 },
  { name: 'Full House', payout: 9 },
  { name: 'Flush', payout: 6 },
  { name: 'Straight', payout: 4 },
  { name: 'Three of a Kind', payout: 3 },
  { name: 'Two Pair', payout: 2 },
  { name: 'Jacks or Better', payout: 1 },
  { name: 'Nothing', payout: 0 },
];

function rankVal(r) {
  if (r === 'A') return 14;
  if (r === 'K') return 13;
  if (r === 'Q') return 12;
  if (r === 'J') return 11;
  return parseInt(r, 10);
}

function evalHand(hand) {
  const vals = hand.map(c => rankVal(c.rank)).sort((a,b) => a-b);
  const suits = hand.map(c => c.suit);
  const counts = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const countList = Object.values(counts).sort((a,b) => b-a);

  const flush = new Set(suits).size === 1;
  let straight = vals.every((v, i) => i === 0 || v === vals[i-1] + 1);
  // Ace-low straight
  if (!straight && vals.join(',') === '2,3,4,5,14') straight = true;

  const highStraight = flush && straight && vals[0] === 10;
  if (highStraight) return 0;
  if (flush && straight) return 1;
  if (countList[0] === 4) return 2;
  if (countList[0] === 3 && countList[1] === 2) return 3;
  if (flush) return 4;
  if (straight) return 5;
  if (countList[0] === 3) return 6;
  if (countList[0] === 2 && countList[1] === 2) return 7;
  if (countList[0] === 2) {
    // Pair — must be Jacks or better
    const pairVal = Object.entries(counts).find(([v,c]) => c === 2)[0];
    if (parseInt(pairVal, 10) >= 11) return 8;
    return 9;
  }
  return 9;
}

function Poker({ breath, onResult, onExit, houseEdge, dialogueStyle }) {
  const [phase, setPhase] = useState('bet'); // bet | draw | reveal | result
  const [bet, setBet] = useState(Math.min(20, breath));
  const [hand, setHand] = useState([]);
  const [held, setHeld] = useState([false, false, false, false, false]);
  const [deck, setDeck] = useState([]);
  const [result, setResult] = useState(null);
  const [delta, setDelta] = useState(0);
  const [msg, setMsg] = useState('');
  const [rankIdx, setRankIdx] = useState(null);

  const deal = () => {
    const d = shuffle(makeDeck());
    const h = [d.pop(), d.pop(), d.pop(), d.pop(), d.pop()];
    setDeck(d); setHand(h); setHeld([false, false, false, false, false]);
    setPhase('draw'); setResult(null);
  };

  const toggleHold = (i) => {
    if (phase !== 'draw') return;
    setHeld(h => h.map((v, j) => j === i ? !v : v));
  };

  const draw = () => {
    const d = [...deck];
    const newHand = hand.map((c, i) => held[i] ? c : d.pop());
    setDeck(d); setHand(newHand);
    setPhase('reveal');
    setTimeout(() => {
      const idx = evalHand(newHand);
      setRankIdx(idx);
      const hr = HAND_RANKS[idx];
      let delt, r;
      const edgeMult = ({easy:1.1, normal:1.0, hard:0.9, rigged:0.78, cruel:0.62})[houseEdge] || 1.0;
      if (hr.payout > 0) { delt = Math.floor(bet * hr.payout * edgeMult); r = 'win'; }
      else { delt = -bet; r = 'loss'; }
      setResult(r); setDelta(delt);
      setMsg(hr.name === 'Royal Flush' ? "The ghosts go silent. Even Old Marrow blinks." :
             r === 'win' ? pickLine('win', dialogueStyle) : pickLine('loss', dialogueStyle));
      setPhase('result'); onResult(delt);
    }, 1000);
  };

  const reset = () => {
    setPhase('bet'); setHand([]); setHeld([false,false,false,false,false]);
    setResult(null); setRankIdx(null); setBet(Math.min(bet, breath));
  };

  return (
    <div className="game-stage">
      <div className="game-header">
        <div className="game-title-block">
          <div className="game-title">Ghost Poker</div>
          <div className="game-sub">Five card draw. The patrons have been here a while.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onExit}>← Leave Table</button>
      </div>

      <div className="game-body">
        {/* Ghost patrons */}
        <div style={{display: 'flex', gap: 16, justifyContent: 'center', width: '100%'}}>
          {GHOSTS.map((g, i) => (
            <div key={i} className="ghost-player" style={{flex: 1, maxWidth: 200}}>
              <div className="ghost-name">{g.name}</div>
              <div className="ghost-stack">~ {g.stack} breath</div>
              <div className="script text-xs dim mt-1" style={{fontSize: 11}}>
                {phase === 'reveal' || phase === 'result' ? `"${g.tell}"` : '…waiting…'}
              </div>
            </div>
          ))}
        </div>

        {/* Player hand */}
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 12}}>
          <div className="card-hand">
            {hand.length === 0
              ? Array.from({length: 5}, (_, i) => <div key={i} className="pcard pcard-back" style={{opacity:0.3}}/>)
              : hand.map((c, i) => (
                <div key={i}
                  onClick={() => toggleHold(i)}
                  style={{
                    cursor: phase === 'draw' ? 'pointer' : 'default',
                    transform: held[i] ? 'translateY(-12px)' : 'translateY(0)',
                    transition: 'transform 0.2s',
                    filter: held[i] ? 'drop-shadow(0 0 12px var(--glow-cyan))' : 'none',
                    position: 'relative'
                  }}>
                  <PCard card={c}/>
                  {held[i] && (
                    <div style={{
                      position:'absolute', bottom:-18, left:0, right:0,
                      textAlign:'center',
                      fontFamily:'Cinzel, serif', fontSize:9, letterSpacing:'0.3em',
                      color:'var(--glow-cyan)'
                    }}>HELD</div>
                  )}
                </div>
              ))}
          </div>
          {phase === 'draw' && (
            <div className="dim script text-sm mt-2">Tap cards to hold. Discards are replaced.</div>
          )}
          {rankIdx != null && (
            <div className="mono text-md mt-2" style={{
              color: rankIdx <= 3 ? 'var(--glow-green)' : rankIdx <= 7 ? 'var(--glow-cyan)' : 'var(--bone-dim)',
              letterSpacing:'0.3em'
            }}>
              {HAND_RANKS[rankIdx].name.toUpperCase()}
              {HAND_RANKS[rankIdx].payout > 0 && ` · ${HAND_RANKS[rankIdx].payout}×`}
            </div>
          )}
        </div>

        {phase === 'result' && <Outcome result={result} delta={delta} message={msg}/>}
      </div>

      <div className="bottom-bar">
        {phase === 'bet' && <>
          <BetControl bet={bet} setBet={setBet} max={breath}/>
          <button className="btn btn-lg" onClick={deal} disabled={bet > breath}>Ante Up</button>
        </>}
        {phase === 'draw' && <>
          <div className="mono text-xs dim">Wagered · {fmt(bet)} breath · {held.filter(x=>x).length} held</div>
          <button className="btn btn-lg" onClick={draw}>Draw</button>
        </>}
        {phase === 'reveal' && <div className="mono text-xs dim center" style={{flex:1}}>The ghosts lean forward…</div>}
        {phase === 'result' && <>
          <button className="btn btn-ghost" onClick={onExit}>Leave</button>
          <button className="btn" onClick={reset} disabled={breath < 5}>Deal Again</button>
        </>}
      </div>
    </div>
  );
}

export {
  PCard, BetControl, Outcome,
  Blackjack, Roulette, Slots, Dice, CoinFlip, Baccarat, Poker,
};
