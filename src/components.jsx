/* All React UI components for Abyss — scenes, modals, HUD, world wrapper.
   Preserved verbatim from the monolith, just with proper imports. */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { fmt } from './utils/format.js';
import { useTypewriter } from './utils/typewriter.js';
import { FRAGMENTS } from './mythology/fragments.js';
import { TRINKETS } from './mythology/trinkets.js';
import { TAROT_CARDS, pickTarotCard } from './mythology/tarot.js';
import { ENDING_CARDS, ENDING_PAINTINGS } from './mythology/endings.js';
import { SIREN_LINES, pickLine } from './mythology/sirenLines.js';
import { effectiveHouseEdge, edgeBias } from './mythology/houseEdge.js';
import { TABLES } from './mythology/tables.js';
import { loadMeta, saveMeta, updateMeta, META_DEFAULTS } from './state/meta.js';
import { appendLedger, loadLedger } from './state/ledger.js';
import { useFragments } from './state/useFragments.js';
import { useTrinkets } from './state/useTrinkets.js';
import { TrappedWorld } from './world/TrappedWorld.js';
import { TrappedAudio } from './audio/TrappedAudio.js';

function WaterBackground() {
  const motes = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 1 + Math.random() * 3,
      duration: 12 + Math.random() * 18,
      delay: Math.random() * -25,
      driftX: (Math.random() - 0.5) * 80 + 'px',
      opacity: 0.3 + Math.random() * 0.5
    }));
  }, []);
  return (
    <>
      <div className="water-bg" />
      <div className="water-caustics" />
      <div className="motes">
        {motes.map(m => (
          <div key={m.id} className="mote" style={Object.assign({
            left: m.left + '%',
            width: m.size, height: m.size,
            animationDuration: m.duration + 's',
            animationDelay: m.delay + 's'
          }, { '--drift-x': m.driftX })} />
        ))}
      </div>
      <div className="vignette" />
    </>
  );
}

// ---------- SIREN PORTRAIT ----------
function SirenPortrait({ mood = 'neutral' }) {
  // Abstract figure: hooded silhouette with glowing eyes, flowing hair becoming tendrils
  return (
    <div className="siren-portrait siren-hover">
      <svg viewBox="0 0 320 420" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="sirenGlow" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#c7a6ff" stopOpacity="0.4"/>
            <stop offset="50%" stopColor="#8b6fd6" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#02060d" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="hairGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#1a1030" stopOpacity="0.9"/>
            <stop offset="60%" stopColor="#3d2e5c" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#02060d" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="bodyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#2a1f45" stopOpacity="0.95"/>
            <stop offset="100%" stopColor="#05101c" stopOpacity="0.3"/>
          </linearGradient>
          <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e0c8ff"/>
            <stop offset="40%" stopColor="#c7a6ff"/>
            <stop offset="100%" stopColor="#8b6fd6" stopOpacity="0"/>
          </radialGradient>
          <filter id="softBlur">
            <feGaussianBlur stdDeviation="1.5"/>
          </filter>
        </defs>

        {/* Ambient glow */}
        <ellipse cx="160" cy="180" rx="150" ry="220" fill="url(#sirenGlow)"/>

        {/* Flowing hair / tendrils behind */}
        <path d="M 90 120 Q 50 180 60 280 Q 65 350 90 420 L 110 420 Q 95 340 105 260 Q 115 180 130 130 Z"
              fill="url(#hairGrad)" filter="url(#softBlur)" opacity="0.85"/>
        <path d="M 230 120 Q 270 180 260 280 Q 255 350 230 420 L 210 420 Q 225 340 215 260 Q 205 180 190 130 Z"
              fill="url(#hairGrad)" filter="url(#softBlur)" opacity="0.85"/>

        {/* Tendril tips curling */}
        <path d="M 70 280 Q 40 320 50 360" stroke="#3d2e5c" strokeWidth="2" fill="none" opacity="0.6"/>
        <path d="M 250 280 Q 280 320 270 360" stroke="#3d2e5c" strokeWidth="2" fill="none" opacity="0.6"/>
        <path d="M 80 340 Q 55 380 70 410" stroke="#3d2e5c" strokeWidth="2" fill="none" opacity="0.5"/>
        <path d="M 240 340 Q 265 380 250 410" stroke="#3d2e5c" strokeWidth="2" fill="none" opacity="0.5"/>

        {/* Body / robe */}
        <path d="M 110 220 Q 100 280 90 420 L 230 420 Q 220 280 210 220 Q 190 240 160 240 Q 130 240 110 220 Z"
              fill="url(#bodyGrad)"/>

        {/* Shoulders / collar */}
        <path d="M 100 230 Q 130 220 160 225 Q 190 220 220 230" stroke="#c7a6ff" strokeWidth="0.8" fill="none" opacity="0.4"/>

        {/* Neck */}
        <path d="M 145 190 Q 145 210 150 225 L 170 225 Q 175 210 175 190 Z" fill="#1a0f2e" opacity="0.9"/>

        {/* Head shape */}
        <ellipse cx="160" cy="150" rx="55" ry="70" fill="#0e0820" opacity="0.95"/>

        {/* Face — subtle, veiled */}
        <ellipse cx="160" cy="155" rx="48" ry="62" fill="#1a0f2e" opacity="0.7"/>

        {/* Hair falling over face */}
        <path d="M 105 110 Q 130 90 160 85 Q 190 90 215 110 Q 210 140 195 155 Q 180 140 160 135 Q 140 140 125 155 Q 110 140 105 110 Z"
              fill="#1a1030" opacity="0.85"/>

        {/* Glowing eyes */}
        <ellipse cx="142" cy="155" rx="10" ry="5" fill="url(#eyeGlow)"/>
        <ellipse cx="178" cy="155" rx="10" ry="5" fill="url(#eyeGlow)"/>
        <circle cx="142" cy="155" r="2" fill="#ffffff" opacity="0.9"/>
        <circle cx="178" cy="155" r="2" fill="#ffffff" opacity="0.9"/>

        {/* Subtle lips */}
        <path d="M 150 180 Q 160 184 170 180" stroke="#8b4a6b" strokeWidth="1.5" fill="none" opacity="0.7"/>

        {/* Hair falling forward */}
        <path d="M 115 100 Q 140 130 130 200 Q 120 240 110 260" stroke="#2a1f45" strokeWidth="3" fill="none" opacity="0.7"/>
        <path d="M 205 100 Q 180 130 190 200 Q 200 240 210 260" stroke="#2a1f45" strokeWidth="3" fill="none" opacity="0.7"/>

        {/* Floating particles around */}
        <circle cx="80" cy="140" r="1.5" fill="#7ef0ff" opacity="0.8"/>
        <circle cx="250" cy="200" r="1" fill="#7ef0ff" opacity="0.6"/>
        <circle cx="270" cy="120" r="2" fill="#c7a6ff" opacity="0.7"/>
        <circle cx="50" cy="220" r="1.2" fill="#7ef0ff" opacity="0.5"/>
        <circle cx="290" cy="280" r="1" fill="#c7a6ff" opacity="0.6"/>
        <circle cx="40" cy="300" r="1.5" fill="#7ef0ff" opacity="0.4"/>

        {/* Crown / tiara hint */}
        <path d="M 128 95 L 135 80 L 145 92 L 160 78 L 175 92 L 185 80 L 192 95"
              stroke="#b59248" strokeWidth="1.2" fill="none" opacity="0.6"/>
        <circle cx="160" cy="78" r="2" fill="#b59248" opacity="0.8"/>
      </svg>
    </div>
  );
}

// ---------- BREATH HUD ----------
function BreathHUD({ breath, max, depth }) {
  return (
    <div className="hud">
      <div className="breath-meter">
        <div className="breath-icon"/>
        <div>
          <div className="breath-label">Breath</div>
          <div className="breath-value">{fmt(breath)}</div>
        </div>
      </div>
      <div className="depth-meter">
        <span>DEPTH</span>
        <span className="depth-value">—{depth}m</span>
      </div>
    </div>
  );
}

// ---------- DIALOGUE BOX ----------
function DialogueBox({ name, text, onComplete, choices, onChoice }) {
  const { shown, done } = useTypewriter(text, 24);
  useEffect(() => { if (done && onComplete) onComplete(); }, [done]);
  return (
    <div className="dialogue slide-up">
      <div className="dialogue-name">{name}</div>
      <div className="dialogue-text">
        {shown}
        {!done && <span className="caret"/>}
      </div>
      {done && choices && choices.length > 0 && (
        <div className="choices fade-in">
          {choices.map((c, i) => (
            <button key={i} className="choice" onClick={() => onChoice(i)}>
              <span className="choice-marker">{String(i + 1).padStart(2, '0')}</span>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- SIREN WHISPER (persistent bottom-left hint) ----------
function SirenWhisper({ text }) {
  if (!text) return null;
  return (
    <div className="siren-whisper" key={text}>
      <div className="whisper-name">The Siren</div>
      <div className="whisper-text">"{text}"</div>
    </div>
  );
}

// ---------- CARD UTILS ----------
const SUITS = [
  { s: '♠', color: 'black', name: 'abyss' },
  { s: '♥', color: 'red', name: 'coral' },
  { s: '♦', color: 'red', name: 'pearl' },
  { s: '♣', color: 'black', name: 'kelp' }
];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function makeDeck() {
  const d = [];
  for (const suit of SUITS) for (const rank of RANKS) d.push({ rank, suit: suit.s, color: suit.color });
  return d;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function cardValue(c) {
  if (c.rank === 'A') return 11;
  if (['K','Q','J'].includes(c.rank)) return 10;
  return parseInt(c.rank, 10);
}
function handTotal(hand) {
  let t = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (t > 21 && aces > 0) { t -= 10; aces--; }
  return t;
}

// ---------- PLAYING CARD COMPONENT ----------
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

// Export


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



/* ================== INTRO, HUB, ENDINGS, APP SHELL ================== */

// ==================================================
// INTRO SCENE
// ==================================================
function Intro({ onStart, dialogueStyle }) {
  const [stage, setStage] = useState(0); // 0: title, 1: lore, 2: siren appears, 3: siren speaks
  const [sirenLine, setSirenLine] = useState(0);
  const meta = typeof loadMeta === 'function' ? loadMeta() : { totalRuns: 0, deaths: 0, fragmentsEverFound: [] };
  const isReturning = meta.totalRuns > 0 || meta.deaths > 0;
  const isDeepReturning = meta.totalRuns >= 3 || meta.deaths >= 2;

  const sirenIntroLines = {
    seductive: [
      "You washed up, little lung. How lucky for us both.",
      "This is the Abyss. The only currency here is breath.",
      "The door out requires five hundred of it. You have two hundred. Win the rest, or… stay. Stay with me.",
      "Come. Pick a table. I'll deal the first hand myself."
    ],
    cryptic: [
      "You arrived. Expected.",
      "The house takes breath. The door demands five hundred.",
      "You were given two hundred. The rest must be won. Or kept.",
      "Choose a table. Or don't. Both are the same."
    ],
    mocking: [
      "Oh, another one. Honestly, the current's getting lazy.",
      "Welcome to the Abyss. We trade in breath. It's a whole thing.",
      "Door out wants five hundred breaths. You have two hundred. Math is so rarely your friend.",
      "Pick a table, hero. Let's see how this goes."
    ]
  };

  const lines = sirenIntroLines[dialogueStyle] || sirenIntroLines.seductive;

  if (stage === 0) {
    return (
      <div className="stage">
        <div className="intro-content fade-in">
          <svg className="intro-ornament" viewBox="0 0 400 60" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M 20 30 Q 80 10 160 30 T 200 30"/>
              <path d="M 200 30 Q 240 30 320 10 T 380 30"/>
              <circle cx="200" cy="30" r="4" fill="currentColor"/>
              <path d="M 200 22 L 200 38 M 194 30 L 206 30" strokeWidth="1.5"/>
              <path d="M 160 30 Q 180 44 200 30 Q 220 44 240 30" opacity="0.55"/>
            </g>
          </svg>
          <div className="intro-subtitle">
            {isDeepReturning ? 'You Know This Place · The Casino Chambers of'
              : isReturning    ? 'Again · The Casino Chambers of'
                               : 'The Casino Chambers of'}
          </div>
          <h1 className="intro-title">Abyss</h1>
          <div className="intro-line">
            {isDeepReturning
              ? '— Depth measured in the number of lives spent —'
              : '— Depth 3,842m · Pressure beyond measure —'}
          </div>
          <button className="btn btn-lg" onClick={() => setStage(1)}>
            {isDeepReturning ? 'Descend Again' : isReturning ? 'Descend' : 'Descend'}
          </button>
          <div className="motto">
            {isDeepReturning
              ? 'In the sea monster we continue to trust.'
              : isReturning
                ? 'In the sea monster we still trust.'
                : 'In the sea monster we trust'}
          </div>
          <svg className="intro-ornament intro-ornament-bottom" viewBox="0 0 400 60" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M 20 30 Q 80 50 160 30 T 200 30"/>
              <path d="M 200 30 Q 240 30 320 50 T 380 30"/>
              <circle cx="200" cy="30" r="4" fill="currentColor"/>
              <path d="M 180 30 Q 200 20 220 30 Q 200 40 180 30" opacity="0.55"/>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  if (stage === 1) {
    return (
      <div className="stage">
        <div className="intro-content fade-in" style={{maxWidth: 600}}>
          <div className="divider-ornate mb-3">∞ Prologue ∞</div>
          <p className="intro-lore">
            You do not remember how you got here.
          </p>
          <p className="intro-lore">
            The water is warm. It tastes of copper and old gold. Above you, a vaulted ceiling
            of black coral; below, a floor of chipped marble marked with card suits older
            than any deck you've seen. Green light pools around tables no one sits at.
          </p>
          <p className="intro-lore">
            A door stands at the far end. Above it, carved in glowing glyphs:
            <br/>
            <span className="glow-text" style={{fontSize: 22, letterSpacing: '0.3em'}}>EXIT · 500 BREATH</span>
          </p>
          <p className="intro-lore">
            You check your pulse. Two hundred breaths. Maybe less.
          </p>
          <p className="intro-lore siren-text">
            Something moves in the dark beyond the tables.
          </p>
          <button className="btn btn-lg mt-3" onClick={() => setStage(2)}>Look Closer</button>
        </div>
      </div>
    );
  }

  // stage 2+: siren appears + speaks
  return (
    <div className="stage">
      <div style={{display:'flex', gap: 60, alignItems:'center', maxWidth: 1100}}>
        <SirenPortrait/>
        <div style={{flex: 1, maxWidth: 560}}>
          <DialogueBox
            name="The Siren"
            text={lines[sirenLine]}
            choices={sirenLine === lines.length - 1 ? [
              { label: "Approach the casino floor." },
              { label: "Ask who she is." },
              { label: "Say nothing. Walk." }
            ] : null}
            onChoice={(i) => {
              if (i === 1) {
                // ask who she is - extra line then continue
                const extras = {
                  seductive: "I'm what the water remembers. A dealer, mostly. Now go — the tables are waiting.",
                  cryptic: "I am older than the door. I am younger than the stakes. Go.",
                  mocking: "I'm the one who's still here. Unlike you, shortly. Table. Now."
                };
                alert(extras[dialogueStyle]);
              }
              onStart();
            }}
          />
          {sirenLine < lines.length - 1 && (
            <div className="mt-2">
              <button className="btn btn-siren btn-sm" onClick={() => setSirenLine(sirenLine + 1)}>Continue</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================================================
// CASINO HUB — TABLES imported from ./mythology/tables.js
// ==================================================

function Hub({ breath, targetBreath, onPick, onExit, onQuit, whisper }) {
  const canExit = breath >= targetBreath;
  return (
    <div className="hub-stage">
      <div className="hub-header">
        <div className="hub-title">The Casino Floor</div>
        <div className="hub-subtitle">Seven tables. One door. Breath for both.</div>
        <div className="mono text-xs dim mt-2" style={{letterSpacing:'0.25em'}}>
          EXIT REQUIRES <span style={{color:'var(--coral)'}}>{fmt(targetBreath)}</span> BREATH ·
          YOU HAVE <span style={{color: canExit ? 'var(--glow-green)' : 'var(--glow-cyan)'}}>{fmt(breath)}</span>
        </div>
      </div>

      <div className="hub-grid">
        {TABLES.map((t, i) => (
          <div key={t.key} className="table-card" onClick={() => onPick(t.key)} data-screen-label={`Table ${t.name}`}>
            <div className="table-corner">№ {String(i + 1).padStart(2, '0')}</div>
            <div className="table-icon">{t.icon}</div>
            <div>
              <div className="table-name">{t.name}</div>
              <div className="table-desc">{t.desc}</div>
              <div className="table-minbet">MIN · {t.minBet} BREATH</div>
            </div>
          </div>
        ))}

        {/* Exit door */}
        <div className={`table-card exit-card`} onClick={() => canExit ? onExit() : null}
             style={{ opacity: canExit ? 1 : 0.7, cursor: canExit ? 'pointer' : 'not-allowed' }}
             data-screen-label="Exit Door">
          <div className="table-corner">EXIT</div>
          <div className="table-icon">⧉</div>
          <div>
            <div className="table-name">The Door</div>
            <div className="table-desc">
              {canExit ? "It creaks open. Daylight. Maybe." : `Sealed. Requires ${fmt(targetBreath)} breath.`}
            </div>
            <div className="table-minbet">
              COST · {fmt(targetBreath)} BREATH
            </div>
          </div>
        </div>

        {/* Sit with the Siren - leads to alt ending */}
        <div className="table-card" onClick={onQuit}
             style={{ borderColor: 'rgba(199,166,255,0.3)' }}
             data-screen-label="Sit with the Siren">
          <div className="table-corner" style={{color:'var(--siren)'}}>HER</div>
          <div className="table-icon" style={{color:'var(--siren)', filter:'drop-shadow(0 0 10px var(--siren))'}}>☽</div>
          <div>
            <div className="table-name siren-text" style={{color:'var(--siren)'}}>Sit With Her</div>
            <div className="table-desc">Lay down your breath. Stay.</div>
            <div className="table-minbet" style={{color:'var(--siren)'}}>COST · EVERYTHING</div>
          </div>
        </div>
      </div>

      <SirenWhisper text={whisper}/>
    </div>
  );
}

// ==================================================
// ENDINGS
// ==================================================
function Ending({ kind, breath, gamesPlayed, onRestart }) {
  const endings = {
    escape: {
      title: "The Door Opens",
      body: [
        "You slide your breath across the counter. The Siren counts it without looking.",
        "The door unfolds like something that remembers being alive. Outside: cold current, surface light, a direction you didn't know was still there.",
        "Behind you, a sound that might be laughter, or might be the sea monster turning over in its sleep.",
        "You don't look back."
      ]
    },
    drown: {
      title: "The Breath Runs Dry",
      body: [
        "Your lungs fold like wet paper.",
        "The Siren leans close — close enough that you can finally see her face — and for one long moment you almost remember how you got here.",
        "She takes what's left. A small, patient gesture.",
        "You become another chip on the felt. In the sea monster we trust."
      ]
    },
    house: {
      title: "You Sit With Her",
      body: [
        "You push every breath you have across the table.",
        "She smiles, and the smile is the same shape as the door.",
        "Somewhere, a new body washes up on a marble floor. It doesn't know how it got here. It looks up. You're already dealing.",
        "The casino has a new face."
      ]
    },
    walkAway: {
      title: "The Tide Takes You",
      body: [
        "You decide this isn't a game you will win.",
        "You close your eyes, let the current take you sideways through a gap in the coral, out past the tables, out past the Siren's long watching.",
        "Maybe you drown. Maybe you drift. The house loses track of you — which, here, is its own kind of winning."
      ]
    }
  };

  const e = endings[kind];
  const titleClass = kind === 'escape' ? 'escape' : kind === 'house' ? 'house' : 'drown';
  const motto = kind === 'escape' ? 'The sea monster released you.'
                : kind === 'house' ? 'In you, the sea monster trusts.'
                : kind === 'walkAway' ? 'The sea monster forgot.'
                : 'The sea monster fed.';

  return (
    <div className="ending-stage">
      <div className="ending-content">
        <div className="divider-ornate mb-3">∞ Ending ∞</div>
        <h1 className={`ending-title ${titleClass}`}>{e.title}</h1>
        {e.body.map((p, i) => <p key={i} className="ending-body">{p}</p>)}

        <div className="flex gap-2 justify-center mt-4">
          <div className="mono text-xs dim" style={{textAlign:'left'}}>
            <div>FINAL BREATH &nbsp;· {fmt(breath)}</div>
            <div>HANDS PLAYED · {gamesPlayed}</div>
            <div>FATE &emsp;&emsp;&nbsp;&nbsp;&nbsp; · {kind.toUpperCase()}</div>
          </div>
        </div>

        <div className="motto mt-4">{motto}</div>

        <button className="btn btn-lg mt-4" onClick={onRestart}>Return to the Surface</button>
      </div>
    </div>
  );
}

// ==================================================
// TWEAKS PANEL
// ==================================================
function TweaksPanel({ visible, settings, setSettings }) {
  if (!visible) return null;
  return (
    <div className="tweaks-panel">
      <div className="tweaks-title">◈ Tweaks</div>

      <div className="tweak-row">
        <label className="tweak-label">Starting Breath · {settings.startingBreath}</label>
        <input type="range" min="50" max="500" step="10"
          value={settings.startingBreath}
          onChange={e => setSettings({ ...settings, startingBreath: +e.target.value })}/>
      </div>

      <div className="tweak-row">
        <label className="tweak-label">Siren's Dialogue</label>
        <select className="tweak-select"
          value={settings.dialogueStyle}
          onChange={e => setSettings({ ...settings, dialogueStyle: e.target.value })}>
          <option value="seductive">Seductive</option>
          <option value="cryptic">Cryptic</option>
          <option value="mocking">Mocking</option>
        </select>
      </div>

      <div className="tweak-row">
        <label className="tweak-label">Water Depth (atmosphere)</label>
        <select className="tweak-select"
          value={settings.waterDepth}
          onChange={e => setSettings({ ...settings, waterDepth: e.target.value })}>
          <option value="shallow">Shallow — lighter</option>
          <option value="deep">Deep — standard</option>
          <option value="abyss">Abyss — pitch black</option>
        </select>
      </div>

      <div className="tweak-row">
        <label className="tweak-label">House Edge</label>
        <select className="tweak-select"
          value={settings.houseEdge}
          onChange={e => setSettings({ ...settings, houseEdge: e.target.value })}>
          <option value="easy">Easy — favor you</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard — house hungry</option>
        </select>
      </div>

      <div className="mono text-xs dim mt-2" style={{fontSize: 10, letterSpacing: '0.1em'}}>
        Changes apply next hand / reset
      </div>
    </div>
  );
}



/* ================== POV 3D LAYER ================== */

function POVLayer({ lowBreath }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let raf = 0;
    let pending = null;
    const onMove = (e) => {
      pending = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (pending) setTilt(pending);
        });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const debris = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: 40 + Math.random() * 50,
      size: 2 + Math.random() * 5,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * -30,
      dx: (Math.random() - 0.5) * 240 + 'px',
      dy: -(80 + Math.random() * 40) + 'vh',
    })), []);

  const bubbles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 4 + Math.random() * 16,
      duration: 6 + Math.random() * 10,
      delay: Math.random() * -16,
      wiggle: (Math.random() - 0.5) * 80 + 'px',
    })), []);

  const silhouettes = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      top: 20 + Math.random() * 50,
      duration: 40 + Math.random() * 40,
      delay: Math.random() * -60,
      scale: 0.6 + Math.random() * 0.6,
    })), []);

  return (
    <>
      {/* Deep 3D parallax background */}
      <div className="pov-root">
        <div className="pov-depth" style={{
          transform: `rotateX(${-tilt.y * 3}deg) rotateY(${tilt.x * 3}deg) translateZ(0)`
        }}>
          <div className="pov-plane pov-plane-far"/>
          <div className="pov-plane pov-plane-mid"/>

          {/* Silhouettes drifting in the distance */}
          {silhouettes.map(s => (
            <svg key={s.id} className="silhouette" viewBox="0 0 120 50" style={{
              top: s.top + '%',
              left: 0,
              width: 120 * s.scale, height: 50 * s.scale,
              animationDuration: s.duration + 's',
              animationDelay: s.delay + 's',
            }}>
              <path d="M 10 25 Q 30 10 60 20 Q 90 25 110 22 L 118 18 L 118 32 L 110 28 Q 90 30 60 28 Q 30 32 10 25 Z"
                    fill="currentColor"/>
            </svg>
          ))}

          {/* Floating debris / motes with parallax */}
          <div className="pov-debris" style={{
            transform: `translate(${tilt.x * 10}px, ${tilt.y * 10}px) translateZ(50px)`
          }}>
            {debris.map(d => (
              <div key={d.id} className="debris-mote" style={{
                left: d.left + '%',
                top: d.top + '%',
                width: d.size, height: d.size,
                animationDuration: d.duration + 's',
                animationDelay: d.delay + 's',
                '--dx': d.dx,
                '--dy': d.dy,
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* Bubbles drifting up */}
      <div className="pov-bubbles">
        {bubbles.map(b => (
          <div key={b.id} className="bubble" style={{
            left: b.left + '%',
            width: b.size, height: b.size,
            animationDuration: b.duration + 's',
            animationDelay: b.delay + 's',
            '--wiggle': b.wiggle,
          }}/>
        ))}
      </div>

      {/* Glass/lens overlays in z-order */}
      <div className="pov-warp-edge"/>
      <div className="pov-edge-blur"/>
      <div className="pov-chromatic"/>
      <div className="pov-goggles"/>
      <div className="pov-mask-seal"/>
      <div className="pov-droplets" style={{
        transform: `translate(${tilt.x * -4}px, ${tilt.y * -4}px)`
      }}/>
      <div className="pov-fog"/>

      {/* Panic vignette when breath is low */}
      {lowBreath && <div className="pov-panic-vignette"/>}
    </>
  );
}

/* Wrap scene content: parallax tilt (outer) + wobble (middle) + breath-hold (inner) */
function POVContent({ children, lowBreath }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let raf = 0;
    let pending = null;
    const onMove = (e) => {
      pending = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (pending) setTilt(pending);
        });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="pov-parallax" style={{
      transform: `translate3d(${tilt.x * -6}px, ${tilt.y * -6}px, 0)`,
      transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div className={`pov-wobble ${lowBreath ? 'pov-panic' : ''}`} style={{minHeight: '100%'}}>
        <div className="pov-breath-hold" style={{minHeight: '100%'}}>
          {children}
        </div>
      </div>
    </div>
  );
}


/* ==============================================================
   MYTHOLOGY LAYER
   ──────────────────────────────────────────────────────────────
   • 12 story fragments (pieces of your lost life)
   • Meta save (deaths, total runs, fragments ever found)
   • Dynamic rising house edge (reflects the rigged world)
   • Ghost intro variant (after first death — you watch the next)
   • Revelation ending (all fragments + escape → another casino)
   • Mirror ending (1000+ breath — you become the House)
   ============================================================== */

/* State/mythology/hooks (META_DEFAULTS, loadMeta, saveMeta, updateMeta, FRAGMENTS, effectiveHouseEdge, edgeBias, useFragments, META_KEY, RUN_KEY) are imported at top of file. */

/* ---------- Fragment pickup UI — subtle bottom-left bar + reveal reader ---------- */
function FragmentInventory({ collected, onRead, onOpen }) {
  if (!collected || collected.length === 0) return null;
  const items = collected.map(id => FRAGMENTS.find(f => f.id === id)).filter(Boolean);
  return (
    <div className="fragment-bar" onClick={onOpen}>
      <div className="fragment-bar-label">REMEMBERED · {collected.length} / 12</div>
      <div className="fragment-bar-grid">
        {items.map((f, i) => (
          <div key={f.id} className={`fragment-dot fragment-dot-${f.kind}`} title={f.title}
               onClick={(e) => { e.stopPropagation(); onRead(f.id); }}>
            <div className="fragment-dot-inner"/>
          </div>
        ))}
      </div>
    </div>
  );
}

function FragmentReader({ fragmentId, onClose }) {
  if (!fragmentId) return null;
  const f = FRAGMENTS.find(x => x.id === fragmentId);
  if (!f) return null;

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="fragment-reader-backdrop" onClick={onClose}>
      <div className="fragment-reader" onClick={(e) => e.stopPropagation()}>
        <div className="fragment-reader-head">
          <div className="fragment-reader-kind">{f.kind.toUpperCase()}</div>
          <div className="fragment-reader-title">{f.title}</div>
        </div>
        <div className="fragment-reader-line">{f.line}</div>
        <div className="fragment-reader-narrative">
          <span className="fragment-reader-narrative-mark">—</span>
          {f.narrative}
        </div>
        <button className="fragment-reader-close" onClick={onClose}>Close · ESC</button>
      </div>
    </div>
  );
}

/* ---------- Fragment gallery (full inventory modal) ---------- */
function FragmentGallery({ collected, onClose, onPick }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="fragment-gallery-backdrop" onClick={onClose}>
      <div className="fragment-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="fragment-gallery-head">
          <div className="fragment-gallery-title">The pieces you have remembered</div>
          <div className="fragment-gallery-sub">{collected.length} of 12 · open each to read</div>
        </div>
        <div className="fragment-gallery-grid">
          {FRAGMENTS.map(f => {
            const have = collected.includes(f.id);
            return (
              <div key={f.id}
                   className={`fragment-card ${have ? 'have' : 'lost'}`}
                   onClick={() => have && onPick(f.id)}>
                <div className={`fragment-card-kind fragment-dot-${f.kind}`}/>
                <div className="fragment-card-title">{have ? f.title : '— not yet remembered —'}</div>
                {have && <div className="fragment-card-line">{f.line}</div>}
              </div>
            );
          })}
        </div>
        <div className="fragment-gallery-foot">
          {collected.length === 12
            ? <span className="glow-text">All twelve remembered. The door will tell the truth now.</span>
            : <span className="dim">Walk the chamber. Look down. Pick them up.</span>}
        </div>
        <button className="fragment-gallery-close" onClick={onClose}>Close · ESC</button>
      </div>
    </div>
  );
}

/* ---------- Ghost intro — shown after first death ---------- */
function GhostIntro({ meta, onBeginNewRun, onSpectate }) {
  const [stage, setStage] = useState(0);
  const lines = [
    "You open your eyes. The water is colder than you remember — or maybe it's colder because you are.",
    `You have died ${meta.deaths === 1 ? 'once' : meta.deaths + ' times'} here. You are transparent now. The others cannot quite see you, but they sense that the seat beside them has been occupied before.`,
    "You can stay. Watch the next stranger fail the way you failed. Or you can pay the house in memory, and try again — but the pieces you gathered will stay in the drowned.",
    "You recognize, for the first time, that the door is not an exit. It is a lap counter.",
  ];

  return (
    <div className="stage ghost-stage">
      <div className="ghost-content">
        <div className="divider-ornate mb-3">∞</div>
        <div className="ghost-title">You Are Still Here</div>
        <p className="ghost-body">{lines[stage]}</p>
        {stage < lines.length - 1 ? (
          <button className="btn btn-lg" onClick={() => setStage(stage + 1)}>Continue</button>
        ) : (
          <div className="ghost-actions">
            <button className="btn btn-lg btn-ghost" onClick={onSpectate}>Stay as the drowned</button>
            <button className="btn btn-lg btn-siren" onClick={onBeginNewRun}>Trade memory for breath · Begin again</button>
          </div>
        )}

        <div className="ghost-stats">
          <div><span>RUNS</span><span>{meta.totalRuns}</span></div>
          <div><span>DEATHS</span><span>{meta.deaths}</span></div>
          <div><span>BREATHS SURRENDERED</span><span>{meta.breathsSurrendered}</span></div>
          <div><span>HANDS AGAINST THE HOUSE</span><span>{meta.handsPlayedEver}</span></div>
          <div><span>PIECES REMEMBERED EVER</span><span>{meta.fragmentsEverFound.length} / 12</span></div>
          <div><span>ENDINGS SEEN</span><span>{(meta.endingsReached || []).length} / 8</span></div>
        </div>

        <EndingsTracker meta={meta}/>

        <div className="motto mt-4">In the sea monster we trust</div>
      </div>
    </div>
  );
}

/* ---------- Spectator scene — watch the chamber idle ---------- */
function SpectatorScreen({ onReturn }) {
  return (
    <div className="stage spectator-stage">
      <div className="spectator-content">
        <div className="spectator-title">You watch.</div>
        <p className="spectator-body">
          A new stranger arrives. Water tastes like copper and old gold. The Siren smiles the smile
          the Siren always smiles. You already know the ending. You always know the ending.
        </p>
        <p className="spectator-body">
          Someday, you will be fully gone. For now, you stay. You hum along with the chorus.
          When the stranger wins, your transparent hands clap soundlessly.
        </p>
        <p className="spectator-body script">
          <em>In the sea monster we trust.</em>
        </p>
        <button className="btn btn-lg mt-3" onClick={onReturn}>← Leave the chorus</button>
      </div>
    </div>
  );
}

/* ---------- Revelation ending — the true ending ---------- */
function RevelationEnding({ breath, gamesPlayed, fragmentCount, onRestart }) {
  const [stage, setStage] = useState(0);
  const lines = [
    "You press the five hundred breaths across the counter. She counts them without looking — the number is not what she is counting.",
    "The door folds open like the inside of a mouth.",
    "Beyond it: another floor of black marble. Seven tables. A vaulted ceiling. A door at the far end.",
    "The stranger who is already there, washed up, two hundred breaths to their name, looks at you with your own face.",
    "She says: \u201cOh, lucky us. The current has been lazy lately.\u201d",
    "You understand, then, what the house is. What the house has always been.",
    "Welcome to the next round.",
  ];

  return (
    <div className="stage revelation-stage">
      <div className="revelation-content">
        <div className="divider-ornate mb-3">¶ The Revelation ¶</div>
        <h1 className="revelation-title">The Door</h1>
        <p className="revelation-body">{lines[stage]}</p>
        {stage < lines.length - 1 ? (
          <button className="btn btn-lg" onClick={() => setStage(stage + 1)}>Step Through</button>
        ) : (
          <>
            <div className="revelation-stats">
              <div><span>BREATHS SURRENDERED</span><span>{breath}</span></div>
              <div><span>HANDS PLAYED</span><span>{gamesPlayed}</span></div>
              <div><span>PIECES REMEMBERED</span><span>{fragmentCount} / 12</span></div>
              <div><span>FATE</span><span>ANOTHER ROUND</span></div>
            </div>
            <div className="motto mt-4">In the sea monster we trust</div>
            <button className="btn btn-lg mt-4" onClick={onRestart}>Begin Again</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Mirror ending — 1000+ breath, you become her ---------- */
function MirrorEnding({ breath, gamesPlayed, onRestart }) {
  const [stage, setStage] = useState(0);
  const lines = [
    "You keep winning. Your pockets are so full of breath you begin to drown in it the opposite way.",
    "At eleven hundred, your shadow starts to gamble without you.",
    "At twelve hundred, the Siren rises from her dais. She extends a hand woven of coins.",
    "\u201cI was like you,\u201d she says, gently. \u201cI won, too. You understand, I hope, that the house must always have a face.\u201d",
    "She steps back. You step forward. The dress is heavier than you expected, and colder, and a perfect fit.",
    "Somewhere, a new stranger washes up on a marble floor, with two hundred breaths to their name. You already know how lucky they are.",
  ];

  return (
    <div className="stage mirror-stage">
      <div className="mirror-content">
        <div className="divider-ornate mb-3">¶ The Mirror ¶</div>
        <h1 className="mirror-title">You Become Her</h1>
        <p className="mirror-body">{lines[stage]}</p>
        {stage < lines.length - 1 ? (
          <button className="btn btn-lg btn-siren" onClick={() => setStage(stage + 1)}>Keep Winning</button>
        ) : (
          <>
            <div className="mirror-stats">
              <div><span>FINAL BREATH</span><span>{breath}</span></div>
              <div><span>HANDS PLAYED</span><span>{gamesPlayed}</span></div>
              <div><span>FATE</span><span>THE HOUSE WEARS YOUR FACE</span></div>
            </div>
            <div className="motto mt-4">In you, the sea monster trusts</div>
            <button className="btn btn-lg mt-4" onClick={onRestart}>Deal Again</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- NPC Encounters ---------- */
function NPCEncounter({ npcId, breath, houseEdgeTier, gamesPlayed, fragments, onClose, onBuyFragment, onMirrorAccept }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  /* ---------- The Gambler ---------- */
  if (npcId === 'gambler') {
    const freshnessByEdge = { easy: 1.0, normal: 0.85, hard: 0.6, rigged: 0.3, cruel: 0.12 }[houseEdgeTier] || 0.5;
    const credible = Math.random() < freshnessByEdge;

    const warnings = credible ? [
      "I've been here two hundred years, love. Listen — the Omens Wheel skips the kraken seven spins in ten. Don't bet single-symbol after the skull hits twice.",
      "Blackjack's fair for the first five hands, and then the Siren stops hitting sixteen. I've watched the pattern in the felt.",
      "The Coin is the cruelest. They say it's fifty-fifty. It is, the first two flips. After that, the kraken side gets heavier.",
      "Baccarat's the one they don't touch. The numbers are the numbers. If you're going to survive, go there.",
    ] : [
      "Listen, love — the, ah. The wheel. It. I used to know. Sorry. Was it you, who — no, sorry.",
      "The Siren. She, um. The thing is. She. Sorry. I can't quite. The felt says something. I used to read the felt.",
      "I had a system. I had a system, once. Do you remember my name? Because I can almost remember it.",
      "Everything is fair here. Don't listen to me. I'm very tired. Everything is fair.",
    ];
    const line = warnings[stage % warnings.length];

    const lines = [
      "You're new. You still smell like a person.",
      line,
      credible
        ? "Get out while your reflection still knows you. I mean it."
        : "I'm sorry. I was useful, once. I was useful. I'm sorry.",
    ];
    return (
      <div className="npc-encounter-backdrop">
        <div className="npc-encounter gambler">
          <div className="npc-encounter-name gambler">
            THE GAMBLER · {Math.round(freshnessByEdge * 100)}% CORPOREAL
          </div>
          <div className="npc-encounter-text">{lines[stage]}</div>
          {stage < lines.length - 1 ? (
            <button className="btn btn-sm" onClick={() => setStage(stage + 1)}>Continue</button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Leave her to fade</button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- The Muse ---------- */
  if (npcId === 'muse') {
    const cost = 60;
    const missingIds = FRAGMENTS.map(f => f.id).filter(id => !fragments.includes(id));
    const canBuy = missingIds.length > 0 && breath >= cost;
    const pickId = missingIds.length ? missingIds[Math.floor(Math.random() * missingIds.length)] : null;

    const lines = [
      "You have the look of someone whose hands remember more than their head does.",
      "I traffic in memory. I can return you a piece of yourself — for sixty breaths, no more, no less.",
      "Don't look at me like that. You'll spend more than sixty breaths on the wheel in an hour, and at least I'll tell you something true.",
    ];

    if (stage < 3) {
      return (
        <div className="npc-encounter-backdrop">
          <div className="npc-encounter muse">
            <div className="npc-encounter-name muse">THE MUSE</div>
            <div className="npc-encounter-text">{lines[stage]}</div>
            <button className="btn btn-sm" onClick={() => setStage(stage + 1)}>Continue</button>
          </div>
        </div>
      );
    }

    return (
      <div className="npc-encounter-backdrop">
        <div className="npc-encounter muse">
          <div className="npc-encounter-name muse">THE MUSE</div>
          <div className="npc-encounter-text">
            {missingIds.length === 0
              ? "You carry all twelve. There is nothing left of you I can sell back to you."
              : `I have a piece of you behind the glass. Sixty breaths and it is yours again.`}
          </div>
          <div className="npc-encounter-choices">
            {canBuy && (
              <button className="btn btn-coral btn-sm"
                onClick={() => { onBuyFragment(cost, pickId); onClose(); }}>
                Trade 60 breath for a piece
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Walk away</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- The Mirror ---------- */
  if (npcId === 'mirror') {
    const lines = [
      "Close enough that I could count the coins in your collar. Don't be shy — I was new, once.",
      "Listen. I'm going to tell you something that I was not told, and that is the only kindness anyone has ever done in this room.",
      "The house always has a face. Always. Someone must be wearing it.",
      "The longer you win, the heavier your winnings become, until one day you cannot move, and then the Siren stands up and walks to the door, and the dress stays.",
      "You don't have to. You could lose instead. You'd die — but you could lose.",
      "Or. You could stay. Win forever. Wear me. I'll step back. I've been so tired.",
    ];

    if (stage < lines.length) {
      return (
        <div className="npc-encounter-backdrop">
          <div className="npc-encounter mirror">
            <div className="npc-encounter-name mirror">THE MIRROR</div>
            <div className="npc-encounter-text">{lines[stage]}</div>
            {stage < lines.length - 1 ? (
              <button className="btn btn-sm" onClick={() => setStage(stage + 1)}>Continue</button>
            ) : (
              <div className="npc-encounter-choices">
                <button className="btn btn-ghost btn-sm" onClick={onClose}>Walk away · keep losing / keep winning</button>
                <button className="btn btn-siren btn-sm" onClick={onMirrorAccept}>Wear the dress · become the house</button>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  return null;
}

/* TRINKETS + useTrinkets imported at top from ./mythology/trinkets.js + ./state/useTrinkets.js */


/* ---------- TrinketBar — HUD, lower-right ---------- */
function TrinketBar({ owned, onPick }) {
  if (!owned || owned.length === 0) return null;
  return (
    <div className="trinket-bar">
      <div className="trinket-bar-label">CHARMS · {owned.length}</div>
      <div className="trinket-bar-grid">
        {owned.map(t => {
          const def = TRINKETS.find(x => x.id === t.id);
          if (!def) return null;
          return (
            <div key={t.id}
                 className={`trinket-dot ${def.cursed ? 'cursed' : ''}`}
                 style={{ backgroundColor: def.color }}
                 title={`${def.name} × ${t.charges}`}
                 onClick={() => onPick && onPick(t.id)}>
              <span className="trinket-dot-count">{t.charges}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Shop Modal (Pawn Shop) ---------- */
function ShopModal({ breath, owned, fragments, onBuyTrinket, onSellFragment, onClose, foreclosed, playerName }) {
  const [confirm, setConfirm] = useState(null); // { kind, id, price }

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const sellPriceFor = (fragId) => {
    const tier = ['photo1908','ticker','playbill','watch','key','letters','locket','notice','ticket','drawing','bottle','ring'];
    const idx = Math.max(0, tier.indexOf(fragId));
    return 30 + idx * 4; // 30..74
  };

  return (
    <div className="shop-backdrop" onClick={onClose}>
      <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
        <button className="shop-close" onClick={onClose}>← LEAVE THE COUNTER</button>

        <div className="shop-head">
          <div className="shop-kind">THE PAWN SHOP</div>
          <div className="shop-title">Anything is for sale, {playerName || 'little lung'}.</div>
          <div className="shop-subtitle">You have <span className="shop-breath">{fmt(breath)}</span> breath to trade.</div>
        </div>

        <div className="shop-sections">
          <div className="shop-section">
            <div className="shop-section-title">CHARMS · THEY SHIFT THE ODDS</div>
            <div className="shop-grid">
              {TRINKETS.map(t => {
                const has = (owned || []).find(o => o.id === t.id);
                const canAfford = breath >= t.cost;
                return (
                  <div key={t.id}
                       className={`shop-item ${canAfford ? '' : 'unaffordable'} ${t.cursed ? 'cursed' : ''}`}
                       onClick={() => canAfford && setConfirm({ kind: 'buy', id: t.id, price: t.cost })}>
                    <div className="shop-item-color" style={{ background: t.color }}/>
                    <div className="shop-item-body">
                      <div className="shop-item-name">{t.name}</div>
                      <div className="shop-item-desc">{t.desc}</div>
                      {has && <div className="shop-item-owned">owned × {has.charges}</div>}
                      <div className="shop-item-cost">
                        {t.cost === 0 ? 'FREE · CURSED' : `${t.cost} BREATH`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="shop-section">
            <div className="shop-section-title">THE MEMORY TRADE</div>
            <div className="shop-warn">
              {foreclosed
                ? 'You have already sold at least one piece. The Revelation door will not open for you.'
                : 'Selling a piece means you will not remember it. The Revelation door will not open for you.'}
            </div>
            <div className="shop-frag-list">
              {(fragments || []).length === 0
                ? <div className="shop-empty">You have no pieces to sell.</div>
                : (fragments || []).map(id => {
                    const f = FRAGMENTS.find(x => x.id === id);
                    if (!f) return null;
                    const price = sellPriceFor(id);
                    return (
                      <div key={id} className="shop-frag-row"
                           onClick={() => setConfirm({ kind: 'sell', id, price })}>
                        <div className={`fragment-dot fragment-dot-${f.kind}`}>
                          <div className="fragment-dot-inner"/>
                        </div>
                        <div className="shop-frag-body">
                          <div className="shop-frag-name">{f.title}</div>
                          <div className="shop-frag-line">{f.line}</div>
                        </div>
                        <div className="shop-frag-price">+ {price} BREATH</div>
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>

        {confirm && (
          <div className="shop-confirm-backdrop" onClick={() => setConfirm(null)}>
            <div className="shop-confirm" onClick={(e) => e.stopPropagation()}>
              {confirm.kind === 'buy' ? (
                <>
                  <div className="shop-confirm-title">Trade {confirm.price} breath for this charm?</div>
                  <div className="shop-confirm-sub">The Merchant will count it without looking.</div>
                  <div className="shop-confirm-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>No</button>
                    <button className="btn btn-sm" onClick={() => { onBuyTrinket(confirm.id, confirm.price); setConfirm(null); }}>
                      Pay {confirm.price} breath
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="shop-confirm-title">Sell this piece of yourself?</div>
                  <div className="shop-confirm-sub">
                    You will not remember it again. The Revelation door will not open for you.
                  </div>
                  <div className="shop-confirm-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>No</button>
                    <button className="btn btn-coral btn-sm" onClick={() => { onSellFragment(confirm.id, confirm.price); setConfirm(null); }}>
                      Forget it · Take {confirm.price} breath
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Charm-keeper offer (Dressing Room) — a simpler shop ---------- */
function CharmOffer({ breath, owned, onBuyTrinket, onClose, playerName }) {
  const offers = ['lucky-kiss', 'mirror-shard', 'siren-feather', 'drowning-chain'];

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="shop-backdrop shop-backdrop-dressing" onClick={onClose}>
      <div className="shop-modal shop-modal-dressing" onClick={(e) => e.stopPropagation()}>
        <button className="shop-close" onClick={onClose}>← WALK AWAY</button>

        <div className="shop-head">
          <div className="shop-kind" style={{ color: 'var(--coral)' }}>THE CHARM-KEEPER</div>
          <div className="shop-title">Let me give you something, {playerName || 'little lung'}.</div>
          <div className="shop-subtitle">You have <span className="shop-breath">{fmt(breath)}</span> breath.</div>
        </div>

        <div className="shop-grid" style={{ marginTop: 14 }}>
          {offers.map(id => {
            const t = TRINKETS.find(x => x.id === id);
            const has = (owned || []).find(o => o.id === id);
            const canAfford = breath >= t.cost;
            return (
              <div key={id}
                   className={`shop-item ${canAfford ? '' : 'unaffordable'} ${t.cursed ? 'cursed' : ''}`}
                   onClick={() => canAfford && onBuyTrinket(id, t.cost)}>
                <div className="shop-item-color" style={{ background: t.color }}/>
                <div className="shop-item-body">
                  <div className="shop-item-name">{t.name}</div>
                  <div className="shop-item-desc">{t.desc}</div>
                  {has && <div className="shop-item-owned">owned × {has.charges}</div>}
                  <div className="shop-item-cost">
                    {t.cost === 0 ? 'FREE · CURSED' : `${t.cost} BREATH`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="shop-foot-italic">
          "Nothing here is free. Even the curse costs the part of you that thought nothing was."
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   THE LEDGER — every choice you made, kept in ink.
   loadLedger + appendLedger imported from ./state/ledger.js
   ================================================== */

/* A grouped-by-run ledger view */
function Ledger({ onClose }) {
  const [entries] = useState(loadLedger);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  // Group entries by runIdx
  const groups = [];
  let current = null;
  entries.forEach(e => {
    if (!current || current.runIdx !== e.runIdx) {
      current = { runIdx: e.runIdx || 0, entries: [] };
      groups.push(current);
    }
    current.entries.push(e);
  });

  const kindLabel = (k) => ({
    run:       '— run begins —',
    hand:      'hand',
    buy:       'purchase',
    sell:      'memory sold',
    fragment:  'remembered',
    death:     '— drowned —',
    threshold: 'at the door',
    ending:    '— ending —',
    portal:    'moved through',
    siren:     'met her',
  })[k] || k;

  return (
    <div className="ledger-backdrop" onClick={onClose}>
      <div className="ledger" onClick={(e) => e.stopPropagation()}>
        <button className="ledger-close" onClick={onClose}>← CLOSE THE BOOK</button>
        <div className="ledger-head">
          <div className="ledger-kind">THE HOUSE LEDGER</div>
          <div className="ledger-title">Every choice is kept in ink.</div>
          <div className="ledger-sub">{entries.length} entries · {groups.length} descents</div>
        </div>

        {groups.length === 0 ? (
          <div className="ledger-empty">Nothing recorded yet. Walk. Bet. Choose.</div>
        ) : (
          <div className="ledger-scroll">
            {groups.map((g, gi) => (
              <div key={gi} className="ledger-group">
                <div className="ledger-group-title">DESCENT № {String(g.runIdx || gi + 1).padStart(3, '0')}</div>
                <div className="ledger-entries">
                  {g.entries.map((e, ei) => (
                    <div key={ei} className={`ledger-row ledger-row-${e.kind}`}>
                      <span className="ledger-time">{new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="ledger-kind-cell">{kindLabel(e.kind)}</span>
                      <span className="ledger-text">{e.text}</span>
                      {typeof e.delta === 'number' && (
                        <span className={`ledger-delta ${e.delta > 0 ? 'pos' : e.delta < 0 ? 'neg' : ''}`}>
                          {e.delta > 0 ? '+' : ''}{e.delta}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="ledger-foot">The house keeps the book. The book keeps you.</div>
      </div>
    </div>
  );
}

/* ==================================================
   THE THRESHOLD — the decision at the door.
   ================================================== */
function Threshold({ breath, gamesPlayed, fragments, revelationForeclosed, onStepThrough, onStayOneMore, onStayForever, onWalkAway }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (stage < lines.length - 1) setStage(stage + 1);
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [stage]);

  const lines = [
    "The door is open. You can see daylight.",
    "You can taste the air you have not had in — it is hard to count, now, how long. Copper. Salt. And something cleaner than what the water makes you believe is clean.",
    "The Siren stands beside you. She does not hold your wrist. She does not hold anything. She has not needed to, in a long time.",
    "She says: \u201cGo, if you must. The current is very lazy today.\u201d",
    "She says: \u201cBut. Think, little lung. Out there the houses cost more than breath, and no one will deal you a soft hand because you are dying, and the mornings are so very long.\u201d",
    "She says: \u201cHere, you win sometimes. Here, the music never stops. Here, someone remembers your face.\u201d",
    "You feel it, then \u2014 the first flicker of a thought you did not expect: that you do not want to leave.",
  ];

  const currentLine = lines[stage];
  const atChoice = stage === lines.length - 1;

  return (
    <div className="threshold-backdrop">
      <div className="threshold-daylight"/>
      <div className="threshold-frame"/>
      <div className="threshold-content">
        <div className="threshold-kind">THE THRESHOLD</div>
        <div className="threshold-text">{currentLine}</div>
        {!atChoice ? (
          <button className="btn btn-lg" onClick={() => setStage(stage + 1)}>Continue</button>
        ) : (
          <div className="threshold-choices">
            <button className="btn btn-lg" onClick={onStepThrough}>
              Step through the door
              <span className="threshold-choice-hint">— into the cold, into the air.</span>
            </button>
            <button className="btn btn-lg btn-coral" onClick={onStayOneMore}>
              Stay one more hand
              <span className="threshold-choice-hint">— the door will be sealed. The felt will be softer.</span>
            </button>
            <button className="btn btn-lg btn-siren" onClick={onStayForever}>
              Stay forever
              <span className="threshold-choice-hint">— sit beside her. Let the house learn your face.</span>
            </button>
            {(fragments || []).length === 0 && !revelationForeclosed && (
              <button className="btn btn-lg btn-ghost threshold-walkaway" onClick={onWalkAway}>
                ↘ Let the tide take you sideways
                <span className="threshold-choice-hint">— through the gap in the coral. Remember nothing.</span>
              </button>
            )}
          </div>
        )}

        <div className="threshold-stats">
          <div><span>BREATH AT THE DOOR</span><span>{breath}</span></div>
          <div><span>HANDS PLAYED</span><span>{gamesPlayed}</span></div>
          <div><span>PIECES REMEMBERED</span><span>{(fragments || []).length} / 12</span></div>
          {revelationForeclosed && <div><span>MEMORIES SOLD</span><span>YES</span></div>}
        </div>
      </div>
    </div>
  );
}

/* The hero Siren painted for the Sovereign ending — Waterhouse register.
   A full-figure painted Siren (nude, partially draped by hair + water),
   shown behind the ending text. */
function SovereignSirenCanvas() {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const c = el;
    const w = 640, h = 900;
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    // Deep underwater backdrop
    const bg = ctx.createRadialGradient(w*0.5, h*0.45, 40, w*0.5, h*0.45, 680);
    bg.addColorStop(0, 'rgba(40,22,58,0.95)');
    bg.addColorStop(0.4, 'rgba(22,10,32,0.92)');
    bg.addColorStop(1, 'rgba(6,2,12,0.98)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // God rays descending
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(199,166,255,0.5)';
    for (let i = 0; i < 4; i++) {
      const x = 120 + i * 120 + (Math.random() - 0.5) * 40;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 30, 0);
      ctx.lineTo(x + 100, h);
      ctx.lineTo(x + 10, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Halo behind figure
    const halo = ctx.createRadialGradient(w/2, h*0.34, 40, w/2, h*0.34, 280);
    halo.addColorStop(0, 'rgba(199,166,255,0.7)');
    halo.addColorStop(0.4, 'rgba(199,166,255,0.25)');
    halo.addColorStop(1, 'rgba(199,166,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    // BODY SILHOUETTE — full figure, warm skin, sitting posture
    const skin = 'rgba(235,210,185,0.96)';
    const skinShadow = 'rgba(130,85,65,0.45)';
    const skinHi = 'rgba(255,232,210,0.65)';
    const cx = w/2, cy = h*0.55;

    // Torso
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(cx - 92, cy - 190);
    ctx.bezierCurveTo(cx - 110, cy - 170, cx - 120, cy - 100, cx - 100, cy - 10);
    ctx.bezierCurveTo(cx - 110, cy + 60, cx - 130, cy + 140, cx - 90, cy + 220);
    ctx.bezierCurveTo(cx - 60, cy + 280, cx - 20, cy + 320, cx, cy + 340);
    ctx.bezierCurveTo(cx + 20, cy + 320, cx + 60, cy + 280, cx + 90, cy + 220);
    ctx.bezierCurveTo(cx + 130, cy + 140, cx + 110, cy + 60, cx + 100, cy - 10);
    ctx.bezierCurveTo(cx + 120, cy - 100, cx + 110, cy - 170, cx + 92, cy - 190);
    ctx.closePath();
    ctx.fill();

    // Spine shadow
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 160);
    ctx.bezierCurveTo(cx - 6, cy - 60, cx + 4, cy + 70, cx, cy + 180);
    ctx.stroke();

    // Highlight right side
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = skinHi;
    ctx.beginPath();
    ctx.moveTo(cx + 50, cy - 180);
    ctx.bezierCurveTo(cx + 80, cy - 90, cx + 88, cy + 30, cx + 82, cy + 170);
    ctx.bezierCurveTo(cx + 70, cy + 280, cx + 40, cy + 320, cx + 20, cy + 340);
    ctx.lineTo(cx + 12, cy + 340);
    ctx.bezierCurveTo(cx + 30, cy + 310, cx + 54, cy + 270, cx + 68, cy + 180);
    ctx.bezierCurveTo(cx + 76, cy + 40, cx + 68, cy - 80, cx + 42, cy - 170);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Arms — draped across the front (one across chest, one lower)
    ctx.fillStyle = skin;
    // Left arm across the chest
    ctx.beginPath();
    ctx.moveTo(cx - 88, cy - 150);
    ctx.bezierCurveTo(cx - 40, cy - 120, cx + 20, cy - 90, cx + 70, cy - 50);
    ctx.bezierCurveTo(cx + 80, cy - 30, cx + 60, cy - 20, cx + 30, cy - 40);
    ctx.bezierCurveTo(cx - 30, cy - 60, cx - 80, cy - 90, cx - 110, cy - 130);
    ctx.closePath();
    ctx.fill();
    // Lower arm resting across hip
    ctx.beginPath();
    ctx.moveTo(cx + 90, cy + 60);
    ctx.bezierCurveTo(cx + 50, cy + 100, cx - 20, cy + 110, cx - 60, cy + 100);
    ctx.bezierCurveTo(cx - 80, cy + 90, cx - 70, cy + 70, cx - 40, cy + 70);
    ctx.bezierCurveTo(cx + 10, cy + 70, cx + 60, cy + 50, cx + 90, cy + 30);
    ctx.closePath();
    ctx.fill();

    // Tail hint (fish-scale drapery from waist down — she's a siren, mermaid tail)
    const tailGrad = ctx.createLinearGradient(0, cy + 60, 0, cy + 360);
    tailGrad.addColorStop(0, 'rgba(139,111,214,0.25)');
    tailGrad.addColorStop(0.5, 'rgba(91,60,160,0.75)');
    tailGrad.addColorStop(1, 'rgba(40,24,80,0.9)');
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 100, cy + 120);
    ctx.bezierCurveTo(cx - 130, cy + 220, cx - 120, cy + 310, cx - 40, cy + 400);
    ctx.bezierCurveTo(cx, cy + 410, cx + 40, cy + 400, cx + 120, cy + 310);
    ctx.bezierCurveTo(cx + 130, cy + 220, cx + 100, cy + 120, cx + 100, cy + 120);
    ctx.closePath();
    ctx.fill();
    // Fluke tail at bottom
    ctx.fillStyle = 'rgba(199,166,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy + 380);
    ctx.bezierCurveTo(cx - 130, cy + 420, cx - 140, cy + 430, cx - 80, cy + 440);
    ctx.lineTo(cx, cy + 420);
    ctx.lineTo(cx + 80, cy + 440);
    ctx.bezierCurveTo(cx + 140, cy + 430, cx + 130, cy + 420, cx + 60, cy + 380);
    ctx.closePath();
    ctx.fill();

    // Scale pattern on tail
    ctx.strokeStyle = 'rgba(199,166,255,0.35)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 12; r++) {
      const ty = cy + 130 + r * 22;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * 18 + (r%2)*8, ty, 10, Math.PI, Math.PI*2);
        ctx.stroke();
      }
    }

    // Gold-leaf waist line
    ctx.strokeStyle = 'rgba(232,212,160,0.65)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#b59248';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(cx - 100, cy + 110);
    ctx.bezierCurveTo(cx - 40, cy + 130, cx + 40, cy + 130, cx + 100, cy + 110);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // HEAD
    ctx.fillStyle = 'rgba(248,228,210,0.97)';
    ctx.shadowColor = 'rgba(199,166,255,0.6)';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 230, 62, 82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Face — downturned eyes, lips
    ctx.fillStyle = 'rgba(60,30,40,0.72)';
    ctx.beginPath(); ctx.ellipse(cx - 22, cy - 220, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 22, cy - 220, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(170,70,100,0.82)';
    ctx.beginPath(); ctx.ellipse(cx, cy - 180, 16, 4.5, 0, 0, Math.PI * 2); ctx.fill();

    // Hair — long, flowing, covering left breast (Pre-Raphaelite cheat)
    ctx.strokeStyle = 'rgba(199,166,255,0.7)';
    ctx.lineWidth = 3;
    // Rising strands
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      const sx = cx - 50 + i * 4;
      ctx.moveTo(sx, cy - 290);
      let x = sx, y = cy - 290;
      for (let k = 0; k < 10; k++) {
        x += (Math.random() - 0.5) * 20;
        y -= 12 + Math.random() * 12;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Cascading front — thick band covering chest
    ctx.fillStyle = 'rgba(199,166,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 160);
    ctx.bezierCurveTo(cx - 100, cy - 60, cx - 80, cy + 40, cx - 40, cy + 100);
    ctx.bezierCurveTo(cx - 20, cy + 120, cx - 10, cy + 120, cx, cy + 110);
    ctx.bezierCurveTo(cx - 30, cy + 50, cx - 40, cy - 50, cx - 20, cy - 160);
    ctx.closePath();
    ctx.fill();
    // Second strand on right
    ctx.fillStyle = 'rgba(139,111,214,0.55)';
    ctx.beginPath();
    ctx.moveTo(cx + 60, cy - 160);
    ctx.bezierCurveTo(cx + 100, cy - 60, cx + 80, cy + 40, cx + 40, cy + 100);
    ctx.bezierCurveTo(cx + 20, cy + 120, cx + 10, cy + 120, cx, cy + 110);
    ctx.bezierCurveTo(cx + 30, cy + 50, cx + 40, cy - 50, cx + 20, cy - 160);
    ctx.closePath();
    ctx.fill();

    // Gold coins scattered on the body (she's made wealth)
    ctx.fillStyle = 'rgba(232,212,160,0.85)';
    ctx.strokeStyle = 'rgba(181,146,72,0.7)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const px = cx + (Math.random() - 0.5) * 160;
      const py = cy + 30 + Math.random() * 120;
      ctx.beginPath();
      ctx.arc(px, py, 4 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Floating prayer candles around (tiny bright dots)
    for (let i = 0; i < 10; i++) {
      const px = 60 + Math.random() * (w - 120);
      const py = 80 + Math.random() * (h - 160);
      const g = ctx.createRadialGradient(px, py, 1, px, py, 30);
      g.addColorStop(0, 'rgba(255,220,150,0.85)');
      g.addColorStop(0.4, 'rgba(255,180,120,0.35)');
      g.addColorStop(1, 'rgba(255,180,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, 30, 0, Math.PI * 2); ctx.fill();
    }

    // Vignette
    const vg = ctx.createRadialGradient(w/2, h/2, h/2, w/2, h/2, h);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }, []);
  return <canvas ref={ref} className="sovereign-hero-canvas"/>;
}

/* "Stay forever" ending — you are the house now. */
function SovereignEnding({ breath, gamesPlayed, onRestart }) {
  const [stage, setStage] = useState(0);
  const lines = [
    "You turn back. She does not smile. The not-smiling is the most tender thing anyone has done for you in years.",
    "You sit at a table. The dealer is a woman you do not recognize until she glances up, and then you recognize her as the shape of your own hand.",
    "The stained glass above the door, which used to show two saints, now shows one saint and one face. The face is yours.",
    "Somewhere in the Dressing Room, a new silhouette has been added behind the third curtain. She stands very still. She is very beautiful. She is very tired.",
    "Breath comes easier now. You do not remember how to want to leave.",
    "A new stranger washes up on the marble floor. Two hundred breaths to their name.",
    "You deal them in. You are kind about it. The kindness is the worst part.",
  ];

  return (
    <div className="stage sovereign-stage">
      <div className="sovereign-hero">
        <SovereignSirenCanvas/>
      </div>
      <div className="sovereign-content">
        <div className="divider-ornate mb-3">¶ The Sovereign ¶</div>
        <h1 className="sovereign-title">You Stayed</h1>
        <p className="sovereign-body">{lines[stage]}</p>
        {stage < lines.length - 1 ? (
          <button className="btn btn-lg btn-siren" onClick={() => setStage(stage + 1)}>Continue</button>
        ) : (
          <>
            <div className="sovereign-stats">
              <div><span>BREATH RETAINED</span><span>{breath}</span></div>
              <div><span>HANDS PLAYED</span><span>{gamesPlayed}</span></div>
              <div><span>FATE</span><span>THE HOUSE WEARS YOUR FACE</span></div>
            </div>
            <div className="motto mt-4">In you, the sea monster now trusts.</div>
            <button className="btn btn-lg mt-4" onClick={onRestart}>Deal Again</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- The Confessional modal ----------
   Sell a remembered fragment → +60 breath, no revelation penalty.
   Cost of −20 breath → a random un-remembered fragment is read back to you. */
function ConfessorModal({ breath, fragments, onClose, onConfess, onBuyBackFragment, playerName }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  // Confession lines keyed by fragment
  const confessions = {
    photo1908: "I was the portrait. I was the man in the stiff collar. I have no idea what I did with all that money.",
    ticker:    "The liquidation was public. I did not go down honorably.",
    key:       "Room 317. I have never checked out. I have never been back.",
    playbill:  "I closed the show myself. I couldn't bear the curtain call.",
    watch:     "3:47. I cannot remember whether it was afternoon or night.",
    ring:      "I scratched out her name before I took the ring off.",
    bottle:    "I was not sleeping. I was not sleeping for years.",
    letters:   "I never opened one of them. I was afraid of what I would owe.",
    locket:    "I was the loved child. I was the hollow one. I did not keep in touch.",
    notice:    "I owed five hundred to someone. I didn't pay. I ran.",
    ticket:    "I bought a way out. I stayed for the party instead.",
    drawing:   "I was the father in the crayon. I stopped coming home.",
  };

  const missingIds = FRAGMENTS.map(f => f.id).filter(id => !(fragments || []).includes(id));
  const canBuyBack = missingIds.length > 0 && breath >= 20;

  return (
    <div className="shop-backdrop shop-backdrop-confessional" onClick={onClose}>
      <div className="shop-modal shop-modal-confessional" onClick={(e) => e.stopPropagation()}>
        <button className="shop-close" onClick={onClose}>← STAND UP FROM THE KNEELER</button>

        <div className="shop-head">
          <div className="shop-kind" style={{ color: '#ffb070' }}>THE CONFESSOR</div>
          <div className="shop-title">Speak, {playerName || 'little lung'} · I will count it as breath.</div>
          <div className="shop-subtitle">You have <span className="shop-breath">{fmt(breath)}</span> breath.</div>
        </div>

        <div className="shop-sections" style={{ gridTemplateColumns: '1fr', gap: 18 }}>
          <div className="shop-section">
            <div className="shop-section-title" style={{ color: '#ffb070' }}>CONFESS A PIECE YOU HAVE REMEMBERED</div>
            <div className="shop-warn" style={{ color: 'rgba(255,200,140,0.8)' }}>
              Confession is absolution. The piece leaves you forever — but the Revelation door stays open.
            </div>
            {(fragments || []).length === 0 ? (
              <div className="shop-empty">You have nothing to say. Walk the chamber first.</div>
            ) : (
              <div className="shop-frag-list">
                {(fragments || []).map(id => {
                  const f = FRAGMENTS.find(x => x.id === id);
                  if (!f) return null;
                  return (
                    <div key={id} className="shop-frag-row"
                         onClick={() => onConfess(id)}>
                      <div className={`fragment-dot fragment-dot-${f.kind}`}>
                        <div className="fragment-dot-inner"/>
                      </div>
                      <div className="shop-frag-body">
                        <div className="shop-frag-name">{f.title}</div>
                        <div className="shop-frag-line">"{confessions[id] || f.line}"</div>
                      </div>
                      <div className="shop-frag-price" style={{ color: '#ffb070' }}>+ 60 BREATH</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shop-section">
            <div className="shop-section-title" style={{ color: '#ffb070' }}>CONFESS SOMETHING YOU HAVE NOT REMEMBERED</div>
            <div className="shop-warn" style={{ color: 'rgba(255,200,140,0.7)' }}>
              Twenty breaths and I will read back to you a piece of yourself. It will enter your pocket.
            </div>
            {missingIds.length === 0 ? (
              <div className="shop-empty">You carry every piece. There is nothing left of you I have not heard.</div>
            ) : (
              <button
                className={`btn btn-lg ${canBuyBack ? '' : 'disabled'}`}
                style={{ width: '100%', marginTop: 8 }}
                disabled={!canBuyBack}
                onClick={() => onBuyBackFragment(missingIds[Math.floor(Math.random()*missingIds.length)])}>
                Say: "I do not remember it." · Give 20 breath
              </button>
            )}
          </div>
        </div>

        <div className="shop-foot-italic" style={{ color: 'rgba(255,200,140,0.85)' }}>
          "The water carries memory. I listen. The count is kept."
        </div>
      </div>
    </div>
  );
}

/* ---------- Achievements — ENDING_CARDS imported from ./mythology/endings.js ---------- */

function EndingsTracker({ meta, compact }) {
  const reached = new Set(meta.endingsReached || []);
  // Ghost is implicit (derived from deaths > 0)
  if ((meta.deaths || 0) > 0) reached.add('ghost');
  return (
    <div className={`endings-tracker ${compact ? 'compact' : ''}`}>
      <div className="endings-tracker-label">ENDINGS DISCOVERED · {reached.size} / 8</div>
      <div className="endings-tracker-grid">
        {ENDING_CARDS.map(c => {
          const found = reached.has(c.id);
          return (
            <div key={c.id} className={`ending-card ${found ? 'found' : 'hidden'}`}>
              <div className="ending-card-label">{found ? c.label : '— not yet seen —'}</div>
              <div className="ending-card-hint">{found ? c.hint : '\u00A0'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Credits — unlocked once all 6 endings have been reached ---------- */
function CreditsScroll({ meta, onClose }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="credits-backdrop" onClick={onClose}>
      <div className="credits" onClick={(e) => e.stopPropagation()}>
        <div className="credits-title">ABYSS</div>
        <div className="credits-subtitle">A small parable in six endings.</div>

        <div className="credits-section">
          <div className="credits-section-title">THE ALLEGORY</div>
          <p className="credits-body">
            The casino is the world. The currency is your time. The house wins because it always was.
            You can leave, for a price — or sit, and become the reason the next stranger cannot. There is a door, yes.
            It leads to a floor exactly like this one.
          </p>
        </div>

        <div className="credits-section">
          <div className="credits-section-title">WHAT YOU LEARNED</div>
          <p className="credits-body">That some systems are rigged. That the rigging is not a secret — it is often volunteered, if asked. That the exit is real and the exit is also another door.</p>
          <p className="credits-body">That the only way out is to lose on purpose, or to stay on purpose, or to become the one dealing. All three are endings. None is escape.</p>
        </div>

        <div className="credits-section">
          <div className="credits-section-title">SUMS</div>
          <div className="credits-stats">
            <div><span>RUNS</span><span>{meta.totalRuns}</span></div>
            <div><span>DEATHS</span><span>{meta.deaths}</span></div>
            <div><span>HANDS PLAYED</span><span>{meta.handsPlayedEver}</span></div>
            <div><span>BREATHS SURRENDERED</span><span>{meta.breathsSurrendered}</span></div>
            <div><span>MOST BREATH HELD</span><span>{meta.maxBreathEver}</span></div>
            <div><span>PIECES REMEMBERED</span><span>{(meta.fragmentsEverFound || []).length} / 12</span></div>
          </div>
        </div>

        <div className="credits-foot">
          <div className="motto" style={{fontSize:20}}>In the sea monster we trust.</div>
          <button className="btn btn-lg mt-3" onClick={onClose}>Return to the water</button>
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   TAROT REVEAL — TAROT_CARDS + pickTarotCard imported from ./mythology/tarot.js
   ================================================== */

function TarotCardCanvas({ card }) {
  const ref = useRef();
  useEffect(() => {
    const cnv = ref.current;
    if (!cnv) return;
    const w = cnv.width = 320, h = cnv.height = 520;
    const ctx = cnv.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    // Card background — deep velvet
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1a0a18');
    bg.addColorStop(0.5, '#0a0612');
    bg.addColorStop(1, '#14081e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Gold double border
    ctx.strokeStyle = '#b59248';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.strokeStyle = '#d8b564';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Corner ornaments
    const corners = [[28,28],[w-28,28],[28,h-28],[w-28,h-28]];
    corners.forEach(([x,y]) => {
      ctx.strokeStyle = '#d8b564';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI*2);
      ctx.fill();
    });

    // Top: Roman numeral
    ctx.fillStyle = card.color;
    ctx.shadowColor = card.color;
    ctx.shadowBlur = 14;
    ctx.font = 'bold 28px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.numeral, w/2, 52);
    ctx.shadowBlur = 0;

    // Thin divider lines
    ctx.strokeStyle = 'rgba(216, 181, 100, 0.5)';
    ctx.beginPath(); ctx.moveTo(50, 80); ctx.lineTo(w-50, 80); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(50, h-80); ctx.lineTo(w-50, h-80); ctx.stroke();

    // Central painted symbol
    ctx.save();
    ctx.translate(w/2, h/2 - 10);
    // Halo
    const halo = ctx.createRadialGradient(0, 0, 10, 0, 0, 140);
    halo.addColorStop(0, card.color);
    halo.addColorStop(0.3, card.color + '88');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(-150, -150, 300, 300);

    const paintSymbol = (id) => {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = card.color;
      ctx.fillStyle = card.color;
      ctx.shadowColor = card.color;
      ctx.shadowBlur = 20;
      if (id === 'sun') {
        // Radiating sun
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a)*38, Math.sin(a)*38);
          ctx.lineTo(Math.cos(a)*78, Math.sin(a)*78);
          ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = card.accent;
        ctx.beginPath(); ctx.arc(-10, -4, 3, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(10, -4, 3, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 8, 8, 0, Math.PI); ctx.stroke();
      } else if (id === 'magician') {
        // Infinity lemniscate above staff
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const t = (i / 60) * Math.PI * 2;
          const x = 40 * Math.sin(t) / (1 + Math.cos(t) * Math.cos(t));
          const y = -40 + 40 * Math.sin(t) * Math.cos(t) / (1 + Math.cos(t) * Math.cos(t));
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Staff
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 80); ctx.stroke();
      } else if (id === 'wheel') {
        // Wheel of fortune
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a)*50, Math.sin(a)*50);
          ctx.lineTo(Math.cos(a)*70, Math.sin(a)*70);
          ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
      } else if (id === 'empress') {
        // Crown + roses
        ctx.beginPath();
        ctx.moveTo(-40, -10);
        ctx.lineTo(-28, -40); ctx.lineTo(-16, -18);
        ctx.lineTo(0, -46); ctx.lineTo(16, -18);
        ctx.lineTo(28, -40); ctx.lineTo(40, -10);
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(-30 + i*30, 30, 10, 0, Math.PI*2);
          ctx.fill();
        }
      } else if (id === 'star') {
        // 8-point star with dots
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const rOuter = i % 2 === 0 ? 70 : 30;
          if (i === 0) ctx.beginPath();
          const x = Math.cos(a) * rOuter;
          const y = Math.sin(a) * rOuter;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      } else if (id === 'temperance') {
        // Angel scales
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(-40, 20, 15, 0, Math.PI, true); ctx.stroke();
        ctx.beginPath(); ctx.arc(40, 20, 15, 0, Math.PI, true); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -50, 10, 0, Math.PI*2); ctx.fill();
      } else if (id === 'moon') {
        // Crescent moon with face
        ctx.beginPath();
        ctx.arc(0, 0, 60, Math.PI * 0.35, Math.PI * 1.65);
        ctx.arc(20, 0, 50, Math.PI * 1.5, Math.PI * 0.5, true);
        ctx.fill();
      } else if (id === 'hanged') {
        // Inverted figure
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-30, -60); ctx.lineTo(30, -60); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, -20); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(-16, 50); ctx.moveTo(0, 16); ctx.lineTo(16, 50); ctx.stroke();
      } else if (id === 'tower') {
        // Tower being struck by lightning
        ctx.beginPath();
        ctx.moveTo(-30, 60); ctx.lineTo(-30, -30);
        ctx.lineTo(-40, -40); ctx.lineTo(-20, -50); ctx.lineTo(0, -30);
        ctx.lineTo(20, -50); ctx.lineTo(40, -40); ctx.lineTo(30, -30);
        ctx.lineTo(30, 60);
        ctx.closePath();
        ctx.fill();
        // Lightning bolt
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-10, -70); ctx.lineTo(-25, -20); ctx.lineTo(-5, -20);
        ctx.lineTo(-20, 40); ctx.lineTo(15, -10); ctx.lineTo(0, -10);
        ctx.lineTo(15, -70);
        ctx.closePath();
        ctx.fill();
      } else if (id === 'death') {
        // Skull
        ctx.beginPath();
        ctx.arc(0, -10, 45, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-15, -10, 8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(15, -10, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillRect(-3, 4, 6, 8);
        // Scythe below
        ctx.strokeStyle = card.color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-40, 60); ctx.lineTo(40, 40); ctx.stroke();
      } else if (id === 'devil') {
        // Horned head
        ctx.beginPath();
        ctx.moveTo(-30, -40); ctx.lineTo(-50, -70); ctx.lineTo(-15, -50);
        ctx.lineTo(0, -70); ctx.lineTo(15, -50); ctx.lineTo(50, -70); ctx.lineTo(30, -40);
        ctx.lineTo(45, 30); ctx.lineTo(-45, 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffee80';
        ctx.beginPath(); ctx.arc(-15, -10, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(15, -10, 4, 0, Math.PI*2); ctx.fill();
      } else { // fool
        // Figure stepping off cliff, dog
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, -30, 14, 0, Math.PI*2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-15, -15); ctx.lineTo(15, -15);
        ctx.lineTo(10, 40); ctx.lineTo(-10, 40);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(40, 50); ctx.lineTo(60, 45); ctx.lineTo(70, 55); ctx.lineTo(50, 60); ctx.closePath(); ctx.fill();
      }
      ctx.shadowBlur = 0;
    };
    paintSymbol(card.id);
    ctx.restore();

    // Bottom: name
    ctx.fillStyle = '#e8d4a4';
    ctx.shadowColor = card.color;
    ctx.shadowBlur = 10;
    ctx.font = 'bold 18px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.name, w/2, h - 46);
  }, [card.id]);
  return <canvas ref={ref} className="tarot-card-canvas"/>;
}

function TarotReveal({ card, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!card) return null;
  return (
    <div className="tarot-reveal-backdrop">
      <div className="tarot-card">
        <TarotCardCanvas card={card}/>
      </div>
    </div>
  );
}

/* ENDING_PAINTINGS imported from ./mythology/endings.js */

function EndingBackdrop({ kind }) {
  const url = ENDING_PAINTINGS[kind];
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(false);
    img.src = url;
  }, [url]);
  if (!url || !loaded) return null;
  return (
    <div className="ending-painting-bg" style={{ backgroundImage: `url(${url})` }}/>
  );
}


/* ================== 3D WORLD REACT WRAPPER ================== */

function WorldHub({ breath, targetBreath, paused, onPickTable, onExit, onSiren, whisper,
                    collectedFragments, onFragment, onNPC, houseEdgeTier, mirrorUnlocked,
                    onMerchant, onCharmkeeper, onConfessor, onRoomChange, onLedger }) {
  const containerRef = useRef();
  const worldRef = useRef();
  const peekMode = typeof window !== 'undefined' && /[?&]peek=1/.test(window.location.search);
  const [prompt, setPrompt] = useState(null);
  const [locked, setLocked] = useState(false);
  const [doorLocked, setDoorLocked] = useState(false);
  const [escapeCinematic, setEscapeCinematic] = useState(false);

  // Track latest breath in a ref so the door handler always has the fresh value
  const breathRef = useRef(breath);
  useEffect(() => { breathRef.current = breath; }, [breath]);

  const [webglFailed, setWebglFailed] = useState(false);
  const [sirenDialog, setSirenDialog] = useState(false);
  const [fragmentToast, setFragmentToast] = useState(null);
  const [roomTransition, setRoomTransition] = useState(null);
  const [currentRoom, setCurrentRoom] = useState('casino');
  const audioRef = useRef();

  // Single audio engine, lives for the WorldHub lifetime
  useEffect(() => {
    if (typeof TrappedAudio === 'undefined') return;
    const a = new TrappedAudio();
    audioRef.current = a;
    window.__trappedAudio = a;
    return () => { a.stop(); audioRef.current = null; if (window.__trappedAudio === a) window.__trappedAudio = null; };
  }, []);

  // Siren proximity + panic ducking (audio + world shader)
  useEffect(() => {
    const panic = breath > 0 && breath < 50 ? 1 : 0;
    if (audioRef.current) audioRef.current.setPanic(panic);
    if (worldRef.current && worldRef.current.setPanic) worldRef.current.setPanic(panic);
  }, [breath]);

  useEffect(() => {
    if (!containerRef.current || typeof TrappedWorld === 'undefined') return;
    let w;
    try {
      w = new TrappedWorld(containerRef.current, { collectedFragments: collectedFragments || [] });
    } catch (err) {
      console.error('[World] Failed to initialize WebGL/Three.js:', err);
      setWebglFailed(true);
      return;
    }
    worldRef.current = w;
    window.__trappedWorld = w;
    w.on('interact', (k) => {
      if (audioRef.current) audioRef.current.playChipStack();
      onPickTable(k);
    });
    w.on('exit', () => {
      if (breathRef.current < targetBreath) {
        setDoorLocked(true);
        setTimeout(() => setDoorLocked(false), 2400);
        return;
      }
      // Cinematic fade, then transition
      if (audioRef.current) audioRef.current.playDoorOpen();
      setEscapeCinematic(true);
      setTimeout(() => {
        setEscapeCinematic(false);
        onExit();
      }, 2100);
    });
    w.on('siren', () => {
      // Release pointer lock so the player can click the dialog choices
      if (w.controls && w.controls.isLocked) w.controls.unlock();
      if (audioRef.current) audioRef.current.setSirenProximity(1);
      setSirenDialog(true);
    });
    w.on('lock', () => {
      setLocked(true);
      if (audioRef.current) audioRef.current.start();
    });
    w.on('unlock', () => { setLocked(false); });
    let lastPromptId = null;
    let whisperTimer = null;
    w.on('prompt', (p) => {
      if (p && p.kind === 'exit' && breathRef.current < targetBreath) {
        setPrompt({
          ...p,
          subtitle: `Sealed · need ${targetBreath - breathRef.current} more breath`,
        });
      } else {
        setPrompt(p);
      }
      // Siren proximity audio
      if (audioRef.current) {
        audioRef.current.setSirenProximity(p && p.kind === 'siren' ? 1 : 0);

        // NPC whisper triggers — when we newly approach a character
        const currentId = p ? (p.kind === 'npc' ? (p.name || 'npc') : p.kind) : null;
        if (currentId !== lastPromptId) {
          lastPromptId = currentId;
          if (whisperTimer) clearTimeout(whisperTimer);
          if (p && (p.kind === 'npc' || p.kind === 'siren')) {
            // Play a single soft whisper once they enter range
            audioRef.current.playWhisper();
            // Queue occasional follow-ups while still in range
            whisperTimer = setInterval(() => {
              if (audioRef.current && lastPromptId === currentId) audioRef.current.playWhisper();
            }, 2800 + Math.random() * 1800);
          }
        }
      }
    });
    w.on('fragment', (id) => {
      if (onFragment) onFragment(id);
      setFragmentToast(id);
      if (audioRef.current) audioRef.current.playFragmentPickup();
      setTimeout(() => setFragmentToast(null), 3400);
    });
    w.on('npc', (id) => {
      if (w.controls && w.controls.isLocked) w.controls.unlock();
      if (onNPC) onNPC(id);
    });
    w.on('merchant', () => {
      if (w.controls && w.controls.isLocked) w.controls.unlock();
      if (audioRef.current && audioRef.current.playShopBell) audioRef.current.playShopBell();
      if (onMerchant) onMerchant();
    });
    w.on('charmkeeper', () => {
      if (w.controls && w.controls.isLocked) w.controls.unlock();
      if (audioRef.current && audioRef.current.playShopBell) audioRef.current.playShopBell();
      if (onCharmkeeper) onCharmkeeper();
    });
    w.on('confessor', () => {
      if (w.controls && w.controls.isLocked) w.controls.unlock();
      if (audioRef.current && audioRef.current.playWhisper) audioRef.current.playWhisper();
      if (onConfessor) onConfessor();
    });
    w.on('portal', (targetRoom) => {
      // Cinematic transition
      setRoomTransition(targetRoom);
      setTimeout(() => {
        if (w && !w.disposed) w.buildRoom(targetRoom);
      }, 450);
      setTimeout(() => setRoomTransition(null), 900);
    });
    w.on('room', (name) => {
      setCurrentRoom(name);
      if (onRoomChange) onRoomChange(name);
    });
    w.on('ledger', () => {
      if (w.controls && w.controls.isLocked) w.controls.unlock();
      if (onLedger) onLedger();
    });

    return () => {
      w.dispose();
      worldRef.current = null;
      if (window.__trappedWorld === w) window.__trappedWorld = null;
    };
  }, []);

  useEffect(() => {
    if (!worldRef.current) return;
    worldRef.current.setPaused(!!paused);
    // Duck audio while a game modal is open
    if (audioRef.current && audioRef.current.started && audioRef.current.nodes.master) {
      const ctx = audioRef.current.ctx;
      audioRef.current.nodes.master.gain.cancelScheduledValues(ctx.currentTime);
      audioRef.current.nodes.master.gain.linearRampToValueAtTime(paused ? 0.25 : 0.6, ctx.currentTime + 0.4);
    }
  }, [paused]);

  // Sync collected fragments into the world (hide already-picked-up meshes)
  useEffect(() => {
    if (worldRef.current) worldRef.current.setCollectedFragments(collectedFragments || []);
  }, [collectedFragments && collectedFragments.length]);

  // Sync house-edge tier visual state
  useEffect(() => {
    if (worldRef.current && houseEdgeTier) worldRef.current.setEdgeTier(houseEdgeTier);
  }, [houseEdgeTier]);

  // Reveal Mirror when unlocked
  useEffect(() => {
    if (worldRef.current && mirrorUnlocked) worldRef.current.revealMirror();
  }, [mirrorUnlocked]);

  const showEntry = !peekMode && !locked && !paused && !sirenDialog && !webglFailed && !escapeCinematic;

  const onClickEntry = () => {
    if (worldRef.current) worldRef.current.requestLock();
  };

  if (webglFailed) {
    return (
      <div className="world-hub">
        <div className="world-fallback">
          <Hub
            breath={breath}
            targetBreath={targetBreath}
            whisper={whisper}
            onPick={onPickTable}
            onExit={onExit}
            onQuit={onSiren}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="world-hub">
      <div ref={containerRef} className="world-canvas-container"/>

      {locked && <div className={`world-crosshair ${prompt ? 'active' : ''}`}/>}

      {locked && prompt && (
        <div className="world-interact">
          <span className="world-interact-key">E</span>
          <span className="world-interact-name">{prompt.name}</span>
          {prompt.subtitle && <span className="world-interact-sub">{prompt.subtitle}</span>}
        </div>
      )}

      {showEntry && (
        <div className="world-entry" onClick={onClickEntry}>
          <div className="world-entry-card">
            <div className="world-entry-title">The Casino Floor</div>
            <div className="world-entry-headline">
              Seven tables. One door. Your breath in every seat.
            </div>
            <div className="world-entry-controls">
              <kbd>W A S D</kbd><span>move through the chamber</span>
              <kbd>Mouse</kbd><span>look around</span>
              <kbd>Shift</kbd><span>swim faster</span>
              <kbd>E</kbd><span>approach a table, sit, or exit</span>
              <kbd>Esc</kbd><span>release the mouse</span>
            </div>
            <div className="world-entry-hint">Click to descend</div>
          </div>
        </div>
      )}

      {sirenDialog && (
        <SirenEncounter
          breath={breath}
          houseEdgeTier={houseEdgeTier}
          onSit={() => { setSirenDialog(false); onSiren(); }}
          onWalkAway={() => setSirenDialog(false)}
        />
      )}

      {doorLocked && (
        <div className="world-door-sealed">
          <div className="world-door-sealed-title">The door is sealed.</div>
          <div className="world-door-sealed-sub">You need {targetBreath - breath} more breath.</div>
        </div>
      )}

      {fragmentToast && (() => {
        const f = FRAGMENTS.find(x => x.id === fragmentToast);
        if (!f) return null;
        return (
          <div className="fragment-toast">
            <div className="fragment-toast-kind">REMEMBERED</div>
            <div className="fragment-toast-title">{f.title}</div>
            <div className="fragment-toast-line">{f.line}</div>
          </div>
        );
      })()}

      {escapeCinematic && <div className="world-escape-cinematic"/>}

      {roomTransition && (
        <>
          <div className="room-transition"/>
          <div className="room-banner">
            {roomTransition === 'casino'   ? 'The Casino Floor'
              : roomTransition === 'pawnshop' ? 'The Pawn Shop'
              : roomTransition === 'dressing' ? 'The Dressing Room'
              : roomTransition}
          </div>
        </>
      )}

      {locked && (
        <div className="world-compass">
          — W A S D · MOVE &nbsp;·&nbsp; E · INTERACT &nbsp;·&nbsp; ESC · RELEASE —
        </div>
      )}

      <SirenWhisper text={whisper}/>
      <MiniMap worldRef={worldRef}/>
    </div>
  );
}

/* Pre-ending Siren dialog — she speaks before you commit to staying.
   Different tone depending on current breath:
     - low breath (<100)  : pity, seductive urgency
     - mid breath         : tempting, languid
     - high breath (>=400): congratulatory, coaxing toward the Mirror */
function SirenEncounter({ onSit, onWalkAway, breath, gamesPlayed, houseEdgeTier }) {
  const [stage, setStage] = useState(0);

  const pools = {
    low: [
      "Hello again, little lung. You're breathing so shallow I can hear you three tables over.",
      "The door is that way. Five hundred breaths. A long, long walk for someone so soft.",
      "Or. You could sit with me. Breathe out. The water does the rest. No more counting.",
      "I will be gentle. I am always gentle with the ones who listen.",
    ],
    mid: [
      "Close enough that I could count the bubbles on your lip. You smell like a Thursday.",
      "You've been playing a while. I like that in a drowning thing.",
      "You could leave. Pay your five hundred. Walk. Or you could sit, and I would be kind.",
      "Stay. The song is better when you stop fighting it.",
    ],
    high: [
      "Oh, you've done well. Unusually well. The felt is very proud of you.",
      "You're almost rich enough to buy a second lifetime. Almost.",
      "But it is heavy, isn't it. The winning. It has a weight to it that losing never does.",
      "Sit. I will take it off your hands. You can be empty again — and that, little lung, is the only real way to leave.",
    ],
    cruel: [
      "The house has been cruel to you. Good. It means you are interesting.",
      "Some of them sit down at the tables already drowned, you know. You have not.",
      "Pay the door if you can. Or sit. Sit and I will make the house apologize.",
    ],
  };

  // Choose tone based on current state
  let pool = pools.mid;
  if (houseEdgeTier === 'cruel') pool = pools.cruel;
  else if (breath < 100) pool = pools.low;
  else if (breath >= 400) pool = pools.high;

  const lines = pool;

  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape') onWalkAway();
      if (e.key === 'Enter' || e.key === ' ') {
        if (stage < lines.length - 1) setStage(stage + 1);
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [stage]);

  return (
    <div className="siren-encounter-backdrop">
      <div className="siren-encounter">
        <div className="siren-encounter-name">THE SIREN</div>
        <div className="siren-encounter-text">
          {lines[stage]}
          <span className="caret"/>
        </div>
        {stage < lines.length - 1 ? (
          <button className="btn btn-siren btn-sm mt-2" onClick={() => setStage(stage + 1)}>
            Continue
          </button>
        ) : (
          <div className="siren-encounter-choices">
            <button className="btn btn-ghost btn-sm" onClick={onWalkAway}>
              Walk back to the floor
            </button>
            <button className="btn btn-siren btn-sm" onClick={onSit}>
              Sit with her · End breath
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniMap({ worldRef }) {
  const canvasRef = useRef();

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const cnv = canvasRef.current;
      if (!cnv) return;
      const ctx = cnv.getContext('2d');
      const size = cnv.width = cnv.height = 160;
      ctx.clearRect(0, 0, size, size);

      // Background
      ctx.fillStyle = 'rgba(5,16,28,0.4)';
      ctx.fillRect(0, 0, size, size);

      const w = worldRef.current;
      const scale = size / 50; // 50 units visible
      const cx = size / 2, cy = size / 2;

      // Chamber outline
      ctx.strokeStyle = 'rgba(126,240,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 22 * scale, 0, Math.PI * 2);
      ctx.stroke();

      if (w && w.tables) {
        // Tables as dots
        w.tables.forEach(t => {
          ctx.fillStyle = 'rgba(126,240,255,0.85)';
          ctx.shadowColor = '#7ef0ff';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(cx + t.position.x * scale, cy + t.position.z * scale, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Door
        if (w.door) {
          ctx.fillStyle = 'rgba(126,240,255,1)';
          ctx.beginPath();
          ctx.rect(cx + w.door.position.x * scale - 4, cy + w.door.position.z * scale - 1.5, 8, 3);
          ctx.fill();
        }

        // Siren
        if (w.sirenAltar) {
          ctx.fillStyle = 'rgba(199,166,255,0.95)';
          ctx.shadowColor = '#c7a6ff';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(cx + w.sirenAltar.position.x * scale, cy + w.sirenAltar.position.z * scale, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Player position + facing
        if (w.controls) {
          const p = w.controls.getObject().position;
          const dir = new THREE.Vector3();
          w.camera.getWorldDirection(dir);
          const px = cx + p.x * scale;
          const py = cy + p.z * scale;
          // Facing triangle
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.atan2(dir.x, dir.z));
          ctx.fillStyle = 'rgba(232,226,204,0.95)';
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.lineTo(-4, 4);
          ctx.lineTo(4, 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="world-map">
      <div className="world-map-label">The Abyss</div>
      <canvas ref={canvasRef} className="world-map-canvas"/>
    </div>
  );
}

function GameModal({ children, onClose, title }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  // Background painting per game
  const paintingMap = {
    'Blackjack':   'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Paul_C%C3%A9zanne%2C_The_Card_Players%2C_1892-95%2C_Courtauld_Institute.jpg/1024px-Paul_C%C3%A9zanne%2C_The_Card_Players%2C_1892-95%2C_Courtauld_Institute.jpg',
    'Omens Wheel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Gustav_Klimt_048.jpg/1024px-Gustav_Klimt_048.jpg',
    'Baccarat':    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/John_William_Waterhouse_-_Ulysses_and_the_Sirens_%281891%29.jpg/1024px-John_William_Waterhouse_-_Ulysses_and_the_Sirens_%281891%29.jpg',
    'Glyphs':      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/KLIMT_-_Dan%C3%A1e_%281907-1908%29.jpg/1024px-KLIMT_-_Dan%C3%A1e_%281907-1908%29.jpg',
    'Ghost Poker': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Michelangelo_Merisi%2C_called_Caravaggio_-_The_Cardsharps_-_Google_Art_Project.jpg/1024px-Michelangelo_Merisi%2C_called_Caravaggio_-_The_Cardsharps_-_Google_Art_Project.jpg',
    'Bones':       'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Edward_Burne-Jones_-_The_Depths_of_the_Sea_%281887%29.jpg/1024px-Edward_Burne-Jones_-_The_Depths_of_the_Sea_%281887%29.jpg',
    'The Coin':    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/A_Mermaid.jpg/1024px-A_Mermaid.jpg',
  };
  const paintingUrl = paintingMap[title];

  return (
    <div className="game-modal-backdrop" data-screen-label={title || 'Game Modal'}>
      {/* Painting atmosphere behind everything */}
      {paintingUrl && (
        <div className="game-modal-painting" style={{ backgroundImage: `url(${paintingUrl})` }}/>
      )}

      {/* Marquee header bar — flickering bulbs + title */}
      <div className="game-marquee-header">
        <div className="game-marquee-bulbs"/>
        <div className="game-marquee-title">{(title || 'Table').toUpperCase()}</div>
        <div className="game-marquee-bulbs"/>
      </div>

      {/* Gilt frame decoration */}
      <div className="game-gilt-frame"/>

      {/* Red velvet curtains sweeping open — pure CSS animation */}
      <div className="game-curtain game-curtain-left"/>
      <div className="game-curtain game-curtain-right"/>

      <button className="game-modal-close" onClick={onClose}>← LEAVE THE TABLE</button>
      <div className="game-modal-content">
        {children}
      </div>
    </div>
  );
}


/* ================== MAIN APP ================== */


export {
  WaterBackground, SirenPortrait, BreathHUD, DialogueBox, SirenWhisper,
  Intro, Hub, Ending, TweaksPanel,
  POVLayer, POVContent,
  FragmentInventory, FragmentReader, FragmentGallery,
  GhostIntro, SpectatorScreen,
  RevelationEnding, MirrorEnding, SovereignEnding, SovereignSirenCanvas,
  NPCEncounter, SirenEncounter,
  TrinketBar, ShopModal, CharmOffer, ConfessorModal,
  Ledger, Threshold, EndingsTracker, CreditsScroll,
  TarotCardCanvas, TarotReveal, EndingBackdrop,
  WorldHub, MiniMap, GameModal,
};
