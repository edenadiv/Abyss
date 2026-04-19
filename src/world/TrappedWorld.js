/* TrappedWorld — walkable 3D casino (vanilla Three.js class).
   Orchestrates the whole 3D world: rooms, meshes, textures, post-FX,
   input, interactions. Built as one file for cohesion; see section
   comment headers for navigation. */

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FRAGMENTS } from '../mythology/fragments.js';
import { applyWave1 } from './extensions/Wave1.js';

const TWEEN = null; // no TWEEN dep; keep API simple

  /* ============================================================
     ABYSS — NUDITY MECHANISM (design notes)
     ------------------------------------------------------------
     All female characters are sea-women / mermaids. From the hip
     down every figure has a fish tail — so there is no explicit
     anatomy below the waist, only scaled drapery.

     Nudity is dramatized, not casual. It escalates only where it
     reinforces the allegory:

       SOFT TIER   — fully clothed, flowing fabric, pearls.
                     (easy / normal house edge)
       CHAIN TIER  — bare shoulders, chain-coin strands,
                     hair covers breasts. (hard / rigged edge)
       TEETH TIER  — topless, hair-as-drapery, black-pearl +
                     bone ornament. (cruel edge)
       HERO TIER   — full painted nude with fluke tail; only
                     shown in the Sovereign / Mirror / Revelation
                     ending cinematics. The game earns these.

     Characters who escalate: Siren (by house tier), Mirror (always
     hero), third Curtain silhouette (always soft-chain).
     Characters who never escalate: Confessor (veiled, the one
     who withholds), Merchant, Gambler, Muse, Charm-keeper,
     Drowned Chorus, Ghost Players.

     All figures are procedural Canvas 2D paintings in the Pre-
     Raphaelite / Klimt / Waterhouse register — no photography,
     no imported assets.
     ============================================================ */

  const CHAMBER_RADIUS = 34;
  const WALL_HEIGHT = 20;
  const PLAYER_HEIGHT = 1.65;
  const PLAYER_SPEED = 5.2;
  const PLAYER_RUN = 8.6;
  const INTERACT_RANGE = 3.8;
  const TABLE_RING = 15;

  /* ---------- Texture factory (procedural Canvas textures) ---------- */
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function makeMarbleFloor() {
    const c = canvas(1024, 1024);
    const ctx = c.getContext('2d');

    // Base polished marble
    const g = ctx.createRadialGradient(512, 512, 100, 512, 512, 700);
    g.addColorStop(0, '#0e2a3e');
    g.addColorStop(0.7, '#081a28');
    g.addColorStop(1, '#040c14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);

    // Faint tile grid
    ctx.strokeStyle = 'rgba(126,240,255,0.05)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 1024; i += 128) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
    }

    // Marble veins
    ctx.strokeStyle = 'rgba(126,240,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      const x0 = Math.random() * 1024, y0 = Math.random() * 1024;
      ctx.moveTo(x0, y0);
      for (let k = 0; k < 6; k++) {
        ctx.lineTo(x0 + (Math.random() - 0.5) * 400, y0 + (Math.random() - 0.5) * 400);
      }
      ctx.stroke();
    }

    // Card suit inlays — large, glowing, at quadrant centers
    const suits = [
      { ch: '♠', x: 256, y: 256, color: 'rgba(91,224,194,0.22)' },
      { ch: '♥', x: 768, y: 256, color: 'rgba(255,107,138,0.18)' },
      { ch: '♦', x: 256, y: 768, color: 'rgba(199,166,255,0.18)' },
      { ch: '♣', x: 768, y: 768, color: 'rgba(126,240,255,0.22)' }
    ];
    suits.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.font = 'bold 180px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 30;
      ctx.fillText(s.ch, 0, 0);
      ctx.restore();
    });

    // Central compass rose
    ctx.save();
    ctx.translate(512, 512);
    ctx.strokeStyle = 'rgba(126,240,255,0.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
      ctx.lineTo(Math.cos(a) * 140, Math.sin(a) * 140);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 140, 0, Math.PI*2); ctx.stroke();
    ctx.restore();

    // Subtle noise
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `rgba(${Math.random()<0.5?126:91},240,${Math.random()<0.5?255:194},${Math.random()*0.03})`;
      ctx.fillRect(Math.random()*1024, Math.random()*1024, 1, 1);
    }

    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    return t;
  }

  function makeFeltTexture(icon, tint) {
    const c = canvas(512, 512);
    const ctx = c.getContext('2d');

    // Deep felt gradient
    const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 280);
    g.addColorStop(0, '#0d2a1e');
    g.addColorStop(0.6, '#071a12');
    g.addColorStop(1, '#020807');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);

    // Felt weave noise
    for (let i = 0; i < 20000; i++) {
      ctx.fillStyle = `rgba(91,224,194,${Math.random() * 0.04})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
    }

    // Gold-trim ring
    ctx.strokeStyle = 'rgba(181,146,72,0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(256, 256, 226, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = 'rgba(181,146,72,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(256, 256, 240, 0, Math.PI*2); ctx.stroke();

    // Iconic glyph — large, glowing
    ctx.save();
    ctx.translate(256, 256);
    ctx.font = 'bold 200px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = tint || 'rgba(126,240,255,0.82)';
    ctx.shadowColor = tint || '#7ef0ff';
    ctx.shadowBlur = 60;
    ctx.fillText(icon, 0, 10);
    ctx.restore();

    // Subtitle ring text
    ctx.save();
    ctx.translate(256, 256);
    ctx.font = '22px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,226,204,0.35)';
    ctx.fillText('IN THE SEA MONSTER WE TRUST', 0, -190);
    ctx.restore();

    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  function makeColumnTexture() {
    const c = canvas(256, 1024);
    const ctx = c.getContext('2d');

    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, '#0a1a24');
    g.addColorStop(0.5, '#143547');
    g.addColorStop(1, '#0a1a24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 1024);

    // Coral growth texture
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(${91 + Math.random()*60},${180 + Math.random()*60},${150 + Math.random()*60},${Math.random()*0.15})`;
      const x = Math.random() * 256;
      const y = Math.random() * 1024;
      const r = 2 + Math.random() * 8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fill();
    }

    // Bioluminescent streaks
    ctx.strokeStyle = 'rgba(126,240,255,0.22)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const x0 = Math.random() * 256;
      let x = x0, y = 0;
      ctx.moveTo(x, y);
      while (y < 1024) {
        x += (Math.random() - 0.5) * 40;
        y += 20 + Math.random() * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Vertical grooves
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    for (let i = 32; i < 256; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 1024);
      ctx.stroke();
    }

    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function makeDoorGlyphs() {
    const c = canvas(512, 768);
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 512, 768);

    // Arch frame
    ctx.strokeStyle = 'rgba(126,240,255,0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#7ef0ff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(50, 768);
    ctx.lineTo(50, 240);
    ctx.quadraticCurveTo(256, 30, 462, 240);
    ctx.lineTo(462, 768);
    ctx.stroke();

    // Top glyphs
    ctx.font = 'bold 64px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(126,240,255,0.95)';
    ctx.shadowBlur = 30;
    ctx.fillText('⧉ EXIT ⧉', 256, 180);

    // Required
    ctx.font = '28px "Cinzel", serif';
    ctx.fillStyle = 'rgba(232,226,204,0.85)';
    ctx.shadowBlur = 14;
    ctx.fillText('500 BREATH', 256, 240);

    // Ornamental dividers
    ctx.strokeStyle = 'rgba(126,240,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(140, 280); ctx.lineTo(372, 280); ctx.stroke();

    // Bottom incantation
    ctx.font = '20px "Cormorant Garamond", serif';
    ctx.fillStyle = 'rgba(91,224,194,0.55)';
    ctx.fillText('above, the tide remembers', 256, 680);
    ctx.fillText('below, the door forgets', 256, 710);

    // Kraken motif center
    ctx.font = '130px serif';
    ctx.fillStyle = 'rgba(199,166,255,0.35)';
    ctx.shadowColor = '#c7a6ff';
    ctx.shadowBlur = 40;
    ctx.fillText('𓆉', 256, 440);

    const t = new THREE.CanvasTexture(c);
    return t;
  }

  function makeTableNamePlate(name, subtitle) {
    const c = canvas(768, 192);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 768, 192);

    // Top divider
    ctx.strokeStyle = 'rgba(126,240,255,0.55)';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#7ef0ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(160, 38); ctx.lineTo(608, 38);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Name — Cinzel caps with wide tracking (manual via character spacing)
    ctx.font = 'bold 52px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(232,226,204,0.97)';
    ctx.shadowColor = '#7ef0ff';
    ctx.shadowBlur = 18;
    const chars = name.toUpperCase().split('');
    const step = 30;
    const totalWidth = (chars.length - 1) * step;
    chars.forEach((ch, i) => {
      ctx.fillText(ch, 384 - totalWidth / 2 + i * step, 84);
    });

    // Subtitle
    ctx.font = 'italic 24px "Cormorant Garamond", serif';
    ctx.fillStyle = 'rgba(126,240,255,0.82)';
    ctx.shadowBlur = 10;
    ctx.fillText(subtitle || '', 384, 140);

    // Bottom divider
    ctx.strokeStyle = 'rgba(126,240,255,0.35)';
    ctx.lineWidth = 0.8;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(260, 170); ctx.lineTo(508, 170);
    ctx.stroke();

    const t = new THREE.CanvasTexture(c);
    return t;
  }

  /* =================================================================
     buildMermaid(opts) → rigged 3D Three.js Group.
     LatheGeometry torso, SphereGeometry head with emissive eyes, hair
     strands as bent cylinders, TubeGeometry tail along a spline, extruded
     fluke fins. Exposes `bones` on userData for animation.
     ================================================================= */
  function makeSkinTexture(baseHex) {
    const c = canvas(256, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);
    // Subsurface warmth + pore noise
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(${180 + Math.random()*40},${130 + Math.random()*30},${110 + Math.random()*30},${Math.random() * 0.08})`;
      ctx.fillRect(Math.random()*256, Math.random()*256, 2, 2);
    }
    // A few darker splotches for depth
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(120,70,50,${Math.random()*0.05})`;
      ctx.beginPath();
      ctx.arc(Math.random()*256, Math.random()*256, 6+Math.random()*8, 0, Math.PI*2);
      ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function makeScaleTexture(baseHex, scaleHex) {
    const c = canvas(256, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);
    // Overlapping scale arcs
    ctx.strokeStyle = scaleHex;
    ctx.lineWidth = 1.2;
    const size = 20;
    for (let row = 0; row < 14; row++) {
      const oy = row * size;
      const offset = (row % 2) * size * 0.5;
      for (let col = -1; col < 14; col++) {
        const ox = col * size + offset;
        // Scale outline
        ctx.beginPath();
        ctx.arc(ox + size/2, oy + size, size/2 + 2, Math.PI, Math.PI*2);
        ctx.stroke();
        // Highlight on top of each scale
        ctx.fillStyle = `rgba(255,255,255,0.08)`;
        ctx.beginPath();
        ctx.arc(ox + size/2, oy + size - 2, size/2, Math.PI + 0.2, Math.PI * 1.8);
        ctx.fill();
      }
    }
    // Iridescent sheen — vertical gradient overlay
    const sheen = ctx.createLinearGradient(0, 0, 256, 0);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 4);
    return t;
  }

  /* Painterly placeholder shown while a Wikimedia image loads
     (or permanently if the load fails). Styles by artist palette. */
  function makePaintingPlaceholder(palette, title, artist) {
    const c = canvas(512, 512);
    const ctx = c.getContext('2d');

    const palettes = {
      muted: { a:'#3a2014', b:'#1a0a10', accent:'#b59248' },
      waterhouse: { a:'#2c3240', b:'#1a2230', accent:'#c4a06a' }, // cold greens + olive skin
      klimt:      { a:'#3a2608', b:'#1a1204', accent:'#d8b564' }, // gold-leaf
      bocklin:    { a:'#14181c', b:'#080c10', accent:'#4a4a3a' }, // dark cypress
      burneJones: { a:'#1a2838', b:'#0a1622', accent:'#4a6a8a' },
      hokusai:    { a:'#1a3a5e', b:'#0a1a2e', accent:'#e8dab0' },
    };
    const P = palettes[palette] || palettes.muted;

    // Base wash
    const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 400);
    g.addColorStop(0, P.a); g.addColorStop(1, P.b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);

    // Brushstrokes
    for (let i = 0; i < 220; i++) {
      ctx.strokeStyle = `rgba(${Math.random()*40 + 30},${Math.random()*30 + 20},${Math.random()*30 + 15},${Math.random()*0.35})`;
      ctx.lineWidth = 1 + Math.random() * 5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.bezierCurveTo(
        Math.random() * 512, Math.random() * 512,
        Math.random() * 512, Math.random() * 512,
        Math.random() * 512, Math.random() * 512
      );
      ctx.stroke();
    }

    // Accent strokes
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = P.accent + Math.floor(20 + Math.random() * 60).toString(16).padStart(2, '0');
      ctx.lineWidth = 2 + Math.random() * 3;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.quadraticCurveTo(Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }

    // Vignette
    const vg = ctx.createRadialGradient(256, 256, 180, 256, 256, 320);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 512, 512);

    // Faint suggestion of a figure — elongated ellipse
    ctx.fillStyle = 'rgba(220,200,170,0.08)';
    ctx.beginPath();
    ctx.ellipse(256, 280, 70, 160, 0, 0, Math.PI * 2);
    ctx.fill();

    // Title at bottom (very subtle, painterly)
    ctx.font = 'italic 18px "Cormorant Garamond", serif';
    ctx.fillStyle = 'rgba(232,212,160,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(title || '', 256, 478);
    ctx.font = '12px "Cinzel", serif';
    ctx.fillStyle = 'rgba(232,212,160,0.3)';
    ctx.fillText(artist || '', 256, 498);

    const t = new THREE.CanvasTexture(c);
    /* colorSpace kept at default — Three 0.128 has no SRGBColorSpace */
    return t;
  }

  /* Paints realistic face features at a given canvas (cx, cy) on an existing ctx. */
  function paintFaceOnSphere(ctx, faceCx, faceCy, cfg) {
    const tier = (cfg && cfg.tier) || 'soft';

    // Cheek blush (first — under eyes)
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(200,90,110,0.55)';
    ctx.beginPath(); ctx.ellipse(faceCx - 90, faceCy + 20, 22, 14, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceCx + 90, faceCy + 20, 22, 14, 0.2, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Forehead/chin subtle shading
    ctx.fillStyle = 'rgba(120,70,60,0.15)';
    ctx.beginPath(); ctx.ellipse(faceCx, faceCy - 80, 80, 20, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceCx, faceCy + 95, 60, 15, 0, 0, Math.PI*2); ctx.fill();

    // Dark eye-sockets
    ctx.fillStyle = 'rgba(80,40,60,0.45)';
    ctx.beginPath(); ctx.ellipse(faceCx - 56, faceCy - 18, 28, 18, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceCx + 56, faceCy - 18, 28, 18, 0, 0, Math.PI*2); ctx.fill();

    // Eyeball whites
    ctx.fillStyle = 'rgba(250,250,250,0.92)';
    ctx.beginPath(); ctx.ellipse(faceCx - 56, faceCy - 18, 22, 13, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceCx + 56, faceCy - 18, 22, 13, 0, 0, Math.PI*2); ctx.fill();

    // Iris
    const eyeCol = ({ soft:'#7ef0ff', chain:'#a0d0ff', teeth:'#80ffff' })[tier || 'soft'];
    ctx.fillStyle = eyeCol;
    ctx.shadowColor = eyeCol; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(faceCx - 56, faceCy - 18, 9, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(faceCx + 56, faceCy - 18, 9, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(faceCx - 56, faceCy - 18, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(faceCx + 56, faceCy - 18, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(faceCx - 53, faceCy - 20, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(faceCx + 59, faceCy - 20, 2, 0, Math.PI*2); ctx.fill();

    // Eyebrows — arched
    ctx.strokeStyle = 'rgba(80,40,30,0.85)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(faceCx - 80, faceCy - 45); ctx.quadraticCurveTo(faceCx - 55, faceCy - 52, faceCx - 32, faceCy - 42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(faceCx + 32, faceCy - 42); ctx.quadraticCurveTo(faceCx + 55, faceCy - 52, faceCx + 80, faceCy - 45); ctx.stroke();

    // Eyelashes
    ctx.strokeStyle = 'rgba(20,10,20,0.85)';
    ctx.lineWidth = 1.5;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(faceCx - 56 + i * 5, faceCy - 27);
      ctx.lineTo(faceCx - 56 + i * 5, faceCy - 33);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(faceCx + 56 + i * 5, faceCy - 27);
      ctx.lineTo(faceCx + 56 + i * 5, faceCy - 33);
      ctx.stroke();
    }

    // Nose — bridge shadow
    ctx.strokeStyle = 'rgba(100,60,70,0.3)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(faceCx - 4, faceCy - 5);
    ctx.quadraticCurveTo(faceCx - 6, faceCy + 22, faceCx, faceCy + 34);
    ctx.stroke();
    // Nostrils
    ctx.fillStyle = 'rgba(80,40,50,0.5)';
    ctx.beginPath(); ctx.ellipse(faceCx - 6, faceCy + 34, 3, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceCx + 6, faceCy + 34, 3, 2, 0, 0, Math.PI*2); ctx.fill();

    // Lips — full, two-parted
    const lipCol = ({ soft:'rgba(170,70,100,0.85)', chain:'rgba(180,50,80,0.92)', teeth:'rgba(139,30,44,1)' })[tier || 'soft'];
    ctx.fillStyle = lipCol;
    // Upper
    ctx.beginPath();
    ctx.moveTo(faceCx - 24, faceCy + 58);
    ctx.bezierCurveTo(faceCx - 16, faceCy + 52, faceCx - 6, faceCy + 50, faceCx, faceCy + 58);
    ctx.bezierCurveTo(faceCx + 6, faceCy + 50, faceCx + 16, faceCy + 52, faceCx + 24, faceCy + 58);
    ctx.bezierCurveTo(faceCx + 16, faceCy + 64, faceCx - 16, faceCy + 64, faceCx - 24, faceCy + 58);
    ctx.closePath();
    ctx.fill();
    // Lower
    ctx.beginPath();
    ctx.ellipse(faceCx, faceCy + 68, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Gloss
    ctx.fillStyle = 'rgba(255,220,210,0.4)';
    ctx.beginPath();
    ctx.ellipse(faceCx, faceCy + 66, 8, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cheek blush
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(200,90,110,0.55)';
    ctx.beginPath(); ctx.ellipse(faceCx - 90, faceCy + 20, 22, 14, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceCx + 90, faceCy + 20, 22, 14, 0.2, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

  }

  function buildMermaid(opts) {
    const cfg = {
      skinHex:    '#ecc8a8',
      skinTint:   0xecc8a8,
      tailHex:    '#5a3ca0',
      tailTint:   0x5a3ca0,
      scaleHex:   '#c7a6ff',
      hairColor:  0xc7a6ff,
      eyeColor:   0x7ef0ff,
      tier:       'soft',    // 'soft' | 'chain' | 'teeth'
      topless:    false,     // chain + teeth set this
      ...(opts || {}),
    };
    if (cfg.tier === 'chain')  cfg.topless = 'partial';
    if (cfg.tier === 'teeth')  cfg.topless = true;

    const root = new THREE.Group();
    const bones = {};

    // ====== Materials ======
    const skinMap = makeSkinTexture(cfg.skinHex);
    const skinMat = new THREE.MeshStandardMaterial({
      color: cfg.skinTint,
      map: skinMap,
      roughness: 0.62,
      metalness: 0.04,
      emissive: new THREE.Color(cfg.skinTint).multiplyScalar(0.18),
      emissiveIntensity: 0.35,
    });

    const scaleMap = makeScaleTexture(cfg.tailHex, cfg.scaleHex);
    const tailMat = new THREE.MeshStandardMaterial({
      map: scaleMap,
      color: cfg.tailTint,
      roughness: 0.42,
      metalness: 0.55,
      emissive: cfg.tailTint,
      emissiveIntensity: 0.35,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: cfg.hairColor,
      emissive: cfg.hairColor,
      emissiveIntensity: 0.4,
      roughness: 0.35,
      metalness: 0.15,
      transparent: true,
      opacity: 0.95,
    });

    // ====== Hips — tail-torso junction ======
    const hips = new THREE.Group();
    hips.position.y = 0.9;
    root.add(hips);
    bones.hips = hips;

    // ====== Torso (LatheGeometry) ======
    const torsoProfile = [
      new THREE.Vector2(0.01, 0.00),    // root at hips
      new THREE.Vector2(0.22, 0.02),
      new THREE.Vector2(0.26, 0.12),    // pelvis flare
      new THREE.Vector2(0.22, 0.28),    // natural waist
      new THREE.Vector2(0.19, 0.38),    // waist narrow
      new THREE.Vector2(0.22, 0.52),    // under-bust
      new THREE.Vector2(0.28, 0.62),    // bust
      new THREE.Vector2(0.26, 0.74),    // chest top
      new THREE.Vector2(0.22, 0.82),    // shoulder narrow
      new THREE.Vector2(0.20, 0.90),    // base of neck
    ];
    const torsoGeo = new THREE.LatheGeometry(torsoProfile, 28);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    hips.add(torso);
    bones.torso = torso;

    // ====== Bodice overlay (soft tier only) ======
    if (cfg.tier === 'soft') {
      const bodiceProfile = [
        new THREE.Vector2(0.01, 0.20),
        new THREE.Vector2(0.23, 0.22),
        new THREE.Vector2(0.27, 0.32),
        new THREE.Vector2(0.23, 0.42),
        new THREE.Vector2(0.20, 0.50),
        new THREE.Vector2(0.23, 0.58),
        new THREE.Vector2(0.29, 0.66),
        new THREE.Vector2(0.27, 0.74),
        new THREE.Vector2(0.23, 0.80),
      ];
      const bodiceGeo = new THREE.LatheGeometry(bodiceProfile, 28);
      const bodiceMat = new THREE.MeshStandardMaterial({
        color: cfg.tailTint, roughness: 0.55, metalness: 0.35,
        emissive: cfg.tailTint, emissiveIntensity: 0.45,
      });
      const bodice = new THREE.Mesh(bodiceGeo, bodiceMat);
      hips.add(bodice);
    } else if (cfg.tier === 'chain') {
      // Gold chain strands diagonally across the chest
      const chainMat = new THREE.MeshStandardMaterial({
        color: 0xb59248, metalness: 0.95, roughness: 0.2,
        emissive: 0x4a3a18, emissiveIntensity: 0.6,
      });
      for (let i = 0; i < 5; i++) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.20 + i * 0.02, 0.85, 0.18),
          new THREE.Vector3(0.0, 0.65, 0.26),
          new THREE.Vector3(0.20 - i * 0.02, 0.42, 0.18),
        ]);
        const chainGeo = new THREE.TubeGeometry(curve, 22, 0.007, 6, false);
        const chain = new THREE.Mesh(chainGeo, chainMat);
        hips.add(chain);
        // Mirror strand
        const curveM = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.20 - i * 0.02, 0.85, 0.18),
          new THREE.Vector3(0.0, 0.65, 0.26),
          new THREE.Vector3(-0.20 + i * 0.02, 0.42, 0.18),
        ]);
        const chainGeoM = new THREE.TubeGeometry(curveM, 22, 0.007, 6, false);
        const chainM = new THREE.Mesh(chainGeoM, chainMat);
        hips.add(chainM);
      }
    } else if (cfg.tier === 'teeth') {
      // Bone-tooth collar
      const boneMat = new THREE.MeshStandardMaterial({
        color: 0xe8e2cc, roughness: 0.7, metalness: 0.1,
        emissive: 0x2a2620, emissiveIntensity: 0.2,
      });
      for (let i = -5; i <= 5; i++) {
        const a = i * 0.2;
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 6), boneMat);
        tooth.position.set(Math.sin(a) * 0.23, 0.88, Math.cos(a) * 0.23);
        tooth.lookAt(hips.position);
        tooth.rotateX(Math.PI);
        hips.add(tooth);
      }
    }

    // ====== Neck ======
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.16, 14);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 0.98;
    hips.add(neck);

    // ====== Head ======
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.14;
    hips.add(headPivot);
    bones.head = headPivot;

    // Head — plain skin sphere, no UV decal
    const headGeo = new THREE.SphereGeometry(0.2, 32, 28);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(0.95, 1.12, 0.98);
    headPivot.add(head);

    // Face — drawn on a flat plane in front of the head sphere.
    const faceCanvas = canvas(256, 320);
    const faceCtx = faceCanvas.getContext('2d');
    // Opaque skin base so the plane is always visible
    faceCtx.fillStyle = cfg.skinHex || '#ecc8a8';
    faceCtx.fillRect(0, 0, 256, 320);
    paintFaceOnSphere(faceCtx, 128, 160, cfg);

    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.needsUpdate = true;
    const faceMat = new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const faceGeo = new THREE.PlaneGeometry(0.34, 0.42);
    const face = new THREE.Mesh(faceGeo, faceMat);
    // Place it just beyond the head sphere at +Z (front), facing +Z
    face.position.set(0, 0.02, 0.21);
    face.rotation.y = 0; // Plane default faces +Z, which is correct
    face.renderOrder = 20;
    headPivot.add(face);
    bones.face = face;

    // ====== Hair ======
    // Cascading hair down the back as a grouped mass of bent cylinders
    const hairRoot = new THREE.Group();
    hairRoot.position.y = 1.14;
    hips.add(hairRoot);
    bones.hair = hairRoot;

    const hairStrands = [];
    const strandCount = cfg.topless === true ? 58 : 42;
    for (let i = 0; i < strandCount; i++) {
      const a = Math.PI * 0.55 + ((i / strandCount) * Math.PI * 0.9);
      const radius = 0.16 + Math.random() * 0.04;
      const len = 0.7 + Math.random() * 0.5 + (cfg.topless === true ? 0.35 : 0);
      // Curve down the back, with S-curve for flow
      const startX = Math.cos(a) * radius;
      const startZ = -Math.abs(Math.sin(a)) * radius - 0.05;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(startX, 0.08, startZ),
        new THREE.Vector3(startX * 1.1, -0.08 * len, startZ * 1.1),
        new THREE.Vector3(startX * 1.3, -0.35 * len, startZ * 1.3),
        new THREE.Vector3(startX * 1.15 + (Math.random() - 0.5) * 0.08, -0.6 * len, startZ * 1.2),
        new THREE.Vector3(startX * 1.05 + (Math.random() - 0.5) * 0.12, -0.85 * len, startZ * 1.1),
      ]);
      const strandGeo = new THREE.TubeGeometry(curve, 10, 0.008 + Math.random() * 0.004, 5, false);
      const strand = new THREE.Mesh(strandGeo, hairMat);
      strand.userData = { basePhase: Math.random() * Math.PI * 2 };
      hairRoot.add(strand);
      hairStrands.push(strand);
    }
    bones.hairStrands = hairStrands;

    // Front strands covering chest if topless
    if (cfg.topless) {
      for (let i = 0; i < (cfg.topless === true ? 16 : 10); i++) {
        const xOff = -0.12 + i * 0.018 + (Math.random() - 0.5) * 0.02;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(xOff * 1.1, 1.08, 0.12),
          new THREE.Vector3(xOff * 1.1, 0.85, 0.22),
          new THREE.Vector3(xOff, 0.60, 0.22),
          new THREE.Vector3(xOff + (Math.random() - 0.5) * 0.04, 0.35, 0.20),
          new THREE.Vector3(xOff + (Math.random() - 0.5) * 0.06, 0.15, 0.18),
        ]);
        const strandGeo = new THREE.TubeGeometry(curve, 12, 0.010, 6, false);
        const strand = new THREE.Mesh(strandGeo, hairMat);
        strand.userData = { basePhase: Math.random() * Math.PI * 2, front: true };
        hips.add(strand);
        hairStrands.push(strand);
      }
    }

    // Rising hair strands (underwater float)
    const upHair = new THREE.Group();
    upHair.position.copy(hairRoot.position);
    hips.add(upHair);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = 0.12 + Math.random() * 0.04;
      const upCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * r, 0.04, Math.sin(a) * r),
        new THREE.Vector3(Math.cos(a) * r * 1.3 + (Math.random()-0.5)*0.05, 0.15, Math.sin(a) * r * 1.3 + (Math.random()-0.5)*0.05),
        new THREE.Vector3(Math.cos(a) * r * 1.5 + (Math.random()-0.5)*0.12, 0.32, Math.sin(a) * r * 1.5 + (Math.random()-0.5)*0.12),
      ]);
      const upStrandGeo = new THREE.TubeGeometry(upCurve, 8, 0.006, 4, false);
      const upStrand = new THREE.Mesh(upStrandGeo, hairMat);
      upHair.add(upStrand);
      hairStrands.push(upStrand);
    }

    // ====== Eyes (emissive glow peeking through the face decal) ======
    const eyeMat = new THREE.MeshBasicMaterial({
      color: cfg.eyeColor,
      transparent: true,
      opacity: 0.95,
    });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), eyeMat);
    eyeL.position.set(-0.06, 0.02, 0.18);
    headPivot.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), eyeMat);
    eyeR.position.set(0.06, 0.02, 0.18);
    headPivot.add(eyeR);

    // ====== Arms ======
    // Upper arm + forearm with shoulder pivot
    [-1, 1].forEach((side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.21, 0.82, 0);
      hips.add(shoulder);
      bones[side < 0 ? 'shoulderL' : 'shoulderR'] = shoulder;

      const upperArmGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.4, 12);
      upperArmGeo.translate(0, -0.2, 0); // pivot at top
      const upperArm = new THREE.Mesh(upperArmGeo, skinMat);
      upperArm.rotation.z = side * 0.3;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.set(side * 0.1, -0.38, 0);
      shoulder.add(elbow);

      const forearmGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.38, 12);
      forearmGeo.translate(0, -0.19, 0);
      const forearm = new THREE.Mesh(forearmGeo, skinMat);
      forearm.rotation.z = side * 0.2;
      forearm.rotation.x = 0.3;
      elbow.add(forearm);
      bones[side < 0 ? 'elbowL' : 'elbowR'] = elbow;

      // Hand — simple tapered sphere
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), skinMat);
      hand.scale.set(1, 1.4, 0.6);
      hand.position.set(side * 0.04, -0.4, 0.08);
      elbow.add(hand);
    });

    // ====== Tail (spline-driven tube) ======
    // S-curve from hips down
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.00, 0.08, 0.00),
      new THREE.Vector3(0.02, -0.15, 0.02),
      new THREE.Vector3(-0.02, -0.4, 0.04),
      new THREE.Vector3(0.03, -0.65, 0.02),
      new THREE.Vector3(-0.01, -0.85, 0.01),
    ]);
    // Variable radius along the length — taper down
    const tailGeo = new THREE.TubeGeometry(tailCurve, 36, 0.22, 18, false);
    // Taper the radius: modify vertices to scale down toward tail end
    const posAttr = tailGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      // t = 0 at hips, 1 at fluke
      const t = (0.08 - y) / 0.93;
      const taper = 1 - t * 0.7;
      posAttr.setX(i, posAttr.getX(i) * taper);
      posAttr.setZ(i, posAttr.getZ(i) * taper);
    }
    posAttr.needsUpdate = true;
    tailGeo.computeVertexNormals();

    const tail = new THREE.Mesh(tailGeo, tailMat);
    hips.add(tail);
    bones.tail = tail;

    // ====== Fluke fins ======
    const flukeShape = new THREE.Shape();
    flukeShape.moveTo(0, 0);
    flukeShape.bezierCurveTo(-0.15, 0.1, -0.28, 0.25, -0.3, 0.5);
    flukeShape.bezierCurveTo(-0.2, 0.42, -0.1, 0.28, 0, 0.2);
    flukeShape.bezierCurveTo(0.1, 0.28, 0.2, 0.42, 0.3, 0.5);
    flukeShape.bezierCurveTo(0.28, 0.25, 0.15, 0.1, 0, 0);
    const flukeGeo = new THREE.ExtrudeGeometry(flukeShape, {
      depth: 0.015, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.006, bevelSegments: 2,
    });
    const fluke = new THREE.Mesh(flukeGeo, tailMat);
    fluke.position.set(-0.01, -0.85, 0);
    fluke.rotation.x = Math.PI / 2;
    fluke.rotation.z = 0;
    hips.add(fluke);
    bones.fluke = fluke;

    // ====== Pearl choker (soft + chain) ======
    if (cfg.tier !== 'teeth') {
      const pearlMat = new THREE.MeshStandardMaterial({
        color: 0xf0e8d0, roughness: 0.1, metalness: 0.3,
        emissive: 0xe8d4b0, emissiveIntensity: 0.5,
      });
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), pearlMat);
        pearl.position.set(Math.cos(a) * 0.09, 0.99, Math.sin(a) * 0.09);
        hips.add(pearl);
      }
    }

    // ====== Aura glow sphere (subtle) ======
    const auraMat = new THREE.MeshBasicMaterial({
      color: cfg.hairColor,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const aura = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), auraMat);
    aura.position.y = 0.4;
    root.add(aura);

    root.userData.bones = bones;
    root.userData.cfg = cfg;
    return root;
  }

  /* ============================================================ */

  function makeSirenTexture(tier) {
    /* tier: 'soft' | 'chain' | 'teeth' — dress evolves with house edge.
       MERMAID rewrite — full anatomy, fluke tail, realistic facial features. */
    tier = tier || 'soft';
    const c = canvas(512, 1024);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 1024);

    // ===== Color palette by tier =====
    const palette = ({
      soft: {
        auraInner: 'rgba(199,166,255,0.55)',
        auraOuter: 'rgba(139,111,214,0.08)',
        tailInner: 'rgba(80,60,150,0.88)',
        tailOuter: 'rgba(40,24,100,0.95)',
        tailHL:    'rgba(180,150,240,0.75)',
        scale:     'rgba(199,166,255,0.55)',
        bodice:    'rgba(120,90,170,0.72)',
        bodiceHL:  'rgba(200,170,240,0.45)',
        trim:      'rgba(232,212,160,0.85)',
        hair:      'rgba(199,166,255,0.78)',
        hair2:     'rgba(139,111,214,0.55)',
        skin:      'rgba(248,228,212,0.97)',
        skinShadow:'rgba(140,90,85,0.45)',
        skinHL:    'rgba(255,232,215,0.5)',
        lips:      'rgba(170,70,100,0.82)',
        eyeGlow:   'rgba(126,240,255,1)',
        accent:    'rgba(232,212,160,0.85)',
      },
      chain: {
        auraInner: 'rgba(180,110,200,0.5)',
        auraOuter: 'rgba(100,50,120,0.1)',
        tailInner: 'rgba(100,40,120,0.9)',
        tailOuter: 'rgba(30,10,50,0.96)',
        tailHL:    'rgba(200,100,180,0.7)',
        scale:     'rgba(232,212,160,0.7)',
        bodice:    'rgba(181,146,72,0.4)',   // sparse chain strands, not a full bodice
        bodiceHL:  'rgba(232,212,160,0.65)',
        trim:      'rgba(232,212,160,0.95)',
        hair:      'rgba(199,120,180,0.85)',
        hair2:     'rgba(120,60,110,0.65)',
        skin:      'rgba(250,222,205,0.98)',
        skinShadow:'rgba(150,80,75,0.55)',
        skinHL:    'rgba(255,235,210,0.6)',
        lips:      'rgba(180,50,80,0.92)',
        eyeGlow:   'rgba(160,220,255,1)',
        accent:    'rgba(232,212,160,0.95)',
      },
      teeth: {
        auraInner: 'rgba(126,240,255,0.4)',
        auraOuter: 'rgba(40,10,20,0.15)',
        tailInner: 'rgba(30,5,15,0.96)',
        tailOuter: 'rgba(10,0,5,1)',
        tailHL:    'rgba(126,240,255,0.45)',
        scale:     'rgba(232,226,204,0.35)',
        bodice:    'rgba(0,0,0,0)',           // topless — hair covers chest
        bodiceHL:  'rgba(0,0,0,0)',
        trim:      'rgba(232,226,204,0.95)',
        hair:      'rgba(232,226,204,0.88)',  // bone-white
        hair2:     'rgba(150,140,130,0.7)',
        skin:      'rgba(225,210,200,0.95)',  // paler
        skinShadow:'rgba(100,60,60,0.6)',
        skinHL:    'rgba(240,220,210,0.6)',
        lips:      'rgba(139,30,44,1)',       // blood red
        eyeGlow:   'rgba(126,240,255,1)',
        accent:    'rgba(232,226,204,0.95)',
      },
    })[tier];
    const P = palette;

    // ===== AURA =====
    const aura = ctx.createRadialGradient(256, 500, 40, 256, 500, 520);
    aura.addColorStop(0, P.auraInner);
    aura.addColorStop(0.3, P.auraInner.replace(/[\d.]+\)$/, '0.22)'));
    aura.addColorStop(0.7, P.auraOuter);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 512, 1024);

    // ===== TAIL — mermaid fluke, from hips down =====
    const tailGrad = ctx.createLinearGradient(0, 580, 0, 980);
    tailGrad.addColorStop(0, P.tailInner);
    tailGrad.addColorStop(1, P.tailOuter);
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(195, 570);
    ctx.bezierCurveTo(175, 640, 170, 720, 185, 800);
    ctx.bezierCurveTo(200, 870, 220, 900, 245, 900);
    ctx.lineTo(267, 900);
    ctx.bezierCurveTo(292, 900, 312, 870, 327, 800);
    ctx.bezierCurveTo(342, 720, 337, 640, 317, 570);
    ctx.closePath();
    ctx.fill();

    // Tail highlight — iridescent stripe down right
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = P.tailHL;
    ctx.beginPath();
    ctx.moveTo(288, 580);
    ctx.bezierCurveTo(302, 660, 306, 740, 294, 820);
    ctx.bezierCurveTo(286, 860, 274, 880, 262, 890);
    ctx.lineTo(250, 890);
    ctx.bezierCurveTo(262, 880, 274, 860, 282, 820);
    ctx.bezierCurveTo(294, 740, 290, 660, 276, 580);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Fluke — big horizontal fins at the bottom
    ctx.fillStyle = P.tailHL;
    ctx.beginPath();
    ctx.moveTo(230, 890);
    ctx.bezierCurveTo(170, 920, 120, 970, 100, 1010);
    ctx.quadraticCurveTo(180, 990, 240, 970);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(282, 890);
    ctx.bezierCurveTo(342, 920, 392, 970, 412, 1010);
    ctx.quadraticCurveTo(332, 990, 272, 970);
    ctx.closePath();
    ctx.fill();

    // Scale pattern on tail
    ctx.strokeStyle = P.scale;
    ctx.lineWidth = 1;
    for (let row = 0; row < 16; row++) {
      const ty = 600 + row * 18;
      const centerX = 256;
      const width = 60 - row * 2.5;
      for (let col = -4; col <= 4; col++) {
        const sx = centerX + col * 14 + (row % 2) * 7;
        if (Math.abs(sx - centerX) > width) continue;
        ctx.beginPath();
        ctx.arc(sx, ty, 8, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Gold-leaf waist line — transition between body and tail
    ctx.strokeStyle = P.trim;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#b59248';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(194, 580);
    ctx.bezierCurveTo(220, 600, 292, 600, 318, 580);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ===== UPPER BODY — skin, anatomical realism =====
    // Torso silhouette
    ctx.fillStyle = P.skin;
    ctx.beginPath();
    ctx.moveTo(205, 380);
    ctx.bezierCurveTo(192, 440, 186, 500, 200, 570); // waist narrows
    ctx.lineTo(312, 570);
    ctx.bezierCurveTo(326, 500, 320, 440, 307, 380);
    ctx.closePath();
    ctx.fill();

    // Torso shading down spine
    ctx.strokeStyle = P.skinShadow;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(256, 390);
    ctx.bezierCurveTo(252, 460, 258, 520, 256, 560);
    ctx.stroke();

    // Right-side highlight
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = P.skinHL;
    ctx.beginPath();
    ctx.moveTo(292, 390);
    ctx.bezierCurveTo(308, 460, 316, 520, 306, 560);
    ctx.lineTo(292, 560);
    ctx.bezierCurveTo(298, 520, 298, 460, 280, 390);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Arms — draped over hips
    ctx.fillStyle = P.skin;
    // Left arm coming down along side
    ctx.beginPath();
    ctx.moveTo(196, 380);
    ctx.bezierCurveTo(176, 460, 172, 520, 178, 570);
    ctx.lineTo(198, 570);
    ctx.bezierCurveTo(196, 520, 200, 460, 214, 380);
    ctx.closePath();
    ctx.fill();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(316, 380);
    ctx.bezierCurveTo(336, 460, 340, 520, 334, 570);
    ctx.lineTo(314, 570);
    ctx.bezierCurveTo(316, 520, 312, 460, 298, 380);
    ctx.closePath();
    ctx.fill();

    // Shoulders + collarbones
    ctx.strokeStyle = P.skinShadow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(210, 358); ctx.quadraticCurveTo(256, 348, 302, 358);
    ctx.stroke();

    // ===== BODICE / CHEST DRAPING (varies by tier) =====
    if (tier === 'soft') {
      // Full draped bodice — flowing fabric covering chest
      ctx.fillStyle = P.bodice;
      ctx.beginPath();
      ctx.moveTo(204, 370);
      ctx.bezierCurveTo(218, 340, 294, 340, 308, 370);
      ctx.bezierCurveTo(320, 430, 312, 500, 310, 570);
      ctx.lineTo(202, 570);
      ctx.bezierCurveTo(200, 500, 192, 430, 204, 370);
      ctx.closePath();
      ctx.fill();
      // Bodice highlight
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = P.bodiceHL;
      ctx.beginPath();
      ctx.moveTo(270, 380);
      ctx.bezierCurveTo(298, 430, 302, 500, 300, 560);
      ctx.lineTo(286, 560);
      ctx.bezierCurveTo(290, 500, 288, 430, 270, 380);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // Shimmer lines
      ctx.strokeStyle = P.trim.replace(/[\d.]+\)$/, '0.35)');
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(210 + i * 18, 385);
        ctx.lineTo(214 + i * 18, 565);
        ctx.stroke();
      }
    } else if (tier === 'chain') {
      // Shoulders bare; chain-coin strands hang across, hair covers breasts.
      // Draw subtle breast shading under the skin so hair drapery reads as cover.
      ctx.strokeStyle = P.skinShadow;
      ctx.lineWidth = 2;
      // Breast curves (subtle, suggested by shadow)
      ctx.beginPath();
      ctx.moveTo(218, 430); ctx.quadraticCurveTo(242, 458, 252, 432);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(260, 432); ctx.quadraticCurveTo(270, 458, 294, 430);
      ctx.stroke();

      // Gold chain strands draped diagonally from shoulders to hip
      ctx.strokeStyle = P.trim;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#b59248';
      ctx.shadowBlur = 6;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(212 + i * 3, 378);
        ctx.quadraticCurveTo(256 + i * 6, 430 + i * 10, 302 - i * 3, 500 + i * 15);
        ctx.stroke();
      }
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(300 - i * 3, 378);
        ctx.quadraticCurveTo(256 - i * 6, 430 + i * 10, 210 + i * 3, 500 + i * 15);
        ctx.stroke();
      }
      // Little coins strung along the chains
      ctx.fillStyle = P.trim;
      for (let i = 0; i < 12; i++) {
        const tT = i / 12;
        const x = 230 + tT * 60;
        const y = 410 + tT * 80;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else { // teeth
      // Topless — hair covers chest (painted in the hair section below)
      // Breast shading hinted below the hair
      ctx.strokeStyle = P.skinShadow;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(220, 440); ctx.quadraticCurveTo(244, 470, 252, 442);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(260, 442); ctx.quadraticCurveTo(268, 470, 292, 440);
      ctx.stroke();
      // Bone necklace — small pointed teeth
      ctx.fillStyle = P.trim;
      for (let i = -4; i <= 4; i++) {
        const a = i * 0.14;
        const x = 256 + Math.sin(a) * 44;
        const y = 370 + Math.abs(Math.cos(a)) * 8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 10);
        ctx.lineTo(x + 3, y + 10);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ===== HEAD — defined, realistic mermaid face =====
    // Neck
    ctx.fillStyle = P.skin;
    ctx.beginPath();
    ctx.moveTo(232, 320);
    ctx.lineTo(280, 320);
    ctx.lineTo(284, 360);
    ctx.lineTo(228, 360);
    ctx.closePath();
    ctx.fill();

    // Head halo
    ctx.fillStyle = P.auraInner.replace(/[\d.]+\)$/, '0.3)');
    ctx.shadowColor = P.auraInner;
    ctx.shadowBlur = 44;
    ctx.beginPath();
    ctx.ellipse(256, 235, 70, 96, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Face — oval
    ctx.fillStyle = P.skin;
    ctx.beginPath();
    ctx.ellipse(256, 235, 56, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cheekbones / temple shadows
    ctx.fillStyle = P.skinShadow.replace(/[\d.]+\)$/, '0.22)');
    ctx.beginPath();
    ctx.ellipse(218, 246, 14, 26, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(294, 246, 14, 26, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Jawline shade
    ctx.strokeStyle = P.skinShadow.replace(/[\d.]+\)$/, '0.3)');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(206, 260); ctx.quadraticCurveTo(256, 310, 306, 260);
    ctx.stroke();

    // Eyebrows — arched
    ctx.strokeStyle = P.skinShadow.replace(/[\d.]+\)$/, '0.72)');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(212, 212); ctx.quadraticCurveTo(228, 204, 248, 210);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(264, 210); ctx.quadraticCurveTo(284, 204, 300, 212);
    ctx.stroke();

    // Eyes — defined almond shapes
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(228, 228, 14, 7, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(284, 228, 14, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Iris
    ctx.fillStyle = P.eyeGlow;
    ctx.shadowColor = P.eyeGlow;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(230, 228, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(282, 228, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pupil
    ctx.fillStyle = 'rgba(0,0,0,0.95)';
    ctx.beginPath(); ctx.arc(230, 228, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(282, 228, 2, 0, Math.PI * 2); ctx.fill();

    // Eye highlight
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(232, 226, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(284, 226, 1.5, 0, Math.PI * 2); ctx.fill();

    // Eyelashes — several short strokes
    ctx.strokeStyle = 'rgba(20,10,20,0.8)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      ctx.beginPath();
      ctx.moveTo(216 + t * 24, 222);
      ctx.lineTo(216 + t * 24, 218 - t * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(272 + t * 24, 222);
      ctx.lineTo(272 + t * 24, 218 - t * 2);
      ctx.stroke();
    }

    // Nose — bridge shadow + nostril hint
    ctx.strokeStyle = P.skinShadow.replace(/[\d.]+\)$/, '0.4)');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(252, 238); ctx.quadraticCurveTo(250, 260, 256, 272);
    ctx.stroke();
    // Nostril
    ctx.fillStyle = P.skinShadow.replace(/[\d.]+\)$/, '0.6)');
    ctx.beginPath(); ctx.ellipse(250, 272, 2, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(262, 272, 2, 1.3, 0, 0, Math.PI * 2); ctx.fill();

    // Lips — upper and lower, full
    ctx.fillStyle = P.lips;
    ctx.beginPath();
    // Upper lip
    ctx.moveTo(238, 290);
    ctx.bezierCurveTo(244, 286, 250, 284, 256, 290);
    ctx.bezierCurveTo(262, 284, 268, 286, 274, 290);
    ctx.bezierCurveTo(268, 294, 262, 294, 256, 292);
    ctx.bezierCurveTo(250, 294, 244, 294, 238, 290);
    ctx.closePath();
    ctx.fill();
    // Lower lip
    ctx.beginPath();
    ctx.ellipse(256, 298, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,200,210,0.5)';
    ctx.beginPath();
    ctx.ellipse(256, 296, 6, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // ===== HAIR — heavy cascade, Pre-Raphaelite =====
    // Rising strands (underwater float)
    ctx.strokeStyle = P.hair;
    ctx.lineWidth = 3.2;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      const sx = 200 + i * 4 + (Math.random() - 0.5) * 8;
      ctx.moveTo(sx, 180);
      let x = sx, y = 180;
      for (let k = 0; k < 14; k++) {
        x += (Math.random() - 0.5) * 22;
        y -= 8 + Math.random() * 12;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Fine strands
    ctx.strokeStyle = P.hair.replace(/[\d.]+\)$/, '0.45)');
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      const sx = 180 + Math.random() * 150;
      ctx.moveTo(sx, 210);
      let x = sx, y = 210;
      for (let k = 0; k < 8; k++) {
        x += (Math.random() - 0.5) * 26;
        y -= 14 + Math.random() * 16;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Cascading front hair — bigger in chain/teeth tiers to cover chest
    const cascadeBulk = tier === 'teeth' ? 1.5 : tier === 'chain' ? 1.15 : 1.0;
    ctx.fillStyle = P.hair;
    ctx.beginPath();
    ctx.moveTo(222 - cascadeBulk * 6, 320);
    ctx.bezierCurveTo(190 - cascadeBulk * 20, 400, 198 - cascadeBulk * 18, 500, 230 - cascadeBulk * 10, 570);
    ctx.lineTo(258, 580);
    ctx.bezierCurveTo(244, 500, 236, 400, 250 - cascadeBulk * 3, 320);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.hair2;
    ctx.beginPath();
    ctx.moveTo(262 + cascadeBulk * 3, 320);
    ctx.bezierCurveTo(276, 400, 268, 500, 282 + cascadeBulk * 10, 570);
    ctx.lineTo(254, 580);
    ctx.bezierCurveTo(268, 500, 276, 400, 290 + cascadeBulk * 6, 320);
    ctx.closePath();
    ctx.fill();

    // ===== JEWELRY =====
    // Pearl choker (soft / chain) or bone collar (teeth, handled above)
    if (tier !== 'teeth') {
      ctx.fillStyle = 'rgba(240,232,215,0.9)';
      ctx.shadowColor = 'rgba(255,255,255,0.7)';
      ctx.shadowBlur = 8;
      for (let i = 0; i < 13; i++) {
        const a = -0.6 + i * 0.1;
        ctx.beginPath();
        ctx.arc(256 + Math.sin(a) * 48, 340 + Math.abs(Math.cos(a)) * 4, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    // Hair ornaments — pearl / gold pins
    ctx.fillStyle = P.accent;
    ctx.shadowColor = '#b59248';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(226, 208, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(286, 208, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Kraken pendant at chest centre
    if (tier === 'soft') {
      ctx.fillStyle = 'rgba(126,240,255,0.7)';
      ctx.shadowColor = '#7ef0ff';
      ctx.shadowBlur = 14;
      ctx.font = '34px serif';
      ctx.textAlign = 'center';
      ctx.fillText('\ud808\udc49', 256, 380); // kraken-ish glyph
      ctx.shadowBlur = 0;
    }

    return new THREE.CanvasTexture(c);
  }

  /* Keep the old zero-arg signature for back-compat. */
  function makeSirenTextureLegacy() {
    const c = canvas(512, 1024);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 1024);

    // ===== AURA — soft violet halo around entire figure =====
    const aura = ctx.createRadialGradient(256, 400, 40, 256, 400, 440);
    aura.addColorStop(0, 'rgba(199,166,255,0.5)');
    aura.addColorStop(0.3, 'rgba(199,166,255,0.22)');
    aura.addColorStop(0.7, 'rgba(139,111,214,0.08)');
    aura.addColorStop(1, 'rgba(139,111,214,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 512, 1024);

    // ===== FLOWING DRESS / BODY — long, wavy, tapered =====
    // Outer silhouette with wide hips flowing into a pooled hem
    ctx.fillStyle = 'rgba(139,111,214,0.58)';
    ctx.beginPath();
    ctx.moveTo(208, 360);                 // left shoulder
    ctx.bezierCurveTo(180, 440, 160, 560, 150, 700);  // left side flowing
    ctx.bezierCurveTo(120, 820, 100, 930, 130, 990);  // left hem billow
    ctx.quadraticCurveTo(200, 1020, 256, 1000);       // bottom center
    ctx.quadraticCurveTo(312, 1020, 382, 990);        // right hem return
    ctx.bezierCurveTo(412, 930, 392, 820, 362, 700);  // right side
    ctx.bezierCurveTo(352, 560, 332, 440, 304, 360);  // right shoulder
    ctx.closePath();
    ctx.fill();

    // Inner dress darker tone — suggests torso
    ctx.fillStyle = 'rgba(90,70,150,0.5)';
    ctx.beginPath();
    ctx.moveTo(228, 380);
    ctx.bezierCurveTo(210, 480, 220, 620, 232, 780);
    ctx.bezierCurveTo(238, 880, 248, 960, 256, 970);
    ctx.bezierCurveTo(264, 960, 274, 880, 280, 780);
    ctx.bezierCurveTo(292, 620, 302, 480, 284, 380);
    ctx.closePath();
    ctx.fill();

    // Corset waist cinch
    ctx.fillStyle = 'rgba(60,40,100,0.5)';
    ctx.beginPath();
    ctx.ellipse(256, 540, 50, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dress shimmer lines — vertical flowing
    ctx.strokeStyle = 'rgba(199,166,255,0.35)';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const sx = 170 + i * 20;
      let x = sx, y = 400;
      ctx.moveTo(x, y);
      while (y < 980) {
        x += (Math.random() - 0.5) * 12;
        y += 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // ===== SHOULDERS / COLLAR =====
    ctx.fillStyle = 'rgba(180,155,230,0.6)';
    ctx.beginPath();
    ctx.moveTo(200, 370);
    ctx.quadraticCurveTo(180, 345, 200, 320);
    ctx.lineTo(312, 320);
    ctx.quadraticCurveTo(332, 345, 312, 370);
    ctx.closePath();
    ctx.fill();

    // ===== NECK =====
    ctx.fillStyle = 'rgba(240,230,210,0.75)';
    ctx.fillRect(236, 290, 40, 40);

    // ===== HEAD — pale, ghostly, larger and more pronounced =====
    // Outer skull halo
    ctx.fillStyle = 'rgba(199,166,255,0.3)';
    ctx.shadowColor = 'rgba(199,166,255,0.8)';
    ctx.shadowBlur = 50;
    ctx.beginPath();
    ctx.ellipse(256, 220, 72, 95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Face shape — oval, pale bone
    ctx.fillStyle = 'rgba(240,232,215,0.95)';
    ctx.beginPath();
    ctx.ellipse(256, 220, 58, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cheek shadows
    ctx.fillStyle = 'rgba(80,60,120,0.28)';
    ctx.beginPath();
    ctx.ellipse(220, 238, 16, 22, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(292, 238, 16, 22, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Deep-set eye sockets
    ctx.fillStyle = 'rgba(40,20,60,0.55)';
    ctx.beginPath();
    ctx.ellipse(230, 212, 18, 11, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(282, 212, 18, 11, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Glowing cyan eyes
    ctx.fillStyle = 'rgba(126,240,255,1)';
    ctx.shadowColor = '#7ef0ff';
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.ellipse(230, 212, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(282, 212, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pupil highlights
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(231, 210, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(283, 210, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Nose (subtle bridge shadow)
    ctx.fillStyle = 'rgba(80,60,110,0.2)';
    ctx.beginPath();
    ctx.moveTo(256, 230);
    ctx.quadraticCurveTo(250, 260, 256, 270);
    ctx.quadraticCurveTo(262, 260, 256, 230);
    ctx.fill();

    // Lips — cool berry
    ctx.fillStyle = 'rgba(140,60,90,0.75)';
    ctx.beginPath();
    ctx.ellipse(256, 280, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,90,130,0.5)';
    ctx.beginPath();
    ctx.ellipse(256, 277, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ===== FLOWING HAIR — long tendrils rising + cascading =====
    // Upward hair (looks like underwater float)
    ctx.strokeStyle = 'rgba(199,166,255,0.65)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      const sx = 198 + i * 5 + (Math.random() - 0.5) * 10;
      ctx.moveTo(sx, 170);
      let x = sx, y = 170;
      for (let k = 0; k < 12; k++) {
        x += (Math.random() - 0.5) * 22;
        y -= 10 + Math.random() * 14;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Thinner side strands
    ctx.strokeStyle = 'rgba(199,166,255,0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      const sx = 170 + Math.random() * 170;
      ctx.moveTo(sx, 200);
      let x = sx, y = 200;
      for (let k = 0; k < 6; k++) {
        x += (Math.random() - 0.5) * 30;
        y -= 22 + Math.random() * 18;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Cascading side hair down past shoulders
    ctx.strokeStyle = 'rgba(139,111,214,0.5)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const sx = 192 + i * 6;
      ctx.moveTo(sx, 280);
      let x = sx, y = 280;
      for (let k = 0; k < 6; k++) {
        x += (Math.random() - 0.5) * 14;
        y += 30 + Math.random() * 10;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const sx = 274 + i * 6;
      ctx.moveTo(sx, 280);
      let x = sx, y = 280;
      for (let k = 0; k < 6; k++) {
        x += (Math.random() - 0.5) * 14;
        y += 30 + Math.random() * 10;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // ===== PEARL CHOKER =====
    ctx.fillStyle = 'rgba(240,232,215,0.85)';
    ctx.shadowColor = 'rgba(255,255,255,0.7)';
    ctx.shadowBlur = 6;
    for (let i = 0; i < 11; i++) {
      ctx.beginPath();
      const a = -0.55 + i * 0.11;
      ctx.arc(256 + Math.sin(a) * 44, 310 + Math.abs(Math.cos(a)) * 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Central kraken pendant
    ctx.fillStyle = 'rgba(126,240,255,0.7)';
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#7ef0ff';
    ctx.shadowBlur = 14;
    ctx.fillText('𓆉', 256, 345);
    ctx.shadowBlur = 0;

    // ===== Trailing hem wisps =====
    ctx.strokeStyle = 'rgba(139,111,214,0.35)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      const sx = 140 + Math.random() * 240;
      ctx.moveTo(sx, 960);
      let x = sx, y = 960;
      for (let k = 0; k < 4; k++) {
        x += (Math.random() - 0.5) * 25;
        y += 10 + Math.random() * 10;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const t = new THREE.CanvasTexture(c);
    return t;
  }

  /* ==========================================================
     NPC CANVAS TEXTURES — painterly, Pre-Raphaelite/Klimt style.
     Each figure is stylized + ethereal, drawn at 512x1024.
     ========================================================== */

  /* Shared helper: paint a figure with body + head + hair tendrils, parameterized */
  /* Paints a mermaid tail over the lower body of any 512x1024 NPC canvas.
     Call AFTER the figure has been drawn to convert its lower half to a tail. */
  function paintMermaidTailOver(ctx, palette) {
    const P = palette;
    // Erase the legs region
    ctx.clearRect(130, 560, 260, 460);

    // Tail body
    const tailGrad = ctx.createLinearGradient(0, 580, 0, 980);
    tailGrad.addColorStop(0, P.tailInner);
    tailGrad.addColorStop(1, P.tailOuter);
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(195, 570);
    ctx.bezierCurveTo(175, 640, 170, 720, 185, 800);
    ctx.bezierCurveTo(200, 870, 220, 900, 245, 900);
    ctx.lineTo(267, 900);
    ctx.bezierCurveTo(292, 900, 312, 870, 327, 800);
    ctx.bezierCurveTo(342, 720, 337, 640, 317, 570);
    ctx.closePath();
    ctx.fill();

    // Iridescent stripe
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = P.tailHL;
    ctx.beginPath();
    ctx.moveTo(288, 580);
    ctx.bezierCurveTo(302, 660, 306, 740, 294, 820);
    ctx.bezierCurveTo(286, 860, 274, 880, 262, 890);
    ctx.lineTo(250, 890);
    ctx.bezierCurveTo(262, 880, 274, 860, 282, 820);
    ctx.bezierCurveTo(294, 740, 290, 660, 276, 580);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Fluke fins
    ctx.fillStyle = P.tailHL;
    ctx.beginPath();
    ctx.moveTo(230, 890);
    ctx.bezierCurveTo(170, 920, 120, 970, 100, 1010);
    ctx.quadraticCurveTo(180, 990, 240, 970);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(282, 890);
    ctx.bezierCurveTo(342, 920, 392, 970, 412, 1010);
    ctx.quadraticCurveTo(332, 990, 272, 970);
    ctx.closePath();
    ctx.fill();

    // Scale pattern
    ctx.strokeStyle = P.scale;
    ctx.lineWidth = 1;
    for (let row = 0; row < 16; row++) {
      const ty = 600 + row * 18;
      const width = 60 - row * 2.5;
      for (let col = -4; col <= 4; col++) {
        const sx = 256 + col * 14 + (row % 2) * 7;
        if (Math.abs(sx - 256) > width) continue;
        ctx.beginPath();
        ctx.arc(sx, ty, 8, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Gold waist line — transition between torso and tail
    ctx.strokeStyle = P.trim || 'rgba(232,212,160,0.85)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#b59248';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(194, 580);
    ctx.bezierCurveTo(220, 600, 292, 600, 318, 580);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function paintNPCBase(ctx, opts) {
    const {
      bodyColor    = 'rgba(139,111,214,0.58)',
      innerColor   = 'rgba(90,70,150,0.5)',
      skinColor    = 'rgba(240,232,215,0.95)',
      hairColor    = 'rgba(199,166,255,0.65)',
      dressAccent  = 'rgba(199,166,255,0.35)',
      trim         = 'rgba(181,146,72,0.75)',
      eyeGlow      = 'rgba(126,240,255,1)',
      hairRising   = true,
      hairCascading= true,
      pose         = 'standing',
    } = opts || {};

    // Dress / body silhouette
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(208, 360);
    ctx.bezierCurveTo(180, 440, 160, 560, 150, 700);
    ctx.bezierCurveTo(120, 820, 100, 930, 130, 990);
    ctx.quadraticCurveTo(200, 1020, 256, 1000);
    ctx.quadraticCurveTo(312, 1020, 382, 990);
    ctx.bezierCurveTo(412, 930, 392, 820, 362, 700);
    ctx.bezierCurveTo(352, 560, 332, 440, 304, 360);
    ctx.closePath();
    ctx.fill();

    // Inner torso shadow
    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.moveTo(228, 380);
    ctx.bezierCurveTo(210, 480, 220, 620, 232, 780);
    ctx.bezierCurveTo(238, 880, 248, 960, 256, 970);
    ctx.bezierCurveTo(264, 960, 274, 880, 280, 780);
    ctx.bezierCurveTo(292, 620, 302, 480, 284, 380);
    ctx.closePath();
    ctx.fill();

    // Bodice trim (a gold-leaf band at waist)
    ctx.strokeStyle = trim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(208, 540);
    ctx.quadraticCurveTo(256, 558, 304, 540);
    ctx.stroke();

    // Dress shimmer lines
    ctx.strokeStyle = dressAccent;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      let x = 180 + i * 22, y = 420;
      ctx.moveTo(x, y);
      while (y < 980) {
        x += (Math.random() - 0.5) * 10;
        y += 38;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Shoulders
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(200, 370);
    ctx.quadraticCurveTo(180, 345, 200, 320);
    ctx.lineTo(312, 320);
    ctx.quadraticCurveTo(332, 345, 312, 370);
    ctx.closePath();
    ctx.fill();

    // Neck
    ctx.fillStyle = skinColor;
    ctx.fillRect(236, 290, 40, 40);

    // Head halo
    ctx.fillStyle = 'rgba(199,166,255,0.25)';
    ctx.shadowColor = 'rgba(199,166,255,0.7)';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.ellipse(256, 220, 72, 95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Face
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(256, 220, 56, 78, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cheek shadows
    ctx.fillStyle = 'rgba(80,60,120,0.28)';
    ctx.beginPath(); ctx.ellipse(222, 238, 15, 20, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(290, 238, 15, 20, 0.2, 0, Math.PI * 2); ctx.fill();

    // Eye sockets
    ctx.fillStyle = 'rgba(40,20,60,0.55)';
    ctx.beginPath(); ctx.ellipse(232, 212, 17, 10, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(280, 212, 17, 10, 0.1, 0, Math.PI * 2); ctx.fill();

    // Glowing eyes
    ctx.fillStyle = eyeGlow;
    ctx.shadowColor = eyeGlow;
    ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.ellipse(232, 212, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(280, 212, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Nose
    ctx.fillStyle = 'rgba(80,60,110,0.2)';
    ctx.beginPath();
    ctx.moveTo(256, 230); ctx.quadraticCurveTo(250, 260, 256, 270);
    ctx.quadraticCurveTo(262, 260, 256, 230);
    ctx.fill();

    // Lips
    ctx.fillStyle = 'rgba(140,60,90,0.7)';
    ctx.beginPath(); ctx.ellipse(256, 280, 18, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Hair rising (underwater look)
    if (hairRising) {
      ctx.strokeStyle = hairColor;
      ctx.lineWidth = 3;
      for (let i = 0; i < 22; i++) {
        ctx.beginPath();
        const sx = 200 + i * 5 + (Math.random() - 0.5) * 10;
        ctx.moveTo(sx, 170);
        let x = sx, y = 170;
        for (let k = 0; k < 10; k++) {
          x += (Math.random() - 0.5) * 20;
          y -= 10 + Math.random() * 14;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // Hair cascading past shoulders
    if (hairCascading) {
      const cHair = hairColor.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgba($1,$2,$3,0.5)');
      ctx.strokeStyle = cHair;
      ctx.lineWidth = 2.3;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        const sx = 190 + i * 6;
        ctx.moveTo(sx, 280);
        let x = sx, y = 280;
        for (let k = 0; k < 6; k++) {
          x += (Math.random() - 0.5) * 14;
          y += 28 + Math.random() * 12;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        const sx = 272 + i * 6;
        ctx.moveTo(sx, 280);
        let x = sx, y = 280;
        for (let k = 0; k < 6; k++) {
          x += (Math.random() - 0.5) * 14;
          y += 28 + Math.random() * 12;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  function makeGamblerTexture() {
    const c = canvas(512, 1024);
    const ctx = c.getContext('2d');
    // Aura — pale teal, translucent (she's been fading for 200 years)
    const aura = ctx.createRadialGradient(256, 480, 40, 256, 480, 520);
    aura.addColorStop(0, 'rgba(91,224,194,0.32)');
    aura.addColorStop(0.4, 'rgba(91,224,194,0.12)');
    aura.addColorStop(1, 'rgba(91,224,194,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 512, 1024);

    paintNPCBase(ctx, {
      bodyColor: 'rgba(70,110,110,0.42)',
      innerColor: 'rgba(40,70,80,0.5)',
      skinColor: 'rgba(200,210,200,0.75)',
      hairColor: 'rgba(91,224,194,0.55)',
      dressAccent: 'rgba(91,224,194,0.28)',
      trim: 'rgba(181,146,72,0.55)',
      eyeGlow: 'rgba(91,224,194,0.9)',
    });

    // Playing-card clutched in hand — a lone ace of spades
    ctx.save();
    ctx.translate(160, 580);
    ctx.rotate(0.2);
    ctx.fillStyle = 'rgba(232,226,204,0.8)';
    ctx.fillRect(0, 0, 48, 72);
    ctx.fillStyle = 'rgba(30,30,40,0.8)';
    ctx.font = 'bold 32px serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u2660', 24, 44);
    ctx.restore();

    // Drowned coins on neckline
    ctx.fillStyle = 'rgba(181,146,72,0.7)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(235 + i * 9, 320 + Math.abs(Math.sin(i)) * 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(c);
  }

  function makeMuseTexture() {
    const c = canvas(512, 1024);
    const ctx = c.getContext('2d');
    // Aura — coral rose pink
    const aura = ctx.createRadialGradient(256, 480, 40, 256, 480, 520);
    aura.addColorStop(0, 'rgba(255,107,138,0.38)');
    aura.addColorStop(0.4, 'rgba(255,107,138,0.15)');
    aura.addColorStop(1, 'rgba(255,107,138,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 512, 1024);

    paintNPCBase(ctx, {
      bodyColor: 'rgba(140,80,110,0.55)',
      innerColor: 'rgba(90,50,80,0.5)',
      skinColor: 'rgba(245,228,220,0.95)',
      hairColor: 'rgba(255,107,138,0.7)',
      dressAccent: 'rgba(255,107,138,0.4)',
      trim: 'rgba(255,190,180,0.75)',
      eyeGlow: 'rgba(255,180,200,1)',
    });

    // Quill + scroll in her hands
    ctx.strokeStyle = 'rgba(232,226,204,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(360, 520);
    ctx.quadraticCurveTo(400, 470, 420, 440);
    ctx.stroke();
    // Scroll
    ctx.fillStyle = 'rgba(232,226,204,0.7)';
    ctx.fillRect(130, 540, 70, 12);
    ctx.strokeStyle = 'rgba(60,40,40,0.5)';
    ctx.strokeRect(130, 540, 70, 12);

    // Rose petals floating around
    ctx.fillStyle = 'rgba(255,107,138,0.5)';
    for (let i = 0; i < 12; i++) {
      const px = 80 + Math.random() * 352;
      const py = 80 + Math.random() * 300;
      ctx.beginPath();
      ctx.ellipse(px, py, 4, 8, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(c);
  }

  function makeMirrorTexture() {
    // The Mirror — Klimt Danaë register. Body painted as a warm-skin silhouette
    // with flowing hair as drapery, gold-leaf coin scatter acting as both dress
    // and decoration. Nude/draped in the classical-painting tradition.
    const c = canvas(512, 1024);
    const ctx = c.getContext('2d');

    // Dark gold background wash
    const bg = ctx.createRadialGradient(256, 500, 60, 256, 500, 550);
    bg.addColorStop(0, 'rgba(74,60,30,0.35)');
    bg.addColorStop(0.4, 'rgba(40,32,15,0.25)');
    bg.addColorStop(1, 'rgba(20,12,6,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 1024);

    // BODY SILHOUETTE — full figure, skin-toned, painted as a flowing form
    const skinA = 'rgba(238,210,180,0.92)';
    const skinShadow = 'rgba(150,105,70,0.45)';
    const skinHighlight = 'rgba(255,232,205,0.55)';

    // Silhouette from shoulders to knees (she stands)
    ctx.fillStyle = skinA;
    ctx.beginPath();
    // Shoulders
    ctx.moveTo(196, 330);
    ctx.bezierCurveTo(180, 340, 178, 360, 184, 380);
    // Arm (left) tucked toward hip
    ctx.bezierCurveTo(170, 420, 168, 470, 180, 520);
    ctx.bezierCurveTo(186, 560, 184, 600, 186, 640);
    // Hip left
    ctx.bezierCurveTo(176, 680, 172, 740, 190, 800);
    ctx.bezierCurveTo(196, 860, 200, 920, 216, 980);
    // Base
    ctx.lineTo(296, 980);
    ctx.bezierCurveTo(312, 920, 316, 860, 322, 800);
    ctx.bezierCurveTo(340, 740, 336, 680, 326, 640);
    ctx.bezierCurveTo(328, 600, 326, 560, 332, 520);
    ctx.bezierCurveTo(344, 470, 342, 420, 328, 380);
    ctx.bezierCurveTo(334, 360, 332, 340, 316, 330);
    ctx.closePath();
    ctx.fill();

    // Shadow down the center — suggests form without explicit anatomy
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.moveTo(256, 360);
    ctx.bezierCurveTo(246, 480, 244, 620, 254, 780);
    ctx.bezierCurveTo(258, 860, 260, 920, 256, 970);
    ctx.bezierCurveTo(252, 920, 254, 860, 258, 780);
    ctx.bezierCurveTo(268, 620, 266, 480, 256, 360);
    ctx.fill();

    // Soft highlight down one side — a light source from the right
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = skinHighlight;
    ctx.beginPath();
    ctx.moveTo(296, 380);
    ctx.bezierCurveTo(308, 480, 318, 620, 312, 800);
    ctx.bezierCurveTo(308, 880, 306, 940, 300, 970);
    ctx.lineTo(288, 970);
    ctx.bezierCurveTo(288, 940, 290, 880, 292, 800);
    ctx.bezierCurveTo(296, 620, 290, 480, 286, 380);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // HEAD — pale skin, painted face
    ctx.fillStyle = 'rgba(250,235,215,0.97)';
    ctx.shadowColor = 'rgba(199,166,255,0.6)';
    ctx.shadowBlur = 32;
    ctx.beginPath();
    ctx.ellipse(256, 230, 52, 72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Closed-eyes serenity — thin lines
    ctx.strokeStyle = 'rgba(90,60,40,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(224, 226); ctx.quadraticCurveTo(234, 234, 244, 226); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(268, 226); ctx.quadraticCurveTo(278, 234, 288, 226); ctx.stroke();

    // Lips — warm stain
    ctx.fillStyle = 'rgba(170,70,95,0.8)';
    ctx.beginPath();
    ctx.ellipse(256, 278, 16, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // HAIR — flows down, covering one breast like Pre-Raphaelite compositions
    ctx.strokeStyle = 'rgba(199,166,255,0.78)';
    ctx.lineWidth = 3.5;
    // Rising strands (underwater float)
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      const sx = 206 + i * 5 + (Math.random() - 0.5) * 8;
      ctx.moveTo(sx, 180);
      let x = sx, y = 180;
      for (let k = 0; k < 12; k++) {
        x += (Math.random() - 0.5) * 18;
        y -= 10 + Math.random() * 12;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Cascading hair as drapery over front of body
    ctx.fillStyle = 'rgba(199,166,255,0.65)';
    ctx.beginPath();
    ctx.moveTo(228, 300);
    ctx.bezierCurveTo(196, 400, 200, 520, 230, 620);
    ctx.bezierCurveTo(240, 660, 236, 700, 220, 740);
    ctx.lineTo(244, 760);
    ctx.bezierCurveTo(256, 700, 260, 640, 258, 580);
    ctx.bezierCurveTo(254, 500, 244, 400, 248, 300);
    ctx.closePath();
    ctx.fill();
    // Second strand covering the other
    ctx.fillStyle = 'rgba(139,111,214,0.55)';
    ctx.beginPath();
    ctx.moveTo(284, 300);
    ctx.bezierCurveTo(316, 400, 312, 520, 282, 620);
    ctx.bezierCurveTo(272, 660, 276, 700, 292, 740);
    ctx.lineTo(268, 760);
    ctx.bezierCurveTo(256, 700, 252, 640, 254, 580);
    ctx.bezierCurveTo(258, 500, 268, 400, 264, 300);
    ctx.closePath();
    ctx.fill();

    // GOLD-LEAF COIN SCATTER — sparse, like Klimt's Danaë — on body + near hips
    ctx.fillStyle = 'rgba(181,146,72,0.75)';
    ctx.strokeStyle = 'rgba(232,212,160,0.6)';
    ctx.lineWidth = 0.8;
    const coinSpots = [];
    // Upper body cluster
    for (let i = 0; i < 12; i++) coinSpots.push([220 + Math.random()*72, 400 + Math.random()*120, 5 + Math.random()*3]);
    // Hip cluster
    for (let i = 0; i < 18; i++) coinSpots.push([180 + Math.random()*160, 640 + Math.random()*160, 5 + Math.random()*3]);
    // Lower legs
    for (let i = 0; i < 14; i++) coinSpots.push([200 + Math.random()*120, 820 + Math.random()*140, 4 + Math.random()*2]);
    coinSpots.forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    });

    // Gold-leaf body-edge outline on one side (Klimt signature)
    ctx.strokeStyle = 'rgba(232,212,160,0.55)';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = 'rgba(181,146,72,0.7)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(328, 380);
    ctx.bezierCurveTo(334, 470, 342, 560, 336, 640);
    ctx.bezierCurveTo(338, 720, 332, 820, 316, 900);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Subtle gold ornamentation — hair pins, bracelet
    ctx.fillStyle = 'rgba(232,212,160,0.85)';
    ctx.shadowColor = '#b59248';
    ctx.shadowBlur = 10;
    // Hair pins
    ctx.beginPath(); ctx.arc(218, 210, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(294, 210, 3, 0, Math.PI * 2); ctx.fill();
    // Bracelet on right wrist
    ctx.beginPath();
    ctx.ellipse(336, 640, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing eyes barely visible through closed lids (her gaze is elsewhere)
    ctx.fillStyle = 'rgba(181,146,72,0.8)';
    ctx.shadowColor = '#b59248';
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(234, 228, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(278, 228, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Mermaid tail overpaint — gold-violet, Klimt register
    paintMermaidTailOver(ctx, {
      tailInner: 'rgba(181,146,72,0.92)',
      tailOuter: 'rgba(70,40,12,0.97)',
      tailHL:    'rgba(232,212,160,0.75)',
      scale:     'rgba(255,230,180,0.55)',
      trim:      'rgba(232,212,160,0.9)',
    });

    // Scatter more gold coins along the tail edge — mermaid's winnings
    ctx.fillStyle = 'rgba(232,212,160,0.85)';
    ctx.strokeStyle = 'rgba(181,146,72,0.7)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 14; i++) {
      const px = 200 + Math.random() * 112;
      const py = 610 + Math.random() * 260;
      const r = 4 + Math.random() * 2;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.stroke();
    }

    return new THREE.CanvasTexture(c);
  }

  function makeMerchantTexture() {
    const c = canvas(512, 1024);
    const ctx = c.getContext('2d');
    // Warm amber aura
    const aura = ctx.createRadialGradient(256, 460, 40, 256, 460, 500);
    aura.addColorStop(0, 'rgba(232,200,140,0.4)');
    aura.addColorStop(0.4, 'rgba(181,146,72,0.18)');
    aura.addColorStop(1, 'rgba(181,146,72,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 512, 1024);

    paintNPCBase(ctx, {
      bodyColor: 'rgba(120,85,55,0.65)',
      innerColor: 'rgba(80,55,30,0.55)',
      skinColor: 'rgba(245,225,195,0.95)',
      hairColor: 'rgba(181,146,72,0.72)',
      dressAccent: 'rgba(232,200,140,0.4)',
      trim: 'rgba(232,212,160,0.85)',
      eyeGlow: 'rgba(232,200,140,1)',
    });

    // Jewelry on her fingers — scales drop from wrists
    ctx.fillStyle = 'rgba(232,212,160,0.85)';
    ctx.shadowColor = '#b59248';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(168 - i * 8, 640 + i * 18, 4 - i*0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(344 + i * 8, 640 + i * 18, 4 - i*0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Coin purse at hip — velvet with gold string
    ctx.fillStyle = 'rgba(80,20,40,0.8)';
    ctx.beginPath();
    ctx.ellipse(330, 700, 28, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,212,160,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(302, 680); ctx.lineTo(358, 680); ctx.stroke();
    // Coins tumbling
    ctx.fillStyle = 'rgba(232,212,160,0.85)';
    ctx.beginPath(); ctx.arc(325, 745, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(340, 755, 4, 0, Math.PI * 2); ctx.fill();

    // Cape of coins at neckline — overlapping disks
    ctx.fillStyle = 'rgba(181,146,72,0.5)';
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 14; i++) {
        const x = 140 + i * 16;
        const y = 380 + r * 12;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return new THREE.CanvasTexture(c);
  }

  function makeCharmKeeperTexture() {
    const c = canvas(512, 1024);
    const ctx = c.getContext('2d');
    // Rose aura
    const aura = ctx.createRadialGradient(256, 480, 40, 256, 480, 520);
    aura.addColorStop(0, 'rgba(255,150,175,0.45)');
    aura.addColorStop(0.4, 'rgba(255,107,138,0.18)');
    aura.addColorStop(1, 'rgba(255,107,138,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 512, 1024);

    paintNPCBase(ctx, {
      bodyColor: 'rgba(200,120,140,0.55)',
      innerColor: 'rgba(140,70,90,0.55)',
      skinColor: 'rgba(250,232,225,0.96)',
      hairColor: 'rgba(255,107,138,0.7)',
      dressAccent: 'rgba(255,160,185,0.45)',
      trim: 'rgba(255,200,210,0.85)',
      eyeGlow: 'rgba(255,180,200,1)',
    });

    // Lace choker
    ctx.fillStyle = 'rgba(40,10,18,0.7)';
    ctx.fillRect(208, 300, 96, 14);
    ctx.strokeStyle = 'rgba(255,200,210,0.6)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(216 + i * 8, 307, 3, 0, Math.PI);
      ctx.stroke();
    }

    // Dripping earrings — teardrop rubies
    ctx.fillStyle = 'rgba(255,80,100,0.85)';
    ctx.shadowColor = '#ff6b8a';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(196, 280, 5, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(316, 280, 5, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Rose held at chest
    ctx.save();
    ctx.translate(340, 480);
    ctx.rotate(0.3);
    // Stem
    ctx.strokeStyle = 'rgba(60,100,40,0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, 70); ctx.stroke();
    // Bloom
    ctx.fillStyle = 'rgba(200,40,70,0.95)';
    ctx.shadowColor = '#ff6b8a';
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,107,138,0.8)';
    ctx.beginPath(); ctx.arc(-6, -4, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -4, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 6, 8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Mermaid tail overpaint
    paintMermaidTailOver(ctx, {
      tailInner: 'rgba(180,60,100,0.92)',
      tailOuter: 'rgba(60,10,30,0.96)',
      tailHL:    'rgba(255,130,160,0.75)',
      scale:     'rgba(255,180,200,0.55)',
      trim:      'rgba(232,212,160,0.85)',
    });

    // Floating petals around — redraw on top of tail for unity
    ctx.fillStyle = 'rgba(255,107,138,0.55)';
    for (let i = 0; i < 16; i++) {
      const px = 80 + Math.random() * 352;
      const py = 120 + Math.random() * 780;
      ctx.beginPath();
      ctx.ellipse(px, py, 5, 9, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(c);
  }

  function makeCurtainFigureTexture(pose) {
    const c = canvas(512, 1024);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 1024);

    // Dim aura
    const aura = ctx.createRadialGradient(256, 500, 40, 256, 500, 480);
    aura.addColorStop(0, 'rgba(255,140,160,0.25)');
    aura.addColorStop(1, 'rgba(255,140,160,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 512, 1024);

    // Single silhouette — no features, just a shape
    ctx.fillStyle = 'rgba(140,80,95,0.78)';
    if (pose === 'recline') {
      // Reclining curve
      ctx.beginPath();
      ctx.moveTo(120, 480);
      ctx.bezierCurveTo(90, 500, 90, 560, 110, 600);
      ctx.bezierCurveTo(160, 680, 280, 720, 400, 720);
      ctx.bezierCurveTo(430, 720, 440, 700, 420, 680);
      ctx.bezierCurveTo(320, 650, 220, 600, 180, 540);
      ctx.bezierCurveTo(160, 500, 140, 470, 120, 480);
      ctx.closePath();
      ctx.fill();
      // Head
      ctx.beginPath(); ctx.ellipse(140, 490, 26, 34, 0, 0, Math.PI * 2); ctx.fill();
      // Hair stream
      ctx.strokeStyle = 'rgba(255,107,138,0.45)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(100 + i * 3, 470);
        ctx.lineTo(50 + i * 5, 430 - i * 4);
        ctx.stroke();
      }
    } else if (pose === 'seated') {
      // Seated silhouette — vertical
      ctx.beginPath();
      ctx.moveTo(220, 380);
      ctx.bezierCurveTo(180, 520, 170, 700, 200, 900);
      ctx.lineTo(312, 900);
      ctx.bezierCurveTo(342, 700, 332, 520, 292, 380);
      ctx.closePath();
      ctx.fill();
      // Crossed-legs hint
      ctx.beginPath();
      ctx.moveTo(200, 900);
      ctx.quadraticCurveTo(256, 870, 312, 900);
      ctx.fill();
      // Head
      ctx.beginPath(); ctx.ellipse(256, 320, 44, 60, 0, 0, Math.PI * 2); ctx.fill();
      // Hair
      ctx.strokeStyle = 'rgba(255,107,138,0.55)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        const sx = 216 + i * 4;
        ctx.moveTo(sx, 280);
        let x = sx, y = 280;
        for (let k = 0; k < 6; k++) {
          x += (Math.random() - 0.5) * 24;
          y -= 12 + Math.random() * 10;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else {
      // Turned away — painted back-silhouette, Pre-Raphaelite register.
      // The figure faces the wall; her hair cascades down her back as drapery.
      // Skin tones warm on the shoulders + lower back; hair covers the middle.

      // Warm-skin body silhouette (full back-view, narrower waist)
      ctx.fillStyle = 'rgba(228,195,170,0.88)';
      ctx.beginPath();
      ctx.moveTo(204, 360);
      ctx.bezierCurveTo(180, 440, 176, 520, 192, 600); // shoulder to waist
      ctx.bezierCurveTo(188, 660, 184, 720, 200, 790); // hip curve
      ctx.bezierCurveTo(212, 880, 228, 940, 256, 960); // base
      ctx.bezierCurveTo(284, 940, 300, 880, 312, 790);
      ctx.bezierCurveTo(328, 720, 324, 660, 320, 600);
      ctx.bezierCurveTo(336, 520, 332, 440, 308, 360);
      ctx.closePath();
      ctx.fill();

      // Spine shadow
      ctx.strokeStyle = 'rgba(120,80,55,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(256, 400);
      ctx.bezierCurveTo(253, 500, 258, 620, 256, 740);
      ctx.stroke();

      // Right-side highlight (light from right of frame)
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(255,228,210,0.75)';
      ctx.beginPath();
      ctx.moveTo(288, 380);
      ctx.bezierCurveTo(298, 470, 308, 580, 304, 700);
      ctx.bezierCurveTo(300, 820, 296, 900, 288, 950);
      ctx.lineTo(282, 950);
      ctx.bezierCurveTo(282, 900, 284, 820, 286, 700);
      ctx.bezierCurveTo(290, 580, 286, 470, 282, 380);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Back of head
      ctx.fillStyle = 'rgba(248,228,210,0.92)';
      ctx.beginPath(); ctx.ellipse(256, 290, 44, 58, 0, 0, Math.PI * 2); ctx.fill();

      // Cascading hair as drapery — covers most of the back, classic Pre-Raphaelite
      ctx.fillStyle = 'rgba(255,107,138,0.82)';
      ctx.beginPath();
      ctx.moveTo(218, 300);
      ctx.bezierCurveTo(188, 440, 192, 620, 220, 790);
      ctx.bezierCurveTo(236, 860, 252, 920, 256, 950);
      ctx.bezierCurveTo(260, 920, 276, 860, 292, 790);
      ctx.bezierCurveTo(320, 620, 324, 440, 294, 300);
      ctx.closePath();
      ctx.fill();

      // Hair strands — finer detail
      ctx.strokeStyle = 'rgba(255,140,165,0.45)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        const sx = 212 + i * 6;
        ctx.moveTo(sx, 310);
        let x = sx, y = 310;
        for (let k = 0; k < 7; k++) {
          x += (Math.random() - 0.5) * 18;
          y += 80 + Math.random() * 20;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Shoulders visible above the hair fall — skin
      ctx.fillStyle = 'rgba(245,218,200,0.92)';
      ctx.beginPath();
      ctx.moveTo(204, 360);
      ctx.bezierCurveTo(220, 340, 292, 340, 308, 360);
      ctx.lineTo(298, 380);
      ctx.bezierCurveTo(282, 368, 230, 368, 214, 380);
      ctx.closePath();
      ctx.fill();

      // Gold-leaf edge highlight (Klimt signature)
      ctx.strokeStyle = 'rgba(232,212,160,0.42)';
      ctx.lineWidth = 1.3;
      ctx.shadowColor = 'rgba(181,146,72,0.55)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(308, 380);
      ctx.bezierCurveTo(322, 480, 332, 620, 318, 800);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    return new THREE.CanvasTexture(c);
  }

  function makeConfessorTexture() {
    /* Veiled woman behind the lattice — never clearly seen.
       Warm amber glow behind her suggests a face; the veil reveals nothing. */
    const c = canvas(512, 1024);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 1024);

    // Warm oil-lamp aura
    const aura = ctx.createRadialGradient(256, 440, 30, 256, 440, 500);
    aura.addColorStop(0, 'rgba(255,210,140,0.55)');
    aura.addColorStop(0.4, 'rgba(181,146,72,0.2)');
    aura.addColorStop(1, 'rgba(60,30,10,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 512, 1024);

    // Seated figure — robed body
    ctx.fillStyle = 'rgba(40,15,18,0.92)';
    ctx.beginPath();
    ctx.moveTo(180, 340);
    ctx.bezierCurveTo(140, 450, 130, 600, 150, 760);
    ctx.bezierCurveTo(160, 860, 190, 920, 256, 940);
    ctx.bezierCurveTo(322, 920, 352, 860, 362, 760);
    ctx.bezierCurveTo(382, 600, 372, 450, 332, 340);
    ctx.closePath();
    ctx.fill();

    // Robe folds
    ctx.strokeStyle = 'rgba(90,30,40,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const sx = 170 + i * 22;
      ctx.moveTo(sx, 400);
      ctx.lineTo(sx + (Math.random() - 0.5) * 30, 920);
      ctx.stroke();
    }

    // Hood shadow
    ctx.fillStyle = 'rgba(10,5,12,0.95)';
    ctx.beginPath();
    ctx.moveTo(176, 340);
    ctx.bezierCurveTo(160, 240, 200, 160, 256, 150);
    ctx.bezierCurveTo(312, 160, 352, 240, 336, 340);
    ctx.closePath();
    ctx.fill();

    // Warm glow from inside the hood — suggesting a face, never revealing one
    const faceGlow = ctx.createRadialGradient(256, 260, 10, 256, 260, 70);
    faceGlow.addColorStop(0, 'rgba(255,215,165,0.75)');
    faceGlow.addColorStop(0.5, 'rgba(255,180,120,0.3)');
    faceGlow.addColorStop(1, 'rgba(80,30,10,0)');
    ctx.fillStyle = faceGlow;
    ctx.beginPath();
    ctx.ellipse(256, 260, 65, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Veil — thin semi-transparent lace across the face
    ctx.fillStyle = 'rgba(240,220,200,0.25)';
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.lineTo(312, 200);
    ctx.lineTo(320, 340);
    ctx.lineTo(192, 340);
    ctx.closePath();
    ctx.fill();
    // Veil pattern — crisscross lace
    ctx.strokeStyle = 'rgba(255,230,200,0.3)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(200 + i * 12, 210); ctx.lineTo(308, 330);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(312 - i * 12, 210); ctx.lineTo(204, 330);
      ctx.stroke();
    }

    // A single faint glint where eyes would be — but you can't quite see
    ctx.fillStyle = 'rgba(255,220,180,0.45)';
    ctx.shadowColor = 'rgba(255,220,180,0.8)';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(234, 248, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(278, 248, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Folded hands in lap — hands steepled
    ctx.fillStyle = 'rgba(230,205,175,0.85)';
    ctx.beginPath();
    ctx.moveTo(220, 620);
    ctx.bezierCurveTo(240, 600, 272, 600, 292, 620);
    ctx.bezierCurveTo(288, 660, 224, 660, 220, 620);
    ctx.closePath();
    ctx.fill();
    // Cross / pendant hanging over the hands
    ctx.fillStyle = 'rgba(232,212,160,0.9)';
    ctx.shadowColor = '#b59248';
    ctx.shadowBlur = 8;
    ctx.fillRect(252, 560, 8, 60);
    ctx.fillRect(234, 578, 44, 8);
    ctx.shadowBlur = 0;

    return new THREE.CanvasTexture(c);
  }

  function makeGhostPlayerTexture(pose) {
    /* Translucent violet silhouette of a patron who has been at this table
       for far too long. Never interactive. Three poses. */
    const c = canvas(384, 512);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 384, 512);

    // Dim violet aura
    const aura = ctx.createRadialGradient(192, 280, 20, 192, 280, 250);
    aura.addColorStop(0, 'rgba(199,166,255,0.35)');
    aura.addColorStop(0.5, 'rgba(139,111,214,0.15)');
    aura.addColorStop(1, 'rgba(139,111,214,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 384, 512);

    // Body silhouette — seated posture
    ctx.fillStyle = 'rgba(120,100,150,0.65)';

    if (pose === 'hunched') {
      // Forward-hunched over the table
      ctx.beginPath();
      ctx.moveTo(128, 180);
      ctx.bezierCurveTo(106, 220, 102, 280, 118, 340);
      ctx.bezierCurveTo(130, 400, 150, 440, 170, 470);
      ctx.lineTo(214, 470);
      ctx.bezierCurveTo(234, 440, 254, 400, 266, 340);
      ctx.bezierCurveTo(282, 280, 278, 220, 256, 180);
      ctx.closePath();
      ctx.fill();
      // Head — bowed
      ctx.beginPath();
      ctx.ellipse(192, 160, 38, 44, -0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (pose === 'stacking') {
      // Upright, hands arranging coin stack on table
      ctx.beginPath();
      ctx.moveTo(142, 190);
      ctx.bezierCurveTo(128, 260, 130, 340, 150, 420);
      ctx.bezierCurveTo(160, 450, 170, 470, 192, 470);
      ctx.bezierCurveTo(214, 470, 224, 450, 234, 420);
      ctx.bezierCurveTo(254, 340, 256, 260, 242, 190);
      ctx.closePath();
      ctx.fill();
      // Arms reaching down to table
      ctx.beginPath();
      ctx.moveTo(150, 220); ctx.bezierCurveTo(120, 300, 115, 360, 140, 400);
      ctx.lineTo(158, 400); ctx.bezierCurveTo(140, 360, 148, 300, 168, 220);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(234, 220); ctx.bezierCurveTo(264, 300, 269, 360, 244, 400);
      ctx.lineTo(226, 400); ctx.bezierCurveTo(244, 360, 236, 300, 216, 220);
      ctx.closePath(); ctx.fill();
      // Head — neutral
      ctx.beginPath();
      ctx.ellipse(192, 148, 38, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      // Coin stack on the table in front — tiny gold disks
      ctx.fillStyle = 'rgba(181,146,72,0.6)';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.ellipse(192, 440 - i * 3, 18, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Face in hands — despair pose
      ctx.beginPath();
      ctx.moveTo(132, 180);
      ctx.bezierCurveTo(116, 240, 116, 320, 130, 400);
      ctx.bezierCurveTo(140, 440, 162, 470, 192, 470);
      ctx.bezierCurveTo(222, 470, 244, 440, 254, 400);
      ctx.bezierCurveTo(268, 320, 268, 240, 252, 180);
      ctx.closePath();
      ctx.fill();
      // Arms up covering face
      ctx.beginPath();
      ctx.moveTo(142, 190); ctx.bezierCurveTo(120, 150, 150, 120, 180, 130);
      ctx.lineTo(192, 180); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(242, 190); ctx.bezierCurveTo(264, 150, 234, 120, 204, 130);
      ctx.lineTo(192, 180); ctx.closePath(); ctx.fill();
      // Head hidden behind hands
      ctx.fillStyle = 'rgba(90,75,120,0.7)';
      ctx.beginPath();
      ctx.ellipse(192, 150, 30, 36, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hollow eye pits (visible only in non-hands pose)
    if (pose !== 'despair') {
      ctx.fillStyle = 'rgba(20,10,30,0.75)';
      ctx.beginPath(); ctx.ellipse(178, 152, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(206, 152, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Hair — long, stringy
    ctx.strokeStyle = 'rgba(139,111,214,0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      const sx = 160 + i * 5;
      ctx.moveTo(sx, 110);
      let x = sx, y = 110;
      for (let k = 0; k < 6; k++) {
        x += (Math.random() - 0.5) * 18;
        y -= 8 + Math.random() * 10;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    return new THREE.CanvasTexture(c);
  }

  function makeChorusFigureTexture(idx) {
    const c = canvas(256, 512);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 512);

    // Aura
    const aura = ctx.createRadialGradient(128, 250, 20, 128, 250, 260);
    aura.addColorStop(0, 'rgba(199,166,255,0.3)');
    aura.addColorStop(1, 'rgba(199,166,255,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 256, 512);

    // Sinewy body silhouette
    ctx.fillStyle = 'rgba(180,160,220,0.45)';
    ctx.beginPath();
    ctx.moveTo(100, 180);
    ctx.bezierCurveTo(80, 260, 85, 360, 100, 440);
    ctx.bezierCurveTo(110, 480, 128, 500, 128, 500);
    ctx.bezierCurveTo(128, 500, 146, 480, 156, 440);
    ctx.bezierCurveTo(171, 360, 176, 260, 156, 180);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = 'rgba(220,210,230,0.55)';
    ctx.shadowColor = 'rgba(199,166,255,0.6)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(128, 120, 30, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Hollow eyes
    ctx.fillStyle = 'rgba(30,20,50,0.65)';
    ctx.beginPath(); ctx.ellipse(115, 118, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(141, 118, 6, 9, 0, 0, Math.PI * 2); ctx.fill();

    // Streaming hair
    ctx.strokeStyle = 'rgba(199,166,255,0.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      const sx = 100 + i * 5;
      ctx.moveTo(sx, 90);
      let x = sx, y = 90;
      for (let k = 0; k < 6; k++) {
        x += (Math.random() - 0.5) * 16;
        y -= 10 + Math.random() * 8;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Trailing wisps
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const sx = 90 + Math.random() * 76;
      ctx.moveTo(sx, 460);
      let x = sx, y = 460;
      for (let k = 0; k < 4; k++) {
        x += (Math.random() - 0.5) * 18;
        y += 10 + Math.random() * 8;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    return new THREE.CanvasTexture(c);
  }

  function makeStainedGlassTexture() {
    const c = canvas(1024, 600);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#02060d';
    ctx.fillRect(0, 0, 1024, 600);

    // Rounded arch frame (trefoil)
    ctx.strokeStyle = 'rgba(232,226,204,0.6)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(40, 590);
    ctx.lineTo(40, 200);
    ctx.quadraticCurveTo(512, -100, 984, 200);
    ctx.lineTo(984, 590);
    ctx.stroke();

    // Central mandala — a kraken/eye
    ctx.save();
    ctx.translate(512, 280);

    // Radiating panels
    const panels = 12;
    const palette = [
      'rgba(126,240,255,0.6)',
      'rgba(199,166,255,0.55)',
      'rgba(255,107,138,0.55)',
      'rgba(91,224,194,0.55)',
      'rgba(167,255,158,0.5)',
      'rgba(181,146,72,0.6)',
    ];
    for (let i = 0; i < panels; i++) {
      const a0 = (i / panels) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / panels) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 200, a0, a1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(30, 30, 50, 0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Inner disc — eye
    ctx.fillStyle = 'rgba(2,6,13,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(126,240,255,0.9)';
    ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(2,6,13,1)';
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();

    // Kraken tentacles sprouting
    ctx.strokeStyle = 'rgba(199,166,255,0.8)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      const r0 = 70, r1 = 180;
      const sx = Math.cos(a) * r0, sy = Math.sin(a) * r0;
      const ex = Math.cos(a) * r1, ey = Math.sin(a) * r1;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + Math.cos(a + 0.5) * 30, sy + Math.sin(a + 0.5) * 30, ex, ey);
      ctx.stroke();
    }
    ctx.restore();

    // Side saints: small figures on either side of the central mandala
    for (let side = 0; side < 2; side++) {
      const x = side === 0 ? 180 : 844;
      const y = 320;
      ctx.fillStyle = side === 0 ? 'rgba(199,166,255,0.6)' : 'rgba(126,240,255,0.6)';
      // Halo
      ctx.beginPath(); ctx.arc(x, y - 90, 30, 0, Math.PI * 2); ctx.fill();
      // Body
      ctx.beginPath();
      ctx.moveTo(x - 30, y - 50);
      ctx.lineTo(x + 30, y - 50);
      ctx.lineTo(x + 40, y + 160);
      ctx.lineTo(x - 40, y + 160);
      ctx.closePath();
      ctx.fill();
      // Head
      ctx.fillStyle = 'rgba(232,226,204,0.8)';
      ctx.beginPath();
      ctx.arc(x, y - 70, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30, 30, 50, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(x - 30, y - 50, 60, 210);
      ctx.stroke();
    }

    // Words ornamental
    ctx.fillStyle = 'rgba(232,226,204,0.45)';
    ctx.font = 'italic 22px "Cormorant Garamond", serif';
    ctx.textAlign = 'center';
    ctx.fillText('In the sea monster we trust', 512, 540);

    return new THREE.CanvasTexture(c);
  }

  function makeRayTexture() {
    const c = canvas(128, 512);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, 'rgba(126,240,255,0.35)');
    g.addColorStop(0.3, 'rgba(126,240,255,0.18)');
    g.addColorStop(1, 'rgba(126,240,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 512);
    // horizontal taper
    for (let i = 0; i < 128; i++) {
      const tapered = Math.min(i, 127 - i) / 64;
      ctx.fillStyle = `rgba(0,0,0,${1 - tapered})`;
      ctx.fillRect(i, 0, 1, 512);
    }
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  function makeCausticTexture() {
    const c = canvas(512, 512);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 512, 512);
    // Voronoi-esque caustic webs
    ctx.strokeStyle = 'rgba(126,240,255,0.7)';
    ctx.lineWidth = 1.5;
    const nodes = [];
    for (let i = 0; i < 36; i++) {
      nodes.push([Math.random() * 512, Math.random() * 512]);
    }
    nodes.forEach((n, i) => {
      // nearest neighbors
      const dists = nodes.map((m, j) => [i === j ? 99999 : Math.hypot(n[0]-m[0], n[1]-m[1]), j]);
      dists.sort((a, b) => a[0] - b[0]);
      for (let k = 0; k < 3; k++) {
        const [d, j] = dists[k];
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(n[0], n[1]);
          ctx.lineTo(nodes[j][0], nodes[j][1]);
          ctx.stroke();
        }
      }
    });
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function makeBubbleTexture() {
    const c = canvas(128, 128);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    const g = ctx.createRadialGradient(54, 54, 6, 64, 64, 58);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.25, 'rgba(126,240,255,0.35)');
    g.addColorStop(0.85, 'rgba(126,240,255,0.12)');
    g.addColorStop(1, 'rgba(126,240,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI*2); ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(48, 46, 6, 0, Math.PI*2); ctx.fill();
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  /* ---------- The World ---------- */
  class TrappedWorld {
    constructor(container, opts = {}) {
      this.container = container;
      this.opts = opts;
      this.listeners = { interact: [], exit: [], siren: [], prompt: [], lock: [], unlock: [], portal: [], merchant: [], charmkeeper: [], confessor: [], room: [], ledger: [] };
      this.disposed = false;
      this.paused = false;
      this.tables = [];
      this.interactables = [];
      this.activeInteract = null;
      this.keys = Object.create(null);
      this.bobT = 0;
      this.swimT = 0;
      this.clock = new THREE.Clock();
      this.velocity = new THREE.Vector3();
      this.currentRoom = 'casino';

      this.initRenderer();
      this.initScene();
      this.buildAmbience();
      this.buildPostFX();
      this.bindInput();
      // Initial room — respect ?room= query param for direct-to-room screenshots
      const params = new URLSearchParams(window.location.search);
      const startRoom = params.get('room');
      this.buildRoom(
        ['pawnshop','dressing','confessional'].includes(startRoom) ? startRoom : 'casino'
      );
      this.onResize = () => this.handleResize();
      window.addEventListener('resize', this.onResize);
      this.handleResize();
      // Wave 1 — render overhaul, gallery, mermaid idle, loss glitch.
      applyWave1(this);
      this.loop();
    }

    initRenderer() {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.renderer.setSize(w, h);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.renderer.domElement.style.display = 'block';
      this.container.appendChild(this.renderer.domElement);
    }

    initScene() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x02060d);
      this.scene.fog = new THREE.FogExp2(0x041424, 0.034);

      this.camera = new THREE.PerspectiveCamera(76, 1, 0.1, 200);

      // Allow debug poses via URL: ?cam=x,y,z&look=x,y,z
      const params = new URLSearchParams(window.location.search);
      const cam = params.get('cam'), look = params.get('look');
      if (cam) {
        const [x, y, z] = cam.split(',').map(parseFloat);
        this.camera.position.set(x, y, z);
      } else {
        this.camera.position.set(0, PLAYER_HEIGHT, 16);
      }
      if (look) {
        const [x, y, z] = look.split(',').map(parseFloat);
        this.camera.lookAt(x, y, z);
      } else {
        this.camera.lookAt(0, PLAYER_HEIGHT, 0);
      }

      // Minimal scene-wide lighting (kept across rooms)
      const ambient = new THREE.AmbientLight(0x221e38, 0.25);
      this.scene.add(ambient);
      this.sceneAmbient = ambient;

      // Root for player controls
      this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
      this.scene.add(this.controls.getObject());
      this.controls.addEventListener('lock', () => { this.emit('lock'); });
      this.controls.addEventListener('unlock', () => { this.emit('unlock'); });

      // Room root — everything room-specific attaches here so we can tear it down cleanly
      this.roomRoot = new THREE.Group();
      this.scene.add(this.roomRoot);
    }

    /* =====================================================
       ROOM SYSTEM — tear down, rebuild, teleport player.
       ===================================================== */
    buildRoom(name) {
      // Tear down previous room
      if (this.roomRoot) {
        this.roomRoot.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
            else { if (obj.material.map) obj.material.map.dispose(); obj.material.dispose(); }
          }
        });
        this.scene.remove(this.roomRoot);
      }
      this.roomRoot = new THREE.Group();
      this.scene.add(this.roomRoot);

      // Reset collections that rooms own
      this.tables = [];
      this.fragments = [];
      this.npcs = [];
      this.chorus = [];
      this.prayerCandles = [];
      this.rays = [];
      this.bubbles = [];
      this.fish = [];
      this.interactables = [];
      this.activeInteract = null;
      this.door = null;
      this.sirenAltar = null;
      this.mirrorNpc = null;
      this.pool = null;
      this.piano = null;
      this.stainedGlass = null;
      this.stainedGlassLight = null;
      this.causticMat = null;

      this.currentRoom = name;

      if (name === 'casino') this.buildCasinoRoom();
      else if (name === 'pawnshop') this.buildPawnShopRoom();
      else if (name === 'dressing') this.buildDressingRoom();
      else if (name === 'confessional') this.buildConfessionalRoom();
      else this.buildCasinoRoom();

      // Teleport player to room spawn — respect ?cam=x,y,z&look=x,y,z url overrides
      const params = new URLSearchParams(window.location.search);
      const camOverride = params.get('cam'), lookOverride = params.get('look');
      const spawn = this.roomSpawn(name);
      const p = this.controls.getObject().position;
      if (camOverride) {
        const [cx, cy, cz] = camOverride.split(',').map(parseFloat);
        p.set(cx, cy, cz);
      } else {
        p.set(spawn.x, PLAYER_HEIGHT, spawn.z);
      }
      this.velocity.set(0, 0, 0);
      if (lookOverride) {
        const [lx, ly, lz] = lookOverride.split(',').map(parseFloat);
        this.camera.lookAt(lx, ly, lz);
      } else {
        this.camera.lookAt(spawn.lookX, PLAYER_HEIGHT, spawn.lookZ);
      }

      this.emit('room', name);
    }

    roomSpawn(name) {
      if (name === 'pawnshop')     return { x: 0, z: 7,  lookX: 0, lookZ: -4 };
      if (name === 'dressing')     return { x: 0, z: 7,  lookX: 0, lookZ: -4 };
      if (name === 'confessional') return { x: 0, z: 4,  lookX: 0, lookZ: -4 };
      return                              { x: 0, z: 26, lookX: 0, lookZ:  0 };
    }

    _add(obj) { this.roomRoot.add(obj); return obj; }

    buildCasinoRoom() {
      // Redirect scene.add to the room root while the existing build methods run.
      // This lets us tear down the whole room with a single dispose.
      const realScene = this.scene;
      const redir = { add: (o) => this.roomRoot.add(o) };
      this.scene = redir;

      this.buildFloor();
      this.buildWalls();
      this.buildCeiling();
      this.buildCentralStage();
      this.buildFloorDebris();
      this.buildTables();
      this.buildDoor();
      this.buildSirenAltar();
      this.buildFragments(this.opts.collectedFragments || []);
      this.buildNPCs(this.opts);
      this.buildStainedGlass();
      this.buildSunkenPiano();
      this.buildFloatingCandles();
      this.buildLedgerScroll();
      this.buildVegasDressing();
      this.buildTableNeons();
      this.buildChandelier();
      this.buildExtraChandeliers();
      this.buildCarpets();
      this.buildMarqueeArch();
      this.buildGhostPlayers();
      this.buildGalleryPaintings();
      this.buildSlotMachineBank();
      this.buildMirrorBall();
      this.buildSweepingSpotlights();
      this.buildTickerTape();
      this.buildFloorFog();

      this.scene = realScene;
      // Casino-specific lights (tear down with the room)
      const topLight = new THREE.DirectionalLight(0x7ef0ff, 0.65);
      topLight.position.set(6, 20, 4);
      this._add(topLight);
      const fill = new THREE.PointLight(0x5be0c2, 0.6, 40, 2);
      fill.position.set(0, 8, 0);
      this._add(fill);
      const coralColors = [0x7ef0ff, 0xc7a6ff, 0x5be0c2, 0xff6b8a];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = new THREE.PointLight(coralColors[i % coralColors.length], 0.7, 18, 2.2);
        p.position.set(Math.cos(a) * 24, 1.2, Math.sin(a) * 24);
        this._add(p);
        if (i === 0) this.doorLight = p;
      }
      this.doorGlow = new THREE.PointLight(0x7ef0ff, 1.4, 14, 2);
      this.doorGlow.position.set(0, 3.5, -29);
      this._add(this.doorGlow);
      this.sirenGlow = new THREE.PointLight(0xc7a6ff, 1.2, 12, 2);
      this.sirenGlow.position.set(-14, 3, 18);
      this._add(this.sirenGlow);

      // Portals are built with _add directly
      this.buildCasinoPortals();
    }

    buildCasinoPortals() {
      // Two archways on the east and west walls leading to the other rooms
      const make = (cfg) => {
        const group = new THREE.Group();
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x0a1a24, roughness: 0.6, metalness: 0.5, emissive: cfg.emissive, emissiveIntensity: 0.35 });
        const side1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.5, 0.8), frameMat);
        side1.position.set(-1.3, 2.75, 0); group.add(side1);
        const side2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.5, 0.8), frameMat);
        side2.position.set(1.3, 2.75, 0); group.add(side2);
        const archTop = new THREE.Mesh(
          new THREE.TorusGeometry(1.3, 0.22, 14, 36, Math.PI),
          frameMat
        );
        archTop.position.set(0, 5.5, 0); archTop.rotation.z = Math.PI;
        group.add(archTop);

        // Veil / beam inside archway
        const beamMat = new THREE.MeshBasicMaterial({
          color: cfg.color, transparent: true, opacity: 0.28,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 4.6), beamMat);
        beam.position.set(0, 2.75, -0.05);
        group.add(beam);
        group.userData.beam = beam;

        // Banner text texture
        const c = canvas(512, 128);
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, 512, 128);
        ctx.font = 'bold 42px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = cfg.labelColor;
        ctx.shadowColor = cfg.labelColor;
        ctx.shadowBlur = 22;
        const chars = cfg.label.split('');
        chars.forEach((ch, i) => {
          ctx.fillText(ch, 256 - ((chars.length - 1) * 22) / 2 + i * 22, 48);
        });
        ctx.font = 'italic 20px "Cormorant Garamond", serif';
        ctx.fillStyle = cfg.subColor;
        ctx.shadowBlur = 10;
        ctx.fillText(cfg.sub, 256, 92);
        const tex = new THREE.CanvasTexture(c);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(3.2, 0.8, 1);
        sprite.position.set(0, 6.4, 0);
        group.add(sprite);

        // Floor ring
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.8, 2.4, 32),
          new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        group.add(ring);
        group.userData.floorRing = ring;

        // Point light inside arch
        const light = new THREE.PointLight(cfg.color, 0.8, 10, 2);
        light.position.set(0, 3, 0.5);
        group.add(light);

        group.position.set(cfg.pos[0], 0, cfg.pos[1]);
        group.rotation.y = cfg.rot || 0;
        group.userData.kind = 'portal';
        group.userData.targetRoom = cfg.targetRoom;
        group.userData.name = cfg.label;
        group.userData.subtitle = cfg.sub;
        this.interactables.push(group);
        this._add(group);
        return group;
      };

      make({
        label: 'THE PAWN SHOP',
        sub: 'Anything is for sale.',
        color: 0xb59248,
        emissive: 0x3a2a10,
        labelColor: 'rgba(232,212,160,0.95)',
        subColor: 'rgba(181,146,72,0.85)',
        pos: [-CHAMBER_RADIUS + 1, 0],
        rot: Math.PI / 2,
        targetRoom: 'pawnshop',
      });
      make({
        label: 'THE DRESSING ROOM',
        sub: 'Where the others keep their charms.',
        color: 0xff6b8a,
        emissive: 0x401020,
        labelColor: 'rgba(255,200,210,0.95)',
        subColor: 'rgba(255,107,138,0.85)',
        pos: [CHAMBER_RADIUS - 1, 0],
        rot: -Math.PI / 2,
        targetRoom: 'dressing',
      });
    }

    /* ==================================================
       PAWN SHOP ROOM
       ================================================== */
    buildPawnShopRoom() {
      const ROOM_W = 18, ROOM_D = 14, ROOM_H = 7;

      // Floor — warm wood-plank
      const floorC = canvas(512, 512);
      const fctx = floorC.getContext('2d');
      fctx.fillStyle = '#2a1a0e';
      fctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 8; i++) {
        const y = i * 64;
        fctx.fillStyle = i % 2 === 0 ? '#3a2410' : '#2e1a0a';
        fctx.fillRect(0, y, 512, 64);
        fctx.strokeStyle = 'rgba(20,10,4,0.6)';
        fctx.strokeRect(0, y, 512, 64);
        // Grain streaks
        for (let k = 0; k < 20; k++) {
          fctx.strokeStyle = `rgba(${40 + Math.random()*30},${25 + Math.random()*15},10,${0.3 + Math.random()*0.3})`;
          fctx.lineWidth = 0.6;
          fctx.beginPath();
          fctx.moveTo(Math.random() * 512, y + Math.random() * 64);
          fctx.lineTo(Math.random() * 512, y + Math.random() * 64);
          fctx.stroke();
        }
      }
      const floorTex = new THREE.CanvasTexture(floorC);
      floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
      floorTex.repeat.set(3, 3);
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_W, ROOM_D),
        new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.05, emissive: 0x1a0e08, emissiveIntensity: 0.35 })
      );
      floor.rotation.x = -Math.PI / 2;
      this._add(floor);

      // Walls — deep plum velvet feel
      const wallC = canvas(256, 256);
      const wctx = wallC.getContext('2d');
      const wg = wctx.createLinearGradient(0, 0, 0, 256);
      wg.addColorStop(0, '#1a0a20');
      wg.addColorStop(1, '#0c0414');
      wctx.fillStyle = wg;
      wctx.fillRect(0, 0, 256, 256);
      // Vertical paneling
      wctx.strokeStyle = 'rgba(90,60,80,0.4)';
      for (let x = 0; x < 256; x += 32) {
        wctx.beginPath(); wctx.moveTo(x, 0); wctx.lineTo(x, 256); wctx.stroke();
      }
      const wallTex = new THREE.CanvasTexture(wallC);
      wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
      wallTex.repeat.set(4, 1);
      const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, metalness: 0.05, emissive: 0x1a0a1e, emissiveIntensity: 0.25, side: THREE.BackSide });
      const walls = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D), wallMat);
      walls.position.y = ROOM_H / 2;
      this._add(walls);

      // Ceiling beams
      for (let i = -2; i <= 2; i++) {
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(ROOM_W, 0.22, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.9, metalness: 0.05 })
        );
        beam.position.set(0, ROOM_H - 0.2, i * 2.5);
        this._add(beam);
      }

      // Counter — running across the room
      const counterMat = new THREE.MeshStandardMaterial({ color: 0x3a2410, roughness: 0.55, metalness: 0.2, emissive: 0x1a0c06, emissiveIntensity: 0.35 });
      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(10, 0.18, 1.6), counterMat);
      counterTop.position.set(0, 1.1, -2.5);
      this._add(counterTop);
      const counterFront = new THREE.Mesh(new THREE.BoxGeometry(10, 1.1, 0.2), counterMat);
      counterFront.position.set(0, 0.55, -1.85);
      this._add(counterFront);
      // Gold-tarnish trim
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.06, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xb59248, roughness: 0.4, metalness: 0.85, emissive: 0x4a3a18, emissiveIntensity: 0.5 })
      );
      trim.position.set(0, 1.21, -1.7);
      this._add(trim);

      // Shelves behind counter
      for (let s = 0; s < 3; s++) {
        const shelf = new THREE.Mesh(
          new THREE.BoxGeometry(12, 0.12, 0.5),
          counterMat
        );
        shelf.position.set(0, 2.0 + s * 1.3, -5.5);
        this._add(shelf);
        // Jars / relics on shelf — small glass capsules with glowing innards
        for (let j = 0; j < 10; j++) {
          const jar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 0.5, 10),
            new THREE.MeshStandardMaterial({
              color: [0x7ef0ff, 0xc7a6ff, 0xff6b8a, 0x5be0c2, 0xb59248][(j + s) % 5],
              emissive: [0x7ef0ff, 0xc7a6ff, 0xff6b8a, 0x5be0c2, 0xb59248][(j + s) % 5],
              emissiveIntensity: 0.35,
              roughness: 0.25, metalness: 0.3, transparent: true, opacity: 0.75,
            })
          );
          jar.position.set(-5.4 + j * 1.2, 2.4 + s * 1.3, -5.5);
          this._add(jar);
        }
      }

      // Trinket "sample" meshes on the counter
      const sampleConfigs = [
        { color: 0x7ef0ff, shape: 'tooth' },
        { color: 0xb59248, shape: 'coin' },
        { color: 0xffffff, shape: 'die' },
        { color: 0xff6b8a, shape: 'lips' },
        { color: 0xc7a6ff, shape: 'feather' },
      ];
      sampleConfigs.forEach((cfg, i) => {
        let mesh;
        if (cfg.shape === 'coin') {
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 14),
            new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.3, metalness: 0.95, emissive: 0x4a3d18, emissiveIntensity: 0.4 }));
          mesh.rotation.x = Math.PI / 2;
        } else if (cfg.shape === 'die') {
          mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16),
            new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.5, metalness: 0.1, emissive: 0x1a1814, emissiveIntensity: 0.3 }));
        } else if (cfg.shape === 'tooth') {
          mesh = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 6),
            new THREE.MeshStandardMaterial({ color: cfg.color, emissive: cfg.color, emissiveIntensity: 0.4, roughness: 0.4 }));
        } else if (cfg.shape === 'feather') {
          mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.4),
            new THREE.MeshStandardMaterial({ color: cfg.color, emissive: cfg.color, emissiveIntensity: 0.4, roughness: 0.6, side: THREE.DoubleSide }));
          mesh.rotation.z = 0.3;
        } else {
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10),
            new THREE.MeshStandardMaterial({ color: cfg.color, emissive: cfg.color, emissiveIntensity: 0.5, roughness: 0.4 }));
        }
        mesh.position.set(-2 + i * 1.0, 1.28, -2.5);
        this._add(mesh);
      });

      // MERCHANT sprite behind counter
      const merchantMat = new THREE.SpriteMaterial({
        map: makeMerchantTexture(),
        color: 0xe8d4b0,
        transparent: true,
        depthWrite: false,
      });
      const merchant = new THREE.Sprite(merchantMat);
      merchant.scale.set(2.4, 4.6, 1);
      merchant.position.set(0, 2.5, -3.5);

      const merchantGroup = new THREE.Group();
      merchantGroup.add(merchant);
      merchantGroup.userData.sprite = merchant;
      merchantGroup.userData.basePhase = Math.random() * Math.PI * 2;

      // Halo behind
      const haloC = canvas(128, 128);
      const hctx = haloC.getContext('2d');
      const hg = hctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      hg.addColorStop(0, 'rgba(181,146,72,0.55)');
      hg.addColorStop(0.5, 'rgba(181,146,72,0.18)');
      hg.addColorStop(1, 'rgba(181,146,72,0)');
      hctx.fillStyle = hg;
      hctx.fillRect(0, 0, 128, 128);
      const haloTex = new THREE.CanvasTexture(haloC);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: haloTex,
        color: 0xb59248,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      halo.scale.set(5, 6, 1);
      halo.position.set(0, 2.5, -3.6);
      merchantGroup.add(halo);
      merchantGroup.userData.halo = halo;

      // Floor ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1, 1.5, 32),
        new THREE.MeshBasicMaterial({ color: 0xb59248, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.02, -2.5);
      merchantGroup.add(ring);
      merchantGroup.userData.floorRing = ring;

      merchantGroup.userData.kind = 'merchant';
      merchantGroup.userData.name = 'The Merchant';
      merchantGroup.userData.subtitle = 'Anything is for sale · Press E';
      merchantGroup.userData.npcId = 'merchant';
      this.npcs.push(merchantGroup);
      this.interactables.push(merchantGroup);
      this._add(merchantGroup);

      // Warm lamp + hanging candles
      const warmLight = new THREE.PointLight(0xb59248, 1.1, 12, 2);
      warmLight.position.set(0, 4.5, 0);
      this._add(warmLight);

      const ambient = new THREE.AmbientLight(0x3a2414, 0.55);
      this._add(ambient);

      // Portal back to casino — standing near the spawn
      this.buildPortalArch({
        pos: [0, 7.5],
        rot: 0,
        targetRoom: 'casino',
        label: 'THE CASINO FLOOR',
        sub: 'Back to the felt.',
        color: 0x7ef0ff,
        emissive: 0x08202a,
        labelColor: 'rgba(232,250,255,0.95)',
        subColor: 'rgba(126,240,255,0.85)',
      });

      // Hidden portal to the Confessional — tucked in the back-left corner
      this.buildPortalArch({
        pos: [-7, -6],
        rot: Math.PI / 6,
        targetRoom: 'confessional',
        label: 'THE CONFESSIONAL',
        sub: 'It costs to speak.',
        color: 0xffb070,
        emissive: 0x402010,
        labelColor: 'rgba(255,230,180,0.95)',
        subColor: 'rgba(255,180,120,0.85)',
      });

      // Floating memo slips
      for (let i = 0; i < 14; i++) {
        const slip = new THREE.Mesh(
          new THREE.PlaneGeometry(0.25, 0.18),
          new THREE.MeshStandardMaterial({ color: 0xe8d4b0, emissive: 0x2a2414, emissiveIntensity: 0.4, side: THREE.DoubleSide, roughness: 0.9, transparent: true, opacity: 0.78 })
        );
        slip.position.set(-ROOM_W/2 + Math.random() * ROOM_W, 1.5 + Math.random() * 4, -ROOM_D/2 + Math.random() * ROOM_D);
        slip.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
        this._add(slip);
      }

      // Drifting dust motes
      const dustGeo = new THREE.BufferGeometry();
      const dustN = 140;
      const dpos = new Float32Array(dustN * 3);
      for (let i = 0; i < dustN; i++) {
        dpos[i*3]   = (Math.random() - 0.5) * ROOM_W;
        dpos[i*3+1] = Math.random() * ROOM_H;
        dpos[i*3+2] = (Math.random() - 0.5) * ROOM_D;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
      const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
        color: 0xe8d4b0,
        size: 0.04,
        transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      this._add(dust);
      this.pawnDust = dust;
    }

    /* ==================================================
       DRESSING ROOM
       ================================================== */
    /* ==================================================
       CONFESSIONAL ROOM — tiny chapel, lattice, Confessor
       ================================================== */
    buildConfessionalRoom() {
      const ROOM_W = 10, ROOM_D = 10, ROOM_H = 5.5;

      // Floor — worn flagstone
      const fc = canvas(512, 512);
      const fctx = fc.getContext('2d');
      const fg = fctx.createRadialGradient(256, 256, 40, 256, 256, 280);
      fg.addColorStop(0, '#1a1208');
      fg.addColorStop(0.6, '#0e0804');
      fg.addColorStop(1, '#060402');
      fctx.fillStyle = fg;
      fctx.fillRect(0, 0, 512, 512);
      // Flagstone grid
      fctx.strokeStyle = 'rgba(40,28,16,0.65)';
      fctx.lineWidth = 2;
      for (let y = 0; y < 512; y += 128) {
        for (let x = 0; x < 512; x += 128) {
          fctx.strokeRect(x + 4, y + 4, 120, 120);
        }
      }
      const floorTex = new THREE.CanvasTexture(fc);
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_W, ROOM_D),
        new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, metalness: 0.05, emissive: 0x0a0604, emissiveIntensity: 0.3 })
      );
      floor.rotation.x = -Math.PI / 2;
      this._add(floor);

      // Walls — dark plaster
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x14100a, emissive: 0x0a0604, emissiveIntensity: 0.35,
        roughness: 0.95, metalness: 0.05, side: THREE.BackSide,
      });
      const walls = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D), wallMat);
      walls.position.y = ROOM_H / 2;
      this._add(walls);

      // Wooden beams overhead
      for (let i = -1; i <= 1; i++) {
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(ROOM_W, 0.22, 0.28),
          new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.95, metalness: 0.05 })
        );
        beam.position.set(0, ROOM_H - 0.2, i * 2);
        this._add(beam);
      }

      // Kneeler on player's side — wooden bench with velvet pad
      const kneelerBase = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.4, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x3a1a0a, roughness: 0.88, metalness: 0.1, emissive: 0x1a0a04, emissiveIntensity: 0.3 })
      );
      kneelerBase.position.set(0, 0.2, 1.8);
      this._add(kneelerBase);
      const velvetPad = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.15, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x5a1830, roughness: 0.65, metalness: 0.1, emissive: 0x2a0818, emissiveIntensity: 0.4 })
      );
      velvetPad.position.set(0, 0.47, 1.8);
      this._add(velvetPad);

      // Lattice wall — wrought iron grid separating player from Confessor
      const latticeMat = new THREE.MeshStandardMaterial({
        color: 0x1a0e08, metalness: 0.85, roughness: 0.4,
        emissive: 0x2a1a0c, emissiveIntensity: 0.3,
      });
      // Vertical + horizontal bars as a cross lattice
      for (let i = -3; i <= 3; i++) {
        const vbar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.6, 0.06), latticeMat);
        vbar.position.set(i * 0.4, 2.1, -0.1);
        this._add(vbar);
      }
      for (let j = 0; j < 10; j++) {
        const hbar = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 0.06), latticeMat);
        hbar.position.set(0, 0.5 + j * 0.36, -0.1);
        this._add(hbar);
      }
      // Lattice arch frame
      const archFrame = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.18, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xb59248, metalness: 0.9, roughness: 0.3, emissive: 0x4a3a18, emissiveIntensity: 0.55 })
      );
      archFrame.position.set(0, 3.9, -0.1);
      this._add(archFrame);

      // CONFESSOR sprite behind lattice
      const confessorTex = makeConfessorTexture();
      const confessor = new THREE.Sprite(new THREE.SpriteMaterial({
        map: confessorTex, color: 0xe8d4a4,
        transparent: true, depthWrite: false,
      }));
      confessor.scale.set(2.4, 4.8, 1);
      confessor.position.set(0, 2.6, -2.2);

      const confessorGroup = new THREE.Group();
      confessorGroup.add(confessor);
      confessorGroup.userData.sprite = confessor;
      confessorGroup.userData.basePhase = Math.random() * Math.PI * 2;

      // Oil-lamp halo behind her
      const haloC = canvas(128, 128);
      const hctx = haloC.getContext('2d');
      const hg = hctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      hg.addColorStop(0, 'rgba(255,200,130,0.65)');
      hg.addColorStop(0.4, 'rgba(255,160,80,0.25)');
      hg.addColorStop(1, 'rgba(180,80,20,0)');
      hctx.fillStyle = hg;
      hctx.fillRect(0, 0, 128, 128);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(haloC), color: 0xffb070,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      halo.scale.set(4.6, 5.2, 1);
      halo.position.set(0, 2.6, -2.3);
      confessorGroup.add(halo);

      // Floor ring (player side)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.3, 32),
        new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.02, 1.0);
      confessorGroup.add(ring);
      confessorGroup.userData.floorRing = ring;

      confessorGroup.userData.kind = 'confessor';
      confessorGroup.userData.name = 'The Confessor';
      confessorGroup.userData.subtitle = 'Speak · and be forgiven in exchange for breath';
      confessorGroup.userData.npcId = 'confessor';
      this.npcs.push(confessorGroup);
      this.interactables.push(confessorGroup);
      this._add(confessorGroup);

      // Single candle on player's side
      const candleBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 0.3, 10),
        new THREE.MeshStandardMaterial({ color: 0xe8e2cc, roughness: 0.85 })
      );
      candleBody.position.set(-1.8, 0.65, 1.5);
      this._add(candleBody);
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.9 })
      );
      flame.position.set(-1.8, 0.88, 1.5);
      this._add(flame);
      const flameLight = new THREE.PointLight(0xffb070, 1.0, 5, 2);
      flameLight.position.set(-1.8, 1.0, 1.5);
      this._add(flameLight);

      // Incense smoke particles drifting up
      this.incenseSmoke = [];
      for (let i = 0; i < 12; i++) {
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 8),
          new THREE.MeshBasicMaterial({
            color: 0xe8d4a4,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        s.position.set(-1.8 + (Math.random() - 0.5) * 0.3, 1.1 + Math.random() * 2.5, 1.5 + (Math.random() - 0.5) * 0.3);
        s.userData = { baseY: 1.1, phase: Math.random() * Math.PI * 2, speed: 0.15 + Math.random() * 0.2 };
        this._add(s);
        this.incenseSmoke.push(s);
      }

      // Dim amber ambient
      const ambient = new THREE.AmbientLight(0x3a1c0a, 0.5);
      this._add(ambient);

      // Portal back to the pawn shop
      this.buildPortalArch({
        pos: [0, 4.3],
        rot: 0,
        targetRoom: 'pawnshop',
        label: 'THE PAWN SHOP',
        sub: 'Back to the counter.',
        color: 0xb59248,
        emissive: 0x3a2a10,
        labelColor: 'rgba(232,212,160,0.95)',
        subColor: 'rgba(181,146,72,0.85)',
      });
    }

    buildDressingRoom() {
      const ROOM_W = 16, ROOM_D = 13, ROOM_H = 6.5;

      // Floor — rose marble
      const floorC = canvas(512, 512);
      const fctx = floorC.getContext('2d');
      const fg = fctx.createRadialGradient(256, 256, 40, 256, 256, 300);
      fg.addColorStop(0, '#3a1a28');
      fg.addColorStop(0.7, '#2a1018');
      fg.addColorStop(1, '#140610');
      fctx.fillStyle = fg;
      fctx.fillRect(0, 0, 512, 512);
      // Marble veins — cream pink
      fctx.strokeStyle = 'rgba(255,200,210,0.18)';
      fctx.lineWidth = 1;
      for (let i = 0; i < 35; i++) {
        fctx.beginPath();
        const x0 = Math.random() * 512, y0 = Math.random() * 512;
        fctx.moveTo(x0, y0);
        for (let k = 0; k < 6; k++) {
          fctx.lineTo(x0 + (Math.random() - 0.5) * 300, y0 + (Math.random() - 0.5) * 300);
        }
        fctx.stroke();
      }
      const floorTex = new THREE.CanvasTexture(floorC);
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_W, ROOM_D),
        new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.15, emissive: 0x2a0e1a, emissiveIntensity: 0.3 })
      );
      floor.rotation.x = -Math.PI / 2;
      this._add(floor);

      // Walls — deep wine
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x2a0818, emissive: 0x1a0612, emissiveIntensity: 0.4,
        roughness: 0.8, metalness: 0.15, side: THREE.BackSide,
      });
      const walls = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D), wallMat);
      walls.position.y = ROOM_H / 2;
      this._add(walls);

      // Gold-trim crown moulding
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_W, 0.15, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xb59248, metalness: 0.85, roughness: 0.35, emissive: 0x4a3a18, emissiveIntensity: 0.5 })
      );
      for (let w = 0; w < 4; w++) {
        const c = crown.clone();
        if (w === 0) c.position.set(0, ROOM_H - 0.2, -ROOM_D/2 + 0.1);
        else if (w === 1) c.position.set(0, ROOM_H - 0.2,  ROOM_D/2 - 0.1);
        else if (w === 2) { c.position.set(-ROOM_W/2 + 0.1, ROOM_H - 0.2, 0); c.rotation.y = Math.PI/2; c.scale.x = ROOM_D/ROOM_W; }
        else               { c.position.set( ROOM_W/2 - 0.1, ROOM_H - 0.2, 0); c.rotation.y = Math.PI/2; c.scale.x = ROOM_D/ROOM_W; }
        this._add(c);
      }

      // THREE CURTAINS with silhouettes
      const curtainPositions = [
        { x: -5.2, z: -4.5, pose: 'recline' },
        { x:  0,   z: -5.5, pose: 'seated' },
        { x:  5.2, z: -4.5, pose: 'turned' },
      ];
      this.curtainFigures = [];
      curtainPositions.forEach((cfg, i) => {
        const silhouetteTex = makeCurtainFigureTexture(cfg.pose);
        const silhouetteMat = new THREE.SpriteMaterial({
          map: silhouetteTex, color: 0x8a5868,
          transparent: true, opacity: 0.55, depthWrite: false,
        });
        const silhouette = new THREE.Sprite(silhouetteMat);
        silhouette.scale.set(2.2, 4.2, 1);
        silhouette.position.set(cfg.x, 2.1, cfg.z + 0.6);
        silhouette.userData = { basePhase: Math.random() * Math.PI * 2 };
        this._add(silhouette);
        this.curtainFigures.push(silhouette);

        // Curtain — translucent rippling plane
        const curtainMat = new THREE.MeshStandardMaterial({
          color: 0x2a081a,
          emissive: 0xff6b8a,
          emissiveIntensity: 0.08,
          transparent: true,
          opacity: 0.7,
          roughness: 0.85,
          side: THREE.DoubleSide,
        });
        const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.6, 10, 1), curtainMat);
        curtain.position.set(cfg.x, 2.3, cfg.z);
        curtain.userData = { basePhase: Math.random() * Math.PI * 2, baseX: cfg.x, baseZ: cfg.z };
        this._add(curtain);
        if (!this.curtains) this.curtains = [];
        this.curtains.push(curtain);

        // Rod
        const rod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 2.6, 10),
          new THREE.MeshStandardMaterial({ color: 0xb59248, metalness: 0.85, roughness: 0.35, emissive: 0x4a3a18, emissiveIntensity: 0.4 })
        );
        rod.position.set(cfg.x, 4.65, cfg.z);
        rod.rotation.z = Math.PI / 2;
        this._add(rod);
      });

      // CHARM-KEEPER — steps forward between the first and second curtain
      const keeperTex = makeCharmKeeperTexture();
      const keeper = new THREE.Sprite(new THREE.SpriteMaterial({
        map: keeperTex, color: 0xffccd6,
        transparent: true, depthWrite: false,
      }));
      keeper.scale.set(2.4, 4.8, 1);
      keeper.position.set(-2.6, 2.6, -2.0);

      const keeperGroup = new THREE.Group();
      keeperGroup.add(keeper);
      keeperGroup.userData.sprite = keeper;
      keeperGroup.userData.basePhase = Math.random() * Math.PI * 2;

      // Halo
      const haloC = canvas(128, 128);
      const hctx = haloC.getContext('2d');
      const hg = hctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      hg.addColorStop(0, 'rgba(255,107,138,0.55)');
      hg.addColorStop(0.5, 'rgba(255,107,138,0.18)');
      hg.addColorStop(1, 'rgba(255,107,138,0)');
      hctx.fillStyle = hg;
      hctx.fillRect(0, 0, 128, 128);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(haloC),
        color: 0xff6b8a,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      halo.scale.set(5.6, 6.4, 1);
      halo.position.set(-2.6, 2.6, -2.1);
      keeperGroup.add(halo);
      keeperGroup.userData.halo = halo;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1, 1.5, 32),
        new THREE.MeshBasicMaterial({ color: 0xff6b8a, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(-2.6, 0.02, -2.0);
      keeperGroup.add(ring);
      keeperGroup.userData.floorRing = ring;

      keeperGroup.userData.kind = 'charmkeeper';
      keeperGroup.userData.name = 'The Charm-keeper';
      keeperGroup.userData.subtitle = 'Would you like a kiss, or a curse?';
      keeperGroup.userData.npcId = 'charmkeeper';

      // Hide the 2D sprite and add a 3D mermaid (rose + pink palette)
      keeperGroup.userData.sprite.visible = false;
      const charmMesh = buildMermaid({
        tier: 'soft',
        skinHex: '#f8dad0', skinTint: 0xf8dad0,
        tailHex: '#a03054', tailTint: 0xa03054, scaleHex: '#ff99b5',
        hairColor: 0xff6b8a, eyeColor: 0xff99b5,
      });
      charmMesh.scale.setScalar(1.4);
      charmMesh.position.set(-2.6, 0.3, -2.0);
      // Face toward spawn area of dressing room (where player enters)
      charmMesh.rotation.y = Math.atan2(2.6, 7.5); // rough direction toward (0, ~4) from (-2.6, -2)
      keeperGroup.add(charmMesh);
      keeperGroup.userData.mesh3d = charmMesh;

      this.npcs.push(keeperGroup);
      this.interactables.push(keeperGroup);
      this._add(keeperGroup);

      // Vanity / mirror on one side
      const mirrorFrame = new THREE.Mesh(
        new THREE.TorusGeometry(1.0, 0.12, 16, 48),
        new THREE.MeshStandardMaterial({ color: 0xb59248, metalness: 0.9, roughness: 0.3, emissive: 0x4a3a18, emissiveIntensity: 0.55 })
      );
      mirrorFrame.position.set(5.5, 3.5, -6.3);
      mirrorFrame.rotation.y = -Math.PI / 12;
      this._add(mirrorFrame);
      const mirrorGlass = new THREE.Mesh(
        new THREE.CircleGeometry(0.94, 36),
        new THREE.MeshStandardMaterial({ color: 0x2a1820, emissive: 0x3a2030, emissiveIntensity: 0.65, metalness: 0.8, roughness: 0.25 })
      );
      mirrorGlass.position.set(5.4, 3.5, -6.28);
      mirrorGlass.rotation.y = -Math.PI / 12;
      this._add(mirrorGlass);

      // Vanity table
      const vanity = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.12, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x401820, roughness: 0.75, metalness: 0.2, emissive: 0x1a0610, emissiveIntensity: 0.3 })
      );
      vanity.position.set(5.5, 1.1, -5.8);
      vanity.rotation.y = -Math.PI / 12;
      this._add(vanity);
      // Perfume bottles on vanity
      for (let i = 0; i < 4; i++) {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.28, 8),
          new THREE.MeshStandardMaterial({ color: [0xff6b8a, 0xc7a6ff, 0x7ef0ff, 0xb59248][i], emissive: [0xff6b8a, 0xc7a6ff, 0x7ef0ff, 0xb59248][i], emissiveIntensity: 0.4, roughness: 0.25, metalness: 0.3, transparent: true, opacity: 0.75 })
        );
        bottle.position.set(4.8 + i * 0.32, 1.3, -5.7);
        bottle.rotation.y = -Math.PI / 12;
        this._add(bottle);
      }

      // Chaise longue on the other side
      const chaise = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.55, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x5a1830, roughness: 0.75, metalness: 0.15, emissive: 0x2a0818, emissiveIntensity: 0.3 })
      );
      chaise.position.set(-5.8, 0.55, -1.5);
      chaise.rotation.y = Math.PI / 14;
      this._add(chaise);
      const chaiseBack = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.9, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x5a1830, roughness: 0.75, metalness: 0.15, emissive: 0x2a0818, emissiveIntensity: 0.3 })
      );
      chaiseBack.position.set(-5.8, 1.15, -2.0);
      chaiseBack.rotation.y = Math.PI / 14;
      this._add(chaiseBack);

      // Rose petals scattered on the floor
      for (let i = 0; i < 28; i++) {
        const petal = new THREE.Mesh(
          new THREE.CircleGeometry(0.08, 6),
          new THREE.MeshStandardMaterial({
            color: [0xff6b8a, 0xc4455d, 0x8b1e2c][i % 3],
            emissive: [0xff6b8a, 0xc4455d, 0x8b1e2c][i % 3],
            emissiveIntensity: 0.3,
            roughness: 0.85,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          })
        );
        petal.position.set((Math.random() - 0.5) * ROOM_W * 0.7, 0.02, (Math.random() - 0.5) * ROOM_D * 0.7);
        petal.rotation.x = -Math.PI / 2;
        petal.rotation.z = Math.random() * Math.PI;
        this._add(petal);
      }

      // Warm dusk-pink lighting
      const fill = new THREE.AmbientLight(0x552030, 0.55);
      this._add(fill);
      const rose = new THREE.PointLight(0xff6b8a, 1.1, 14, 2);
      rose.position.set(0, 4.2, 0);
      this._add(rose);
      const violet = new THREE.PointLight(0xc7a6ff, 0.6, 10, 2);
      violet.position.set(5, 2.5, -6);
      this._add(violet);

      // Portal back
      this.buildPortalArch({
        pos: [0, 6.5],
        rot: 0,
        targetRoom: 'casino',
        label: 'THE CASINO FLOOR',
        sub: 'Back to the felt.',
        color: 0x7ef0ff,
        emissive: 0x08202a,
        labelColor: 'rgba(232,250,255,0.95)',
        subColor: 'rgba(126,240,255,0.85)',
      });

      // Drifting rose petals in the air
      this.roseConfetti = [];
      for (let i = 0; i < 18; i++) {
        const p = new THREE.Mesh(
          new THREE.CircleGeometry(0.05 + Math.random() * 0.04, 6),
          new THREE.MeshStandardMaterial({
            color: 0xff6b8a, emissive: 0xff6b8a, emissiveIntensity: 0.45,
            side: THREE.DoubleSide, transparent: true, opacity: 0.85, roughness: 0.8,
          })
        );
        p.position.set((Math.random() - 0.5) * ROOM_W * 0.85, 1 + Math.random() * ROOM_H, (Math.random() - 0.5) * ROOM_D * 0.7);
        p.userData = { basePhase: Math.random() * Math.PI * 2, speed: 0.15 + Math.random() * 0.25, baseX: p.position.x, baseZ: p.position.z };
        this._add(p);
        this.roseConfetti.push(p);
      }
    }

    /* ==================================================
       VEGAS — neon, carpets, chandelier, marquee signage.
       Dressing the casino into an underwater Strip.
       ================================================== */

    /* Vegas dressing — velvet ropes, brass stanchions, corner jewelry */
    /* ==================================================
       CENTRAL STAGE — elevated dais + pole + showgirl mermaid
       Replaces the old coin pool.
       ================================================== */
    buildCentralStage() {
      const group = new THREE.Group();

      // Dais — stepped circular platform
      const daisMat = new THREE.MeshStandardMaterial({
        color: 0x3a0818, metalness: 0.3, roughness: 0.5,
        emissive: 0x2a0818, emissiveIntensity: 0.45,
      });
      const dais = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.6, 0.5, 48),
        daisMat
      );
      dais.position.y = 0.25;
      group.add(dais);

      // Upper step
      const upperStep = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 3.0, 0.2, 48),
        new THREE.MeshStandardMaterial({
          color: 0x5a1830, metalness: 0.4, roughness: 0.4,
          emissive: 0x3a0818, emissiveIntensity: 0.55,
        })
      );
      upperStep.position.y = 0.6;
      group.add(upperStep);

      // Gold-trim rim on the stage edge
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.08, 16, 64),
        new THREE.MeshStandardMaterial({
          color: 0xb59248, metalness: 0.95, roughness: 0.25,
          emissive: 0x4a3a18, emissiveIntensity: 0.6,
        })
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.51;
      group.add(rim);

      // Chaser marquee-bulb strip around the dais edge
      this.stageBulbs = [];
      const bulbCount = 36;
      for (let i = 0; i < bulbCount; i++) {
        const a = (i / bulbCount) * Math.PI * 2;
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 10, 8),
          new THREE.MeshBasicMaterial({
            color: i % 3 === 0 ? 0xffe4a8 : i % 3 === 1 ? 0xff6b8a : 0xffffff,
            transparent: true, opacity: 0.95,
          })
        );
        bulb.position.set(Math.cos(a) * 3.25, 0.54, Math.sin(a) * 3.25);
        bulb.userData = { basePhase: i * 0.35 };
        group.add(bulb);
        this.stageBulbs.push(bulb);
      }

      // Brass pole — stage to dome ceiling
      const poleMat = new THREE.MeshStandardMaterial({
        color: 0xe8d4a4, metalness: 0.98, roughness: 0.15,
        emissive: 0x4a3a18, emissiveIntensity: 0.35,
      });
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, WALL_HEIGHT - 1.5, 16),
        poleMat
      );
      pole.position.y = 0.8 + (WALL_HEIGHT - 1.5) / 2;
      group.add(pole);

      // Showgirl mermaid on the pole
      const dancer = buildMermaid({
        tier: 'chain',
        skinHex: '#f5dac0', skinTint: 0xf5dac0,
        tailHex: '#c7a6ff', tailTint: 0xc7a6ff, scaleHex: '#ff6b8a',
        hairColor: 0xff6b8a, eyeColor: 0x7ef0ff,
      });
      dancer.scale.setScalar(1.5);
      dancer.position.y = 2.8;
      group.add(dancer);
      group.userData.dancer = dancer;

      // Three swiveling stage spotlights, mounted on tall stands around the stage
      const spotColors = [0xff6b8a, 0x7ef0ff, 0xffe4a8];
      this.stageSpots = [];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
        const standX = Math.cos(a) * 4.5;
        const standZ = Math.sin(a) * 4.5;
        // Stand pole
        const stand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, 4, 8), poleMat
        );
        stand.position.set(standX, 2, standZ);
        group.add(stand);
        // Spotlight head
        const headMat = new THREE.MeshStandardMaterial({
          color: 0x2a2620, metalness: 0.85, roughness: 0.3,
          emissive: new THREE.Color(spotColors[i]).multiplyScalar(0.5),
          emissiveIntensity: 0.5,
        });
        const head = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.3, 0.4, 12), headMat
        );
        head.position.set(standX, 4.1, standZ);
        head.lookAt(0, 3, 0);
        head.rotateX(Math.PI / 2);
        group.add(head);

        // Light beam — cone with additive blend
        const beamMat = new THREE.MeshBasicMaterial({
          color: spotColors[i], transparent: true, opacity: 0.18,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        });
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, 4, 14, 1, true), beamMat
        );
        beam.position.set(standX, 2.1, standZ);
        beam.userData = { spotPhase: i * 2, color: spotColors[i] };
        group.add(beam);
        this.stageSpots.push(beam);

        // Actual SpotLight for real illumination
        const spotLight = new THREE.SpotLight(spotColors[i], 2.5, 12, Math.PI / 5, 0.3, 1.2);
        spotLight.position.set(standX, 4, standZ);
        spotLight.target.position.set(0, 2.5, 0);
        group.add(spotLight);
        group.add(spotLight.target);
      }

      // Ring of prayer candles on the lower dais (stage ambience)
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const candle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, 0.28, 10),
          new THREE.MeshStandardMaterial({ color: 0xe8e2cc, roughness: 0.85 })
        );
        candle.position.set(Math.cos(a) * 3.4, 0.66, Math.sin(a) * 3.4);
        group.add(candle);
      }

      // Pool of gold coins pouring from the stage edge (original coin-pool vibe, now decorative)
      const coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.015, 10);
      const coinMat = new THREE.MeshStandardMaterial({ color: 0xb59248, roughness: 0.35, metalness: 0.9, emissive: 0x1a1206, emissiveIntensity: 0.15 });
      const coinCount = 80;
      const coins = new THREE.InstancedMesh(coinGeo, coinMat, coinCount);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < coinCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 3.3 + Math.random() * 1.2;
        dummy.position.set(Math.cos(a) * r, 0.02 + Math.random() * 0.04, Math.sin(a) * r);
        dummy.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
        const s = 0.85 + Math.random() * 0.5;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        coins.setMatrixAt(i, dummy.matrix);
      }
      group.add(coins);

      group.position.set(0, 0, 0);
      this.scene.add(group);
      this.centralStage = group;
      // Keep the old reference used elsewhere
      this.pool = group;
    }

    /* Slot machine bank — 14 cabinets in a curve along one wall */
    buildSlotMachineBank() {
      const cabinets = [];
      const count = 14;
      // Arc from angle A to B along the outer chamber wall
      const a0 = Math.PI * 0.18;
      const a1 = Math.PI * 0.72;
      const r = CHAMBER_RADIUS - 2.5;

      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const angle = a0 + t * (a1 - a0);
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const cab = this.buildSlotCabinet(i);
        cab.position.set(x, 0, z);
        // Face toward chamber center
        cab.rotation.y = Math.atan2(-x, -z);
        this.scene.add(cab);
        cabinets.push(cab);
      }

      // "PROGRESSIVE JACKPOT" neon above the bank centerpoint
      const midAngle = (a0 + a1) / 2;
      const signX = Math.cos(midAngle) * (r - 0.5);
      const signZ = Math.sin(midAngle) * (r - 0.5);
      const signC = canvas(1024, 256);
      const sctx = signC.getContext('2d');
      sctx.clearRect(0, 0, 1024, 256);
      sctx.font = 'bold 80px "Cinzel", serif';
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      sctx.shadowColor = '#ff6b8a';
      sctx.shadowBlur = 40;
      sctx.fillStyle = '#ff6b8a';
      sctx.fillText('PROGRESSIVE JACKPOT', 512, 100);
      sctx.shadowColor = '#7ef0ff';
      sctx.shadowBlur = 30;
      sctx.font = 'bold 100px "Cinzel", serif';
      sctx.fillStyle = '#e0fcff';
      sctx.fillText('9,999 BREATH', 512, 200);
      const signTex = new THREE.CanvasTexture(signC);
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({
        map: signTex, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      sign.scale.set(10, 2.5, 1);
      sign.position.set(signX, 9, signZ);
      this.scene.add(sign);
      this.slotJackpotSign = sign;

      this.slotCabinets = cabinets;
    }

    /* Build ONE slot cabinet mesh */
    buildSlotCabinet(idx) {
      const group = new THREE.Group();
      const cabMat = new THREE.MeshStandardMaterial({
        color: 0x2a0818, metalness: 0.4, roughness: 0.45,
        emissive: 0x1a0610, emissiveIntensity: 0.35,
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: 0xb59248, metalness: 0.95, roughness: 0.3,
        emissive: 0x4a3a18, emissiveIntensity: 0.6,
      });
      // Lower base
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.0), cabMat);
      base.position.y = 0.4;
      group.add(base);
      // Upper cabinet
      const upper = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.7), cabMat);
      upper.position.set(0, 1.9, -0.15);
      group.add(upper);
      // Reels screen — glowing panel on front
      const reelPalette = [0x7ef0ff, 0xc7a6ff, 0xff6b8a, 0xffe4a8][idx % 4];
      const screenMat = new THREE.MeshBasicMaterial({
        color: reelPalette, transparent: true, opacity: 0.85,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.2), screenMat);
      screen.position.set(0, 1.9, 0.21);
      group.add(screen);
      // Reel glyphs — 3 symbols painted on a canvas overlay
      const glyphC = canvas(256, 128);
      const gctx = glyphC.getContext('2d');
      gctx.fillStyle = '#0a0408';
      gctx.fillRect(0, 0, 256, 128);
      const glyphs = ['𓂀', '☽', '✦', 'Ψ', '◉', '⚀', '∞', '☠'];
      for (let j = 0; j < 3; j++) {
        gctx.font = 'bold 64px serif';
        gctx.textAlign = 'center';
        gctx.textBaseline = 'middle';
        gctx.fillStyle = ['#7ef0ff', '#ff6b8a', '#b59248'][j];
        gctx.shadowColor = gctx.fillStyle;
        gctx.shadowBlur = 18;
        gctx.fillText(glyphs[(idx + j) % glyphs.length], 42 + j * 86, 64);
      }
      const glyphTex = new THREE.CanvasTexture(glyphC);
      const glyphPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.45),
        new THREE.MeshBasicMaterial({ map: glyphTex, transparent: true, blending: THREE.AdditiveBlending })
      );
      glyphPlane.position.set(0, 1.9, 0.215);
      group.add(glyphPlane);

      // Marquee above with game name
      const marqC = canvas(512, 128);
      const mctx = marqC.getContext('2d');
      mctx.clearRect(0, 0, 512, 128);
      mctx.font = 'bold 54px "Cinzel", serif';
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';
      mctx.fillStyle = ['#7ef0ff', '#ff6b8a', '#ffe4a8', '#c7a6ff'][idx % 4];
      mctx.shadowColor = mctx.fillStyle;
      mctx.shadowBlur = 24;
      const cabNames = ['KRAKEN', 'SIREN', 'ABYSS', 'ORACLE', 'PEARL', 'DROWNED', 'TIDE', 'FATHOM'];
      mctx.fillText(cabNames[idx % cabNames.length], 256, 64);
      const marqTex = new THREE.CanvasTexture(marqC);
      const marqSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: marqTex, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      marqSprite.scale.set(1.4, 0.4, 1);
      marqSprite.position.set(0, 3.15, 0.3);
      group.add(marqSprite);
      group.userData.marqSprite = marqSprite;

      // Gold trim along the cabinet edges
      [[0, 3.05, 0.2, 1.3, 0.08, 0.08], [0, 0.82, 0.5, 1.3, 0.06, 0.08]].forEach(p => {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(p[3], p[4], p[5]), trimMat);
        trim.position.set(p[0], p[1], p[2]);
        group.add(trim);
      });

      // Lever on the right
      const leverArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), trimMat
      );
      leverArm.position.set(0.7, 1.7, 0.05);
      leverArm.rotation.z = 0.35;
      group.add(leverArm);
      const leverBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xff4040, metalness: 0.3, roughness: 0.35, emissive: 0xff4040, emissiveIntensity: 0.5 })
      );
      leverBall.position.set(0.88, 1.95, 0.05);
      group.add(leverBall);

      // Coin tray at the bottom
      const tray = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.14, 0.3),
        trimMat
      );
      tray.position.set(0, 0.9, 0.5);
      group.add(tray);

      // Stool in front
      const stool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12),
        new THREE.MeshStandardMaterial({ color: 0x5a1830, metalness: 0.2, roughness: 0.6 })
      );
      stool.position.set(0, 0.45, 1.05);
      group.add(stool);
      const stoolLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a1810, metalness: 0.5, roughness: 0.4 })
      );
      stoolLeg.position.set(0, 0.22, 1.05);
      group.add(stoolLeg);

      // Every 4th cabinet — seat a ghost player
      if (idx % 4 === 2) {
        const ghost = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGhostPlayerTexture(['hunched','stacking','despair'][idx % 3]),
          transparent: true, opacity: 0.45,
          depthWrite: false,
        }));
        ghost.scale.set(1.4, 2.0, 1);
        ghost.position.set(0, 1.4, 1.05);
        group.add(ghost);
      }

      group.userData.screenMat = screenMat;
      group.userData.idx = idx;
      return group;
    }

    /* Mirror ball — chrome sphere over the stage */
    buildMirrorBall() {
      const group = new THREE.Group();
      // Chain
      const chainMat = new THREE.MeshStandardMaterial({
        color: 0x8a6e30, metalness: 0.8, roughness: 0.3,
      });
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 6), chainMat);
      chain.position.y = (WALL_HEIGHT - 2);
      group.add(chain);

      // Ball — reflective metal with subtle iridescence
      const ballMat = new THREE.MeshStandardMaterial({
        color: 0xf0f4f8, metalness: 0.95, roughness: 0.15,
        emissive: 0x8899aa, emissiveIntensity: 0.2,
      });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 24), ballMat);
      ball.position.y = WALL_HEIGHT - 4.2;
      group.add(ball);

      // Mirror ball "facets" — many small emissive dots
      const facetGeo = new THREE.SphereGeometry(0.05, 6, 4);
      const facetMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      const facetCount = 80;
      const facets = new THREE.InstancedMesh(facetGeo, facetMat, facetCount);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < facetCount; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / facetCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const x = Math.sin(phi) * Math.cos(theta) * 0.85;
        const y = Math.cos(phi) * 0.85;
        const z = Math.sin(phi) * Math.sin(theta) * 0.85;
        dummy.position.set(x, y + (WALL_HEIGHT - 4.2), z);
        dummy.updateMatrix();
        facets.setMatrixAt(i, dummy.matrix);
      }
      group.add(facets);

      // Ball-level small point light
      const ballLight = new THREE.PointLight(0xffffff, 0.55, 18, 2);
      ballLight.position.y = WALL_HEIGHT - 4.2;
      group.add(ballLight);

      group.userData.ball = ball;
      group.userData.facets = facets;
      this.scene.add(group);
      this.mirrorBall = group;
    }

    /* Sweeping spotlights mounted on the dome rim */
    buildSweepingSpotlights() {
      this.sweepSpots = [];
      const colors = [0xff6b8a, 0x7ef0ff, 0xffe4a8, 0xc7a6ff];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const housing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.3, 0.42, 12),
          new THREE.MeshStandardMaterial({
            color: 0x2a2620, metalness: 0.85, roughness: 0.3,
            emissive: new THREE.Color(colors[i]).multiplyScalar(0.4),
            emissiveIntensity: 0.5,
          })
        );
        housing.position.set(Math.cos(a) * (CHAMBER_RADIUS - 1.5), WALL_HEIGHT - 2, Math.sin(a) * (CHAMBER_RADIUS - 1.5));
        housing.lookAt(0, 3, 0);
        this.scene.add(housing);

        // Beam cone
        const beamMat = new THREE.MeshBasicMaterial({
          color: colors[i], transparent: true, opacity: 0.16,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        });
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(3.5, 18, 16, 1, true), beamMat
        );
        beam.position.copy(housing.position);
        beam.userData = {
          basePhase: i * Math.PI / 2,
          color: colors[i],
          anchor: housing.position.clone(),
        };
        this.scene.add(beam);
        this.sweepSpots.push(beam);
      }
    }

    /* LED ticker tape — scrolling text wrapping the upper wall */
    buildTickerTape() {
      const tickers = [
        { y: WALL_HEIGHT - 3.5, speed:  0.03, color: '#ffb070', text: '★ WINNERS ★ THE GAMBLER +2,300 BREATH ★ THE STRANGER SANK ★ ROOM 317 · CHECKED IN ★ SIREN TABLE PAYOUT 8x ★ ' },
        { y: WALL_HEIGHT - 5.2, speed: -0.022, color: '#7ef0ff', text: '★ ABYSS ★ IN THE SEA MONSTER WE TRUST ★ SEVEN TABLES · ONE DOOR ★ YOU ARE NEVER ALONE AT THE TABLE ★ ' },
      ];
      this.tickers = [];
      tickers.forEach((t, i) => {
        const c = canvas(2048, 64);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 2048, 64);
        ctx.font = 'bold 40px "JetBrains Mono", monospace';
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 12;
        ctx.textBaseline = 'middle';
        // Draw text twice to ensure wrap seamlessness
        ctx.fillText(t.text + t.text, 16, 32);
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.repeat.set(4, 1);

        // Cylinder ring inside the chamber
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(CHAMBER_RADIUS - 0.2, CHAMBER_RADIUS - 0.2, 0.7, 64, 1, true),
          new THREE.MeshBasicMaterial({
            map: tex, transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
          })
        );
        ring.position.y = t.y;
        this.scene.add(ring);
        this.tickers.push({ ring, tex, speed: t.speed });
      });
    }

    /* Floor fog carpet — slow drifting low-altitude sprites */
    buildFloorFog() {
      const fogC = canvas(128, 128);
      const fctx = fogC.getContext('2d');
      const g = fctx.createRadialGradient(64, 64, 10, 64, 64, 58);
      g.addColorStop(0, 'rgba(200,200,220,0.35)');
      g.addColorStop(0.5, 'rgba(200,200,220,0.15)');
      g.addColorStop(1, 'rgba(200,200,220,0)');
      fctx.fillStyle = g;
      fctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(fogC);

      this.floorFog = [];
      const count = 52;
      for (let i = 0; i < count; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex, transparent: true, opacity: 0.25,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        const scale = 3 + Math.random() * 3;
        s.scale.set(scale, scale * 0.55, 1);
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * (CHAMBER_RADIUS - 2);
        s.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
        s.userData = {
          basePhase: Math.random() * Math.PI * 2,
          baseX: s.position.x, baseZ: s.position.z,
          speed: 0.1 + Math.random() * 0.2,
        };
        this.scene.add(s);
        this.floorFog.push(s);
      }
    }

    /* Extra chandeliers flanking the central one */
    buildExtraChandeliers() {
      this.extraChandeliers = [];
      const positions = [[-14, 6], [14, 6], [-14, -10], [14, -10]];
      positions.forEach(([x, z], i) => {
        const group = new THREE.Group();
        const frameMat = new THREE.MeshStandardMaterial({
          color: 0xb59248, metalness: 0.95, roughness: 0.25,
          emissive: 0x4a3a18, emissiveIntensity: 0.5,
        });
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.2, 0.05, 8, 36),
          frameMat
        );
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        for (let j = 0; j < 14; j++) {
          const a = (j / 14) * Math.PI * 2;
          const drop = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 0.2, 6),
            new THREE.MeshStandardMaterial({
              color: 0xe8eaff,
              emissive: [0x7ef0ff, 0xc7a6ff, 0xff6b8a, 0xffe4a8][i],
              emissiveIntensity: 0.5,
              roughness: 0.15, metalness: 0.3,
              transparent: true, opacity: 0.8,
            })
          );
          drop.position.set(Math.cos(a) * 1.2, -0.2, Math.sin(a) * 1.2);
          drop.rotation.x = Math.PI;
          group.add(drop);
        }
        const pl = new THREE.PointLight([0x7ef0ff, 0xc7a6ff, 0xff6b8a, 0xffe4a8][i], 0.8, 12, 2);
        pl.position.y = -0.3;
        group.add(pl);

        group.position.set(x, WALL_HEIGHT - 2, z);
        this.scene.add(group);
        this.extraChandeliers.push(group);
      });
    }

    /* ==================================================
       GALLERY — public-domain paintings on the casino walls.
       Each painting: gilt brass frame + plaque + gallery spotlight.
       Texture loads from Wikimedia Commons with a procedural fallback.
       ================================================== */

    /* Build ONE painting: frame + plaque + spotlight + image plane. */
    buildPainting(cfg) {
      const group = new THREE.Group();

      // Frame dimensions depend on aspect ratio of painting
      const aspect = cfg.aspect || 0.75; // h / w
      const W = cfg.width || 2.2;
      const H = W * aspect;

      // Image plane — starts with procedural placeholder, swaps to real on load
      const placeholderTex = makePaintingPlaceholder(cfg.palette || 'muted', cfg.title, cfg.artist);
      const imgMat = new THREE.MeshStandardMaterial({
        map: placeholderTex,
        roughness: 0.75,
        metalness: 0.1,
        emissive: 0x1a1008,
        emissiveIntensity: 0.2,
      });
      const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), imgMat);
      group.add(canvasMesh);

      // Attempt to load the real painting if a URL is provided
      if (cfg.url) {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
          cfg.url,
          (loaded) => {
            /* colorSpace kept at default — Three 0.128 has no SRGBColorSpace */
            imgMat.map = loaded;
            imgMat.needsUpdate = true;
            imgMat.emissiveIntensity = 0.08;
          },
          undefined,
          () => { /* keep placeholder on error */ }
        );
      }

      // Gilt brass frame — outer ornate, inner simple
      const frameDepth = 0.14;
      const frameThick = 0.18;
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0xb59248,
        metalness: 0.95,
        roughness: 0.28,
        emissive: 0x4a3a18,
        emissiveIntensity: 0.55,
      });
      // Four frame bars
      const frameBars = [
        [W + frameThick * 2, frameThick, frameDepth, 0, H / 2 + frameThick / 2, 0],   // top
        [W + frameThick * 2, frameThick, frameDepth, 0, -(H / 2 + frameThick / 2), 0], // bottom
        [frameThick, H,               frameDepth, -(W / 2 + frameThick / 2), 0, 0],   // left
        [frameThick, H,               frameDepth,  W / 2 + frameThick / 2, 0, 0],   // right
      ];
      frameBars.forEach(b => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(b[0], b[1], b[2]), frameMat);
        bar.position.set(b[3], b[4], -frameDepth * 0.1);
        group.add(bar);
      });

      // Inner bevel trim — thin ridge
      const trimMat = new THREE.MeshStandardMaterial({
        color: 0x8a6e30, metalness: 0.8, roughness: 0.4,
        emissive: 0x2a2410, emissiveIntensity: 0.5,
      });
      const trimW = W + 0.02;
      const trimH = H + 0.02;
      const trimBars = [
        [trimW, 0.03, 0.04, 0, trimH / 2, 0.02],
        [trimW, 0.03, 0.04, 0, -trimH / 2, 0.02],
        [0.03, trimH, 0.04, -trimW / 2, 0, 0.02],
        [0.03, trimH, 0.04,  trimW / 2, 0, 0.02],
      ];
      trimBars.forEach(b => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(b[0], b[1], b[2]), trimMat);
        bar.position.set(b[3], b[4], b[5]);
        group.add(bar);
      });

      // Corner ornaments — fleur-de-lis-like crests at each corner
      const crestMat = frameMat;
      const crestSize = 0.18;
      const cornerOffsets = [
        [-W / 2 - frameThick, H / 2 + frameThick, 0.07],
        [ W / 2 + frameThick, H / 2 + frameThick, 0.07],
        [-W / 2 - frameThick, -H / 2 - frameThick, 0.07],
        [ W / 2 + frameThick, -H / 2 - frameThick, 0.07],
      ];
      cornerOffsets.forEach(c => {
        const crest = new THREE.Mesh(new THREE.SphereGeometry(crestSize / 2, 16, 12), crestMat);
        crest.position.set(c[0], c[1], c[2]);
        group.add(crest);
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 8), crestMat);
        spike.position.set(c[0], c[1] + (c[1] > 0 ? 0.12 : -0.12), c[2]);
        spike.rotation.z = c[1] > 0 ? 0 : Math.PI;
        group.add(spike);
      });

      // Brass plaque below — title + artist + year
      const plaqueC = canvas(512, 96);
      const pctx = plaqueC.getContext('2d');
      // Brass gradient
      const pg = pctx.createLinearGradient(0, 0, 0, 96);
      pg.addColorStop(0, '#b59248');
      pg.addColorStop(0.5, '#d8b564');
      pg.addColorStop(1, '#8a6e30');
      pctx.fillStyle = pg;
      pctx.fillRect(0, 0, 512, 96);
      // Engraved outline
      pctx.strokeStyle = 'rgba(40,24,8,0.8)';
      pctx.lineWidth = 1.5;
      pctx.strokeRect(4, 4, 504, 88);
      // Title
      pctx.font = 'bold 22px "Cinzel", serif';
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      pctx.fillStyle = 'rgba(30,20,10,0.9)';
      pctx.fillText(cfg.title || '', 256, 34);
      // Artist + year
      pctx.font = 'italic 16px "Cormorant Garamond", serif';
      pctx.fillStyle = 'rgba(50,32,14,0.85)';
      pctx.fillText(`${cfg.artist || ''} · ${cfg.year || ''}`, 256, 64);
      const plaqueTex = new THREE.CanvasTexture(plaqueC);
      const plaqueMat = new THREE.MeshStandardMaterial({
        map: plaqueTex, metalness: 0.9, roughness: 0.3,
        emissive: 0x3a2a10, emissiveIntensity: 0.5,
      });
      const plaqueW = Math.min(W * 0.85, 1.6);
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(plaqueW, plaqueW * 0.18, 0.04), plaqueMat);
      plaque.position.set(0, -H / 2 - frameThick - 0.22, 0.05);
      group.add(plaque);

      // Gallery spotlight — small cone light pointed at the painting
      const spot = new THREE.SpotLight(0xffe4a8, 2.0, 7, Math.PI / 6, 0.5, 1.5);
      spot.position.set(0, H / 2 + 1.2, 1.2);
      spot.target.position.set(0, 0, 0);
      group.add(spot);
      group.add(spot.target);

      // Small brass lamp housing visible above painting
      const lamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.14, 12),
        frameMat
      );
      lamp.position.set(0, H / 2 + frameThick + 0.32, 0.16);
      lamp.rotation.x = -Math.PI / 6;
      group.add(lamp);
      // Lamp arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), frameMat);
      arm.position.set(0, H / 2 + frameThick + 0.18, 0.08);
      arm.rotation.x = Math.PI / 2;
      group.add(arm);

      group.userData.kind = 'painting';
      group.userData.cfg = cfg;
      return group;
    }

    /* Build the set of paintings for the casino room. */
    buildGalleryPaintings() {
      const paintings = [
        // Near Siren altar (west wall, around x=-CHAMBER_RADIUS+1)
        {
          pos: [-CHAMBER_RADIUS + 0.4, 6, 6],
          rot: Math.PI / 2,
          width: 3.4, aspect: 1.45,
          title: 'A MERMAID',
          artist: 'Waterhouse', year: '1900',
          palette: 'waterhouse',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/A_Mermaid.jpg/800px-A_Mermaid.jpg',
        },
        // Near the exit door (far -z wall)
        {
          pos: [-6, 6, -CHAMBER_RADIUS + 0.4],
          rot: 0,
          width: 3.2, aspect: 0.66,
          title: 'ISLE OF THE DEAD',
          artist: 'Böcklin', year: '1880',
          palette: 'bocklin',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Arnold_B%C3%B6cklin_-_Die_Toteninsel_III_%28Alte_Nationalgalerie%2C_Berlin%29.jpg/800px-Arnold_B%C3%B6cklin_-_Die_Toteninsel_III_%28Alte_Nationalgalerie%2C_Berlin%29.jpg',
        },
        {
          pos: [6, 6, -CHAMBER_RADIUS + 0.4],
          rot: 0,
          width: 2.8, aspect: 1.1,
          title: 'WATER SERPENTS II',
          artist: 'Klimt', year: '1907',
          palette: 'klimt',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Gustav_Klimt_048.jpg/800px-Gustav_Klimt_048.jpg',
        },
        // North wall (z = -CHAMBER_RADIUS) - already has one; add a third tall piece
        {
          pos: [0, 7, -CHAMBER_RADIUS + 0.4],
          rot: 0,
          width: 2.4, aspect: 1.4,
          title: 'THE DEPTHS OF THE SEA',
          artist: 'Burne-Jones', year: '1887',
          palette: 'burneJones',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Edward_Burne-Jones_-_The_Depths_of_the_Sea_%281887%29.jpg/800px-Edward_Burne-Jones_-_The_Depths_of_the_Sea_%281887%29.jpg',
        },
        // East wall
        {
          pos: [CHAMBER_RADIUS - 0.4, 6, -4],
          rot: -Math.PI / 2,
          width: 3.0, aspect: 0.62,
          title: 'ULYSSES AND THE SIRENS',
          artist: 'Waterhouse', year: '1891',
          palette: 'waterhouse',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/John_William_Waterhouse_-_Ulysses_and_the_Sirens_%281891%29.jpg/800px-John_William_Waterhouse_-_Ulysses_and_the_Sirens_%281891%29.jpg',
        },
        {
          pos: [CHAMBER_RADIUS - 0.4, 6, 8],
          rot: -Math.PI / 2,
          width: 2.4, aspect: 1.3,
          title: 'THE GREAT WAVE',
          artist: 'Hokusai', year: '1831',
          palette: 'hokusai',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/The_Great_Wave_off_Kanagawa.jpg/800px-The_Great_Wave_off_Kanagawa.jpg',
        },
        // West wall — second piece
        {
          pos: [-CHAMBER_RADIUS + 0.4, 6, -4],
          rot: Math.PI / 2,
          width: 2.8, aspect: 1.2,
          title: 'DANAË',
          artist: 'Klimt', year: '1907',
          palette: 'klimt',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/KLIMT_-_Dan%C3%A1e_%281907-1908%29.jpg/800px-KLIMT_-_Dan%C3%A1e_%281907-1908%29.jpg',
        },
      ];
      this.paintings = [];
      paintings.forEach(cfg => {
        const p = this.buildPainting(cfg);
        p.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        p.rotation.y = cfg.rot || 0;
        this.scene.add(p);
        this.paintings.push(p);
      });
    }

    buildVegasDressing() {
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xb59248, metalness: 0.9, roughness: 0.25, emissive: 0x4a3a18, emissiveIntensity: 0.6 });
      const velvetMat = new THREE.MeshStandardMaterial({ color: 0x5a1830, emissive: 0x2a0818, emissiveIntensity: 0.5, roughness: 0.85 });

      // Brass stanchions + velvet ropes along the central path
      const stanchPositions = [
        [-6, 0, 12], [-4, 0, 6], [4, 0, 6], [6, 0, 12],
        [-6, 0, -2], [-4, 0, -8], [4, 0, -8], [6, 0, -2],
      ];
      stanchPositions.forEach(([x, _, z]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.0, 10), goldMat);
        post.position.set(x, 0.5, z);
        this.scene.add(post);
        // Gold ball top
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), goldMat);
        ball.position.set(x, 1.05, z);
        this.scene.add(ball);
      });
      // Velvet ropes between pairs
      const ropePairs = [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7]];
      ropePairs.forEach(([a,b]) => {
        const pA = stanchPositions[a], pB = stanchPositions[b];
        const dx = pB[0]-pA[0], dz = pB[2]-pA[2];
        const len = Math.sqrt(dx*dx + dz*dz);
        if (len > 4) return; // skip distant pairs
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 8), velvetMat);
        rope.position.set((pA[0]+pB[0])/2, 0.85, (pA[2]+pB[2])/2);
        rope.rotation.z = Math.PI / 2;
        rope.rotation.y = Math.atan2(dz, dx);
        this.scene.add(rope);
      });

      // Pearl rope-lights running along the wall base
      const ropeCount = 48;
      for (let i = 0; i < ropeCount; i++) {
        const a = (i / ropeCount) * Math.PI * 2;
        const r = CHAMBER_RADIUS - 0.9;
        const pearl = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 10, 8),
          new THREE.MeshBasicMaterial({
            color: [0x7ef0ff, 0xc7a6ff, 0xff6b8a, 0x5be0c2][i % 4],
            transparent: true,
            opacity: 0.95,
          })
        );
        pearl.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r);
        pearl.userData = { basePhase: i * 0.2 };
        this.scene.add(pearl);
        if (!this.ropeLights) this.ropeLights = [];
        this.ropeLights.push(pearl);
      }

      // A second strand higher up
      for (let i = 0; i < ropeCount; i++) {
        const a = (i / ropeCount) * Math.PI * 2 + 0.1;
        const r = CHAMBER_RADIUS - 0.6;
        const pearl = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 8),
          new THREE.MeshBasicMaterial({
            color: [0xffffff, 0xc7a6ff, 0x7ef0ff][i % 3],
            transparent: true,
            opacity: 0.85,
          })
        );
        pearl.position.set(Math.cos(a) * r, 9, Math.sin(a) * r);
        pearl.userData = { basePhase: i * 0.3 + 1 };
        this.scene.add(pearl);
        this.ropeLights.push(pearl);
      }
    }

    /* Ghost patrons at some of the tables — the previous you, still playing */
    buildGhostPlayers() {
      if (!this.tables) return;
      this.ghostPlayers = [];
      const poses = ['hunched', 'stacking', 'despair'];
      // Pick 3 of 7 tables to populate (indices 1, 3, 5 — spread around)
      [1, 3, 5].forEach((idx, i) => {
        const t = this.tables[idx];
        if (!t) return;
        const pose = poses[i % poses.length];
        const tex = makeGhostPlayerTexture(pose);
        const mat = new THREE.SpriteMaterial({
          map: tex, transparent: true, opacity: 0.55,
          depthWrite: false, blending: THREE.NormalBlending,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(2.0, 2.7, 1);
        // Position across the table from where the player usually stands
        // t is at ring position; put the ghost on the opposite side of the table's local origin
        const dirX = t.position.x, dirZ = t.position.z;
        const mag = Math.sqrt(dirX*dirX + dirZ*dirZ);
        const offX = dirX / mag * 1.3;
        const offZ = dirZ / mag * 1.3;
        sprite.position.set(offX, 1.3, offZ);
        sprite.userData = {
          basePhase: Math.random() * Math.PI * 2,
          pose, idx,
          basePos: { x: offX, z: offZ },
          baseY: 1.3,
          leanT: 0,
        };
        t.add(sprite);
        this.ghostPlayers.push(sprite);
      });

      // Tracker for the last result
      this.lastResultT = -9999;
      this.lastResultSign = 0;
    }

    /* Called from the App layer when a hand settles. */
    markLastResult(delta) {
      this.lastResultT = performance.now();
      this.lastResultSign = delta > 0 ? 1 : delta < 0 ? -1 : 0;
    }

    /* Neon-tube signs above each table — flickering names */
    buildTableNeons() {
      if (!this.tables) return;
      const tableNames = ['BLACKJACK','OMENS','BACCARAT','GLYPHS','GHOST POKER','BONES','THE COIN'];
      const tableColors = [0x7ef0ff, 0xc7a6ff, 0xff6b8a, 0x5be0c2, 0x7ef0ff, 0xb59248, 0xc7a6ff];

      this.tables.forEach((t, i) => {
        const name = tableNames[i] || t.userData.name || 'TABLE';
        const color = tableColors[i % tableColors.length];
        const colorRgb = `rgb(${(color>>16)&0xff},${(color>>8)&0xff},${color&0xff})`;

        // Neon sign texture — glowing tube text
        const c = canvas(768, 192);
        const ctx = c.getContext('2d');
        ctx.clearRect(0,0,768,192);
        // Halo
        ctx.shadowColor = colorRgb;
        ctx.shadowBlur = 40;
        ctx.font = 'bold 90px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = colorRgb;
        ctx.fillText(name, 384, 96);
        // Tube outline (draw thin outline + white core)
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeText(name, 384, 96);
        // Subtitle
        ctx.shadowBlur = 10;
        ctx.font = 'italic 24px "Cormorant Garamond", serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(t.userData.subtitle || '', 384, 162);

        const tex = new THREE.CanvasTexture(c);
        const signMat = new THREE.SpriteMaterial({
          map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const sign = new THREE.Sprite(signMat);
        sign.scale.set(3.8, 0.95, 1);
        sign.position.set(0, 3.6, 0);
        sign.renderOrder = 11;
        sign.userData = { flicker: Math.random() };
        t.add(sign);
        t.userData.neonSign = sign;
      });
    }

    /* Massive crystal chandelier hanging in the dome */
    buildChandelier() {
      const group = new THREE.Group();

      // Central brass frame
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0xb59248, metalness: 0.95, roughness: 0.25,
        emissive: 0x4a3a18, emissiveIntensity: 0.65,
      });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), frameMat);
      group.add(core);

      // Three-tiered rings of crystal teardrops
      const tierConfigs = [
        { radius: 1.6, count: 18, y: -0.4, size: 0.12 },
        { radius: 2.6, count: 28, y: -1.2, size: 0.16 },
        { radius: 3.6, count: 36, y: -2.1, size: 0.14 },
      ];
      tierConfigs.forEach(cfg => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(cfg.radius, 0.05, 8, 48),
          frameMat
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = cfg.y;
        group.add(ring);
        for (let i = 0; i < cfg.count; i++) {
          const a = (i / cfg.count) * Math.PI * 2;
          // Teardrop — use a small cone oriented downward
          const drop = new THREE.Mesh(
            new THREE.ConeGeometry(cfg.size * 0.9, cfg.size * 2.4, 8),
            new THREE.MeshStandardMaterial({
              color: 0xe8eaff,
              emissive: 0x7ef0ff,
              emissiveIntensity: 0.45,
              roughness: 0.15,
              metalness: 0.3,
              transparent: true,
              opacity: 0.82,
            })
          );
          drop.position.set(
            Math.cos(a) * cfg.radius,
            cfg.y - cfg.size * 1.2 - Math.random() * 0.2,
            Math.sin(a) * cfg.radius
          );
          drop.rotation.x = Math.PI;
          group.add(drop);
        }
        // Stars on the ring
        for (let i = 0; i < cfg.count / 3; i++) {
          const a = (i / (cfg.count / 3)) * Math.PI * 2;
          const star = new THREE.Mesh(
            new THREE.OctahedronGeometry(cfg.size * 0.8),
            new THREE.MeshBasicMaterial({ color: 0xffffee, transparent: true, opacity: 0.9 })
          );
          star.position.set(
            Math.cos(a) * cfg.radius,
            cfg.y,
            Math.sin(a) * cfg.radius
          );
          group.add(star);
        }
      });

      // Six point lights in the chandelier — gives the room its warm wash
      const colors = [0x7ef0ff, 0xc7a6ff, 0xffe4a8, 0x5be0c2, 0xff9eb5, 0xe8e2cc];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const pl = new THREE.PointLight(colors[i], 0.6, 20, 2);
        pl.position.set(Math.cos(a) * 1.2, -0.6, Math.sin(a) * 1.2);
        group.add(pl);
      }

      group.position.set(0, WALL_HEIGHT - 1.5, 0);
      this.scene.add(group);
      this.chandelier = group;
    }

    /* Red velvet carpet runners radiating from center */
    buildCarpets() {
      const carpetC = canvas(256, 512);
      const ctx = carpetC.getContext('2d');
      // Deep red with border
      ctx.fillStyle = '#2a0810';
      ctx.fillRect(0, 0, 256, 512);
      ctx.fillStyle = '#5a1830';
      ctx.fillRect(20, 20, 216, 472);
      ctx.fillStyle = '#8b1e2c';
      ctx.fillRect(36, 36, 184, 440);
      // Pattern — diamond row of card suits
      ctx.fillStyle = 'rgba(181,146,72,0.75)';
      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      const suits = ['\u2660','\u2665','\u2666','\u2663'];
      for (let i = 0; i < 10; i++) {
        ctx.fillText(suits[i % 4], 128, 90 + i * 44);
      }
      // Gold trim fringe
      ctx.strokeStyle = 'rgba(232,212,160,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(22, 22, 212, 468);
      const tex = new THREE.CanvasTexture(carpetC);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.95,
        metalness: 0.05,
        emissive: 0x1a0610,
        emissiveIntensity: 0.45,
      });

      // Radial runners from center to each table + the Siren altar + the door
      const endpoints = [];
      (this.tables || []).forEach(t => endpoints.push({ pos: t.position }));
      if (this.door) endpoints.push({ pos: this.door.position });
      if (this.sirenAltar) endpoints.push({ pos: this.sirenAltar.position });

      endpoints.forEach(ep => {
        const dx = ep.pos.x, dz = ep.pos.z;
        const len = Math.sqrt(dx*dx + dz*dz);
        if (len < 3) return;
        const carpet = new THREE.Mesh(
          new THREE.PlaneGeometry(1.4, len - 1.8),
          mat
        );
        carpet.rotation.x = -Math.PI / 2;
        carpet.rotation.z = -Math.atan2(dz, dx) - Math.PI / 2;
        carpet.position.set(dx / 2, 0.025, dz / 2);
        this.scene.add(carpet);
      });

      // Central round rug under chandelier
      const medallionC = canvas(512, 512);
      const mctx = medallionC.getContext('2d');
      const mg = mctx.createRadialGradient(256, 256, 40, 256, 256, 256);
      mg.addColorStop(0, '#8b1e2c');
      mg.addColorStop(0.6, '#5a1830');
      mg.addColorStop(1, '#2a0810');
      mctx.fillStyle = mg;
      mctx.fillRect(0, 0, 512, 512);
      // Compass star pattern
      mctx.strokeStyle = 'rgba(232,212,160,0.6)';
      mctx.lineWidth = 3;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        mctx.beginPath();
        mctx.moveTo(256 + Math.cos(a) * 40, 256 + Math.sin(a) * 40);
        mctx.lineTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240);
        mctx.stroke();
      }
      mctx.beginPath(); mctx.arc(256, 256, 100, 0, Math.PI*2); mctx.stroke();
      mctx.beginPath(); mctx.arc(256, 256, 180, 0, Math.PI*2); mctx.stroke();
      mctx.fillStyle = 'rgba(232,212,160,0.85)';
      mctx.font = 'bold 80px serif';
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';
      mctx.fillText('\u2660', 256, 256);

      const medallion = new THREE.Mesh(
        new THREE.CircleGeometry(3.5, 48),
        new THREE.MeshStandardMaterial({
          map: new THREE.CanvasTexture(medallionC),
          roughness: 0.85, metalness: 0.1,
          emissive: 0x2a0810, emissiveIntensity: 0.4,
        })
      );
      medallion.rotation.x = -Math.PI / 2;
      medallion.position.y = 0.024;
      this.scene.add(medallion);
    }

    /* "THE ABYSS" neon marquee arch at the spawn side */
    buildMarqueeArch() {
      const group = new THREE.Group();

      // Frame — thin brass curved ribbons
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xb59248, metalness: 0.9, roughness: 0.25, emissive: 0x4a3a18, emissiveIntensity: 0.55 });
      const side1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 8, 0.3), frameMat);
      side1.position.set(-3, 4, 0); group.add(side1);
      const side2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 8, 0.3), frameMat);
      side2.position.set(3, 4, 0); group.add(side2);
      const archTop = new THREE.Mesh(
        new THREE.TorusGeometry(3, 0.25, 18, 48, Math.PI),
        frameMat
      );
      archTop.position.set(0, 8, 0); archTop.rotation.z = Math.PI;
      group.add(archTop);

      // Neon text — "THE ABYSS"
      const c = canvas(1024, 256);
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 1024, 256);
      // Pink-cyan double neon
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Outer pink halo
      ctx.font = 'bold 180px "Cinzel", serif';
      ctx.shadowColor = '#ff6b8a';
      ctx.shadowBlur = 48;
      ctx.fillStyle = '#ff6b8a';
      ctx.fillText('ABYSS', 512, 128);
      // Cyan core
      ctx.shadowColor = '#7ef0ff';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#e0fcff';
      ctx.fillText('ABYSS', 512, 128);
      // White hot centre via stroke
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeText('ABYSS', 512, 128);
      // Subtitle
      ctx.shadowBlur = 12;
      ctx.font = 'italic 38px "Cormorant Garamond", serif';
      ctx.fillStyle = 'rgba(232,212,160,0.85)';
      ctx.fillText('— the house always has a face —', 512, 220);

      const tex = new THREE.CanvasTexture(c);
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      sign.scale.set(7.2, 1.8, 1);
      sign.position.set(0, 5.2, 0.1);
      sign.userData = { flickerPhase: 0 };
      group.add(sign);
      group.userData.marqueeSign = sign;

      // Marquee-light bulbs around the arch outline
      this.marqueeBulbs = [];
      const bulbMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      const bulbCount = 32;
      for (let i = 0; i <= bulbCount; i++) {
        const t = i / bulbCount;
        const angle = Math.PI * t;
        const x = Math.cos(Math.PI - angle) * 3;
        const y = 4 + Math.sin(angle) * 4;
        const color = i % 2 === 0 ? 0xffffee : 0xff6b8a;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), bulbMat(color));
        bulb.position.set(x, y, 0.25);
        bulb.userData = { basePhase: i * 0.18, color };
        group.add(bulb);
        this.marqueeBulbs.push(bulb);
      }
      // Side bulbs on the posts
      for (let j = 0; j < 5; j++) {
        [-3, 3].forEach(x => {
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), bulbMat(j % 2 === 0 ? 0xffffee : 0xff6b8a));
          bulb.position.set(x, 0.5 + j * 0.8, 0.25);
          bulb.userData = { basePhase: j * 0.25 + (x > 0 ? 1 : 0), color: j % 2 === 0 ? 0xffffee : 0xff6b8a };
          group.add(bulb);
          this.marqueeBulbs.push(bulb);
        });
      }

      // Floor glow
      const floorGlow = new THREE.Mesh(
        new THREE.RingGeometry(2.5, 4, 48),
        new THREE.MeshBasicMaterial({ color: 0xff6b8a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      floorGlow.rotation.x = -Math.PI / 2;
      floorGlow.position.y = 0.03;
      group.add(floorGlow);

      // Warm pink light under the arch
      const pink = new THREE.PointLight(0xff6b8a, 1.3, 14, 2);
      pink.position.set(0, 5, 0);
      group.add(pink);

      group.position.set(0, 0, CHAMBER_RADIUS - 3.5);
      group.rotation.y = Math.PI;
      this.scene.add(group);
      this.marqueeArch = group;
    }

    buildPortalArch(cfg) {
      const group = new THREE.Group();
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0a1a24, roughness: 0.6, metalness: 0.5, emissive: cfg.emissive, emissiveIntensity: 0.35 });
      const side1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.0, 0.8), frameMat);
      side1.position.set(-1.3, 2.5, 0); group.add(side1);
      const side2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.0, 0.8), frameMat);
      side2.position.set(1.3, 2.5, 0); group.add(side2);
      const archTop = new THREE.Mesh(
        new THREE.TorusGeometry(1.3, 0.2, 14, 32, Math.PI),
        frameMat
      );
      archTop.position.set(0, 5.0, 0); archTop.rotation.z = Math.PI;
      group.add(archTop);

      const beamMat = new THREE.MeshBasicMaterial({
        color: cfg.color, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 4.2), beamMat);
      beam.position.set(0, 2.5, -0.05);
      group.add(beam);
      group.userData.beam = beam;

      // Banner
      const c = canvas(512, 128);
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 512, 128);
      ctx.font = 'bold 40px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = cfg.labelColor;
      ctx.shadowColor = cfg.labelColor;
      ctx.shadowBlur = 20;
      const chars = cfg.label.split('');
      chars.forEach((ch, i) => {
        ctx.fillText(ch, 256 - ((chars.length - 1) * 20) / 2 + i * 20, 46);
      });
      ctx.font = 'italic 18px "Cormorant Garamond", serif';
      ctx.fillStyle = cfg.subColor;
      ctx.shadowBlur = 8;
      ctx.fillText(cfg.sub, 256, 88);
      const tex = new THREE.CanvasTexture(c);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sprite.scale.set(3.0, 0.75, 1);
      sprite.position.set(0, 5.9, 0);
      group.add(sprite);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.7, 2.3, 32),
        new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      group.add(ring);
      group.userData.floorRing = ring;

      const light = new THREE.PointLight(cfg.color, 0.8, 8, 2);
      light.position.set(0, 3, 0.5);
      group.add(light);

      group.position.set(cfg.pos[0], 0, cfg.pos[1]);
      group.rotation.y = cfg.rot || 0;
      group.userData.kind = 'portal';
      group.userData.targetRoom = cfg.targetRoom;
      group.userData.name = cfg.label;
      group.userData.subtitle = cfg.sub;
      this.interactables.push(group);
      this._add(group);
      return group;
    }

    buildFloor() {
      const tex = makeMarbleFloor();
      tex.repeat.set(1, 1);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.35,
        metalness: 0.25,
        emissive: new THREE.Color(0x051422),
        emissiveIntensity: 0.45,
      });
      const floor = new THREE.Mesh(new THREE.CircleGeometry(CHAMBER_RADIUS + 2, 72), mat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0;
      this.scene.add(floor);

      // Inner glow ring
      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(CHAMBER_RADIUS - 0.5, CHAMBER_RADIUS, 72),
        new THREE.MeshBasicMaterial({ color: 0x7ef0ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
      );
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = 0.01;
      this.scene.add(glowRing);

      // Caustic projection — animated voronoi shader on the floor
      const causticVertex = `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `;
      const causticFragment = `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        vec2 hash2(vec2 p) {
          return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
        }

        float voronoi(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float res = 8.0;
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 g = vec2(float(x), float(y));
              vec2 o = hash2(i + g);
              o = 0.5 + 0.5 * sin(uTime * 0.55 + 6.28 * o);
              float d = length(g + o - f);
              res = min(res, d);
            }
          }
          return res;
        }

        void main() {
          vec2 uv = vUv * 3.2;
          float v = voronoi(uv);
          float caustic = pow(1.0 - v, 4.0);
          // Blend cyan to teal
          vec3 color = mix(vec3(0.03, 0.14, 0.22), vec3(0.45, 0.95, 1.0), caustic);
          // Radial falloff from chamber center
          float r = length(vWorldPos.xz) / ${(CHAMBER_RADIUS + 2).toFixed(1)};
          float fall = smoothstep(1.05, 0.2, r);
          float alpha = smoothstep(0.35, 1.0, caustic) * 0.55 * fall * uIntensity;
          gl_FragColor = vec4(color, alpha);
        }
      `;
      this.causticMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime:      { value: 0 },
          uIntensity: { value: 1.0 },
        },
        vertexShader: causticVertex,
        fragmentShader: causticFragment,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const caustic = new THREE.Mesh(new THREE.CircleGeometry(CHAMBER_RADIUS, 72), this.causticMat);
      caustic.rotation.x = -Math.PI / 2;
      caustic.position.y = 0.02;
      this.scene.add(caustic);
    }

    buildWalls() {
      // Curved backdrop: inner cylinder wall with coral texture (inverted normals)
      const wallTex = makeColumnTexture();
      wallTex.repeat.set(8, 2);
      const wallGeo = new THREE.CylinderGeometry(CHAMBER_RADIUS + 0.5, CHAMBER_RADIUS + 0.5, WALL_HEIGHT, 64, 1, true);
      const wallMat = new THREE.MeshStandardMaterial({
        map: wallTex,
        side: THREE.BackSide,
        roughness: 0.85,
        metalness: 0.1,
        emissive: 0x081a28,
        emissiveIntensity: 0.35,
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.y = WALL_HEIGHT / 2;
      this.scene.add(wall);

      // Freestanding coral columns
      const columnTex = makeColumnTexture();
      columnTex.repeat.set(2, 3);
      const columnMat = new THREE.MeshStandardMaterial({
        map: columnTex,
        roughness: 0.75,
        metalness: 0.15,
        emissive: 0x143547,
        emissiveIntensity: 0.3,
      });

      const count = 10;
      const ringR = CHAMBER_RADIUS - 2;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.PI / count;
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.75, WALL_HEIGHT - 1, 16),
          columnMat
        );
        col.position.set(Math.cos(a) * ringR, (WALL_HEIGHT - 1) / 2, Math.sin(a) * ringR);
        this.scene.add(col);

        // Top capital
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(1.0, 0.8, 0.4, 16),
          columnMat
        );
        cap.position.set(col.position.x, WALL_HEIGHT - 0.8, col.position.z);
        this.scene.add(cap);

        // Coral accents — small cones
        for (let j = 0; j < 3; j++) {
          const coral = new THREE.Mesh(
            new THREE.ConeGeometry(0.18, 0.9, 6),
            new THREE.MeshStandardMaterial({
              color: j === 0 ? 0x5be0c2 : j === 1 ? 0xff6b8a : 0xc7a6ff,
              emissive: j === 0 ? 0x5be0c2 : j === 1 ? 0xff6b8a : 0xc7a6ff,
              emissiveIntensity: 0.4,
              roughness: 0.6,
            })
          );
          coral.position.set(col.position.x + (Math.random() - 0.5) * 1.4, 0.5 + j * 0.8, col.position.z + (Math.random() - 0.5) * 1.4);
          coral.rotation.z = (Math.random() - 0.5) * 0.4;
          this.scene.add(coral);
        }
      }
    }

    buildCeiling() {
      // Dome above — near-black with faint glimmer
      const domeMat = new THREE.MeshStandardMaterial({
        color: 0x020608,
        side: THREE.BackSide,
        roughness: 1.0,
        emissive: 0x02101a,
        emissiveIntensity: 0.2,
      });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(CHAMBER_RADIUS + 3, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
      dome.position.y = WALL_HEIGHT - 0.5;
      dome.scale.y = 0.45;
      this.scene.add(dome);

      // Star-like pinholes up high (distant glimmer from above the water)
      const starCount = 80;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * CHAMBER_RADIUS * 0.8;
        starPos[i*3] = Math.cos(a) * r;
        starPos[i*3+1] = WALL_HEIGHT + Math.random() * 2;
        starPos[i*3+2] = Math.sin(a) * r;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
        color: 0x7ef0ff,
        size: 0.15,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }));
      this.scene.add(stars);
    }

    buildTables() {
      const tableConfigs = [
        { key: 'blackjack', name: 'Blackjack', icon: '♠', tint: 'rgba(126,240,255,0.85)', subtitle: 'Twenty-one. She deals.', angle: 0 },
        { key: 'roulette',  name: 'Omens',     icon: 'Ψ', tint: 'rgba(199,166,255,0.85)', subtitle: 'Twelve cursed omens.', angle: 1 },
        { key: 'baccarat',  name: 'Baccarat',  icon: '♦', tint: 'rgba(255,107,138,0.85)', subtitle: 'Player. Banker. Tie.', angle: 2 },
        { key: 'slots',     name: 'Glyphs',    icon: '𓂀', tint: 'rgba(91,224,194,0.85)',  subtitle: 'Three reels, old tongue.', angle: 3 },
        { key: 'poker',     name: 'Ghost Poker', icon: '♣', tint: 'rgba(126,240,255,0.85)', subtitle: 'Three dead patrons.', angle: 4 },
        { key: 'dice',      name: 'Bones',     icon: '⚀', tint: 'rgba(199,166,255,0.85)', subtitle: 'Two drowned dice.', angle: 5 },
        { key: 'coin',      name: 'The Coin',  icon: '◉', tint: 'rgba(91,224,194,0.85)',  subtitle: 'Siren or Kraken.', angle: 6 },
      ];

      // Arrange in a ring (skip angles where the Siren altar / door sit)
      const count = tableConfigs.length;
      const startA = -Math.PI * 0.72; // bias toward front-left so Siren gap feels natural
      tableConfigs.forEach((cfg, i) => {
        const a = startA + (i / count) * Math.PI * 1.55; // arc roughly 280° — gap at the back
        const x = Math.cos(a) * TABLE_RING;
        const z = Math.sin(a) * TABLE_RING;
        const t = this.makeTableMesh(cfg);
        t.position.set(x, 0, z);
        t.lookAt(0, 1, 0);
        t.userData = { kind: 'table', key: cfg.key, name: cfg.name, subtitle: cfg.subtitle };
        this.scene.add(t);
        this.tables.push(t);
        this.interactables.push(t);
      });
    }

    makeTableMesh(cfg) {
      const group = new THREE.Group();

      // Pedestal base
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.75, 0.4, 20),
        new THREE.MeshStandardMaterial({ color: 0x0a1a24, roughness: 0.7, metalness: 0.3 })
      );
      base.position.y = 0.2;
      group.add(base);

      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.38, 0.85, 16),
        new THREE.MeshStandardMaterial({ color: 0x143547, roughness: 0.6, metalness: 0.4, emissive: 0x143547, emissiveIntensity: 0.15 })
      );
      stem.position.y = 0.8;
      group.add(stem);

      // Table top
      const topTex = makeFeltTexture(cfg.icon, cfg.tint);
      const topMat = new THREE.MeshStandardMaterial({
        map: topTex,
        emissive: new THREE.Color(0x0e2a20),
        emissiveIntensity: 0.6,
        roughness: 0.7,
        metalness: 0.1,
      });
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.35, 0.08, 48),
        topMat
      );
      top.position.y = 1.28;
      group.add(top);

      // Gold rim
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.35, 0.075, 20, 64),
        new THREE.MeshStandardMaterial({ color: 0x8a6e30, roughness: 0.3, metalness: 0.9, emissive: 0x4a3e18, emissiveIntensity: 0.5 })
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 1.28;
      group.add(rim);

      // Glowing floor ring under the table (tells you it's interactable)
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(cfg.tint.replace(/rgba?\(([^)]+)\)/, (m, p) => {
          const parts = p.split(',').map(s => parseFloat(s.trim()));
          return `rgb(${parts[0]},${parts[1]},${parts[2]})`;
        })),
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.4, 48), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      ring.userData.floorRing = true;
      group.add(ring);
      group.userData.floorRing = ring;

      // Floating name plate above the table
      const nameTex = makeTableNamePlate(cfg.name, cfg.subtitle);
      const nameMat = new THREE.SpriteMaterial({
        map: nameTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(nameMat);
      sprite.scale.set(3.4, 0.85, 1);
      sprite.position.set(0, 2.5, 0);
      sprite.renderOrder = 10;
      group.add(sprite);
      group.userData.namePlate = sprite;

      // Candle / glow core — small point-ish glow above table
      const candleGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const candleMat = new THREE.MeshBasicMaterial({ color: 0x7ef0ff, transparent: true, opacity: 0.85 });
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.y = 1.7;
      group.add(candle);
      group.userData.candle = candle;

      return group;
    }

    buildDoor() {
      const group = new THREE.Group();

      // Archway frame
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0a1a24, roughness: 0.6, metalness: 0.5, emissive: 0x081624, emissiveIntensity: 0.4 });
      const side1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 1), frameMat);
      side1.position.set(-2, 3.5, 0);
      group.add(side1);
      const side2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 1), frameMat);
      side2.position.set(2, 3.5, 0);
      group.add(side2);
      // Arch top
      const archTop = new THREE.Mesh(
        new THREE.TorusGeometry(2, 0.35, 16, 48, Math.PI),
        frameMat
      );
      archTop.position.set(0, 7, 0);
      archTop.rotation.z = Math.PI;
      group.add(archTop);

      // Door glyph plane inside arch
      const glyphTex = makeDoorGlyphs();
      const glyphMat = new THREE.MeshBasicMaterial({
        map: glyphTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glyph = new THREE.Mesh(new THREE.PlaneGeometry(4, 6.5), glyphMat);
      glyph.position.set(0, 3.8, 0.05);
      group.add(glyph);
      group.userData.glyph = glyph;

      // Light beam through door (like a hint at what's beyond)
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x7ef0ff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6), beamMat);
      beam.position.set(0, 3.5, -0.05);
      beam.userData.beam = true;
      group.add(beam);
      group.userData.beam = beam;

      // Floor ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.4, 3.2, 48),
        new THREE.MeshBasicMaterial({ color: 0x7ef0ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      group.add(ring);
      group.userData.floorRing = ring;

      group.position.set(0, 0, -CHAMBER_RADIUS + 1);
      group.userData.kind = 'exit';
      group.userData.name = 'The Door';
      group.userData.subtitle = 'Requires 500 breath · Walk through';
      this.scene.add(group);
      this.door = group;
      this.interactables.push(group);
    }

    buildSirenAltar() {
      const group = new THREE.Group();

      // Low circular dais
      const dais = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.6, 0.4, 32),
        new THREE.MeshStandardMaterial({ color: 0x0a1a28, roughness: 0.55, metalness: 0.35, emissive: 0x1a0e2e, emissiveIntensity: 0.35 })
      );
      dais.position.y = 0.2;
      group.add(dais);

      // Rim of dais
      const daisRim = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.07, 16, 64),
        new THREE.MeshStandardMaterial({ color: 0x8a6ed6, roughness: 0.3, metalness: 0.8, emissive: 0x4b3a8b, emissiveIntensity: 0.6 })
      );
      daisRim.rotation.x = Math.PI / 2;
      daisRim.position.y = 0.4;
      group.add(daisRim);

      // Siren — REAL 3D mermaid mesh, not a sprite
      const sirenMesh = buildMermaid({ tier: 'soft' });
      sirenMesh.scale.setScalar(1.6);
      sirenMesh.position.set(0, 0.6, 0);
      group.add(sirenMesh);
      // Altar is at (-9, 0, 12), group rotation.y = Math.PI/6.
      // Face the casino center (0, 0, 0).
      // Direction from (-9,0,12) to (0,0,0) in world = normalize(9, 0, -12)
      // World yaw to face that direction (with default forward = +Z): atan2(14, -18)
      // Subtract group's rotation to get local: atan2(14, -18) - Math.PI/6
      sirenMesh.rotation.y = Math.atan2(14, -18) - Math.PI / 6 + Math.PI;
      group.userData.siren = sirenMesh;
      group.userData.sirenTier = 'soft';

      // Secondary halo sprite behind her (larger, very soft)
      const haloCanvas = canvas(256, 256);
      const hctx = haloCanvas.getContext('2d');
      const haloGrad = hctx.createRadialGradient(128, 128, 10, 128, 128, 128);
      haloGrad.addColorStop(0, 'rgba(199,166,255,0.6)');
      haloGrad.addColorStop(0.4, 'rgba(199,166,255,0.2)');
      haloGrad.addColorStop(1, 'rgba(199,166,255,0)');
      hctx.fillStyle = haloGrad;
      hctx.fillRect(0, 0, 256, 256);
      const haloTex = new THREE.CanvasTexture(haloCanvas);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: haloTex,
        color: 0xc7a6ff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      halo.scale.set(6, 7, 1);
      halo.position.set(0, 3, -0.1);
      group.add(halo);
      group.userData.halo = halo;

      // Candles on dais
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const candle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.07, 0.3, 10),
          new THREE.MeshStandardMaterial({ color: 0xe8e2cc, roughness: 0.9 })
        );
        candle.position.set(Math.cos(a) * 1.7, 0.55, Math.sin(a) * 1.7);
        group.add(candle);
        const flame = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xc7a6ff, transparent: true, opacity: 0.9 })
        );
        flame.position.set(Math.cos(a) * 1.7, 0.78, Math.sin(a) * 1.7);
        group.add(flame);
      }

      // Floor ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.8, 3.6, 48),
        new THREE.MeshBasicMaterial({ color: 0xc7a6ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      group.add(ring);
      group.userData.floorRing = ring;

      // Off to the left, near the entrance side
      group.position.set(-14, 0, 18);
      group.rotation.y = Math.PI / 6;
      group.userData.kind = 'siren';
      group.userData.name = 'Sit With Her';
      group.userData.subtitle = 'Lay down your breath · Stay forever';
      this.scene.add(group);
      this.sirenAltar = group;
      this.interactables.push(group);
    }

    /* Central feature — a small circular inlay of coins on the floor, flush and subtle */
    buildCentralPool() {
      const group = new THREE.Group();

      // A very shallow ring inlay — chip-sized rim in the floor
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.2, 0.04, 10, 48),
        new THREE.MeshStandardMaterial({ color: 0x8a6e30, roughness: 0.4, metalness: 0.85, emissive: 0x2a220c, emissiveIntensity: 0.3 })
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.04;
      group.add(rim);

      // Scattered coins inside the ring (instanced) — flat on the floor
      const coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.015, 14);
      const coinMat = new THREE.MeshStandardMaterial({ color: 0xb59248, roughness: 0.35, metalness: 0.9, emissive: 0x1a1206, emissiveIntensity: 0.15 });
      const coinCount = 42;
      const coins = new THREE.InstancedMesh(coinGeo, coinMat, coinCount);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < coinCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 1.05;
        dummy.position.set(Math.cos(a) * r, 0.02 + Math.random() * 0.02, Math.sin(a) * r);
        dummy.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
        const s = 0.85 + Math.random() * 0.5;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        coins.setMatrixAt(i, dummy.matrix);
      }
      group.add(coins);

      // Faint ember just above the coins, tiny
      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xb59248, transparent: true, opacity: 0.5 })
      );
      ember.position.y = 0.4;
      group.add(ember);
      group.userData.ember = ember;

      // Very soft warm light — barely perceptible, just a floor hint
      const light = new THREE.PointLight(0xb59248, 0.14, 3.5, 2.2);
      light.position.set(0, 0.8, 0);
      group.add(light);
      group.userData.light = light;

      group.position.set(0, 0, 0);
      this.scene.add(group);
      this.pool = group;
    }

    /* Scattered debris on the floor — old chips, bones, shells */
    buildFloorDebris() {
      const chipGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.02, 12);
      const chipColors = [0x8a6e30, 0xc7a6ff, 0x5be0c2, 0xff6b8a, 0x7ef0ff];
      const chipCount = 60;
      const chipMats = chipColors.map(c =>
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.55, emissive: c, emissiveIntensity: 0.05 })
      );

      for (let i = 0; i < chipCount; i++) {
        const mat = chipMats[i % chipMats.length];
        const chip = new THREE.Mesh(chipGeo, mat);
        const a = Math.random() * Math.PI * 2;
        const r = 3 + Math.random() * (CHAMBER_RADIUS - 4);
        chip.position.set(Math.cos(a) * r, 0.012, Math.sin(a) * r);
        chip.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.2, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
        this.scene.add(chip);
      }

      // Larger conch shells as accents
      const shellGeo = new THREE.SphereGeometry(0.35, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.7);
      const shellMat = new THREE.MeshStandardMaterial({ color: 0xe8e2cc, roughness: 0.8, metalness: 0.1, emissive: 0x2a2820, emissiveIntensity: 0.2 });
      for (let i = 0; i < 6; i++) {
        const shell = new THREE.Mesh(shellGeo, shellMat);
        const a = Math.random() * Math.PI * 2;
        const r = 6 + Math.random() * (CHAMBER_RADIUS - 8);
        shell.position.set(Math.cos(a) * r, 0.15, Math.sin(a) * r);
        shell.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
        this.scene.add(shell);
      }

      // Sunken statue fragment (simplified)
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.2, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 0.95, metalness: 0.1, emissive: 0x1a1814, emissiveIntensity: 0.2 })
      );
      torso.position.set(-CHAMBER_RADIUS + 6, 0.6, 8);
      torso.rotation.z = 0.3;
      torso.rotation.y = 0.9;
      this.scene.add(torso);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 0.95, metalness: 0.1, emissive: 0x1a1814, emissiveIntensity: 0.2 })
      );
      head.position.set(-CHAMBER_RADIUS + 5, 0.3, 10);
      this.scene.add(head);
    }

    /* ==================================================
       FRAGMENTS — 12 scattered story-objects on the floor.
       Accepts an initial set already-collected so they're hidden.
       ================================================== */
    buildFragments(alreadyCollected) {
      this.fragments = [];
      const collected = new Set(alreadyCollected || []);
      const FR = FRAGMENTS;
      FR.forEach(def => {
        const group = new THREE.Group();
        group.position.set(def.pos[0], def.pos[1], def.pos[2]);
        group.userData = {
          kind: 'fragment',
          fragmentId: def.id,
          name: def.title,
          subtitle: 'Pick up · add to the pieces you remember',
        };

        // Visual varies by kind — all are small enough to be subtle
        const color = def.color;
        const emissive = def.emissive;

        let mesh;
        if (def.kind === 'paper') {
          mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.42, 0.28),
            new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.5, roughness: 0.9, side: THREE.DoubleSide })
          );
          mesh.rotation.x = -Math.PI / 2;
          mesh.rotation.z = (Math.random() - 0.5) * 0.4;
        } else if (def.kind === 'metal') {
          // Small hoop / key / ring
          if (def.id === 'ring' || def.id === 'locket') {
            mesh = new THREE.Mesh(
              new THREE.TorusGeometry(0.12, 0.025, 10, 20),
              new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.45, roughness: 0.3, metalness: 0.9 })
            );
            mesh.rotation.x = Math.PI / 2;
          } else if (def.id === 'key') {
            const keyG = new THREE.Group();
            const shaft = new THREE.Mesh(
              new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
              new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.4, roughness: 0.35, metalness: 0.95 })
            );
            shaft.rotation.z = Math.PI / 2;
            keyG.add(shaft);
            const head = new THREE.Mesh(
              new THREE.TorusGeometry(0.08, 0.022, 8, 18),
              new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.4, roughness: 0.35, metalness: 0.95 })
            );
            head.position.set(-0.16, 0, 0);
            keyG.add(head);
            mesh = keyG;
          } else {
            // Pocket watch / stopped watch — disc
            mesh = new THREE.Mesh(
              new THREE.CylinderGeometry(0.14, 0.14, 0.03, 20),
              new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.4, roughness: 0.35, metalness: 0.95 })
            );
          }
        } else if (def.kind === 'glass') {
          mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.22, 12),
            new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 })
          );
        } else {
          // photo fallback
          mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.42, 0.32),
            new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.4, roughness: 0.85, side: THREE.DoubleSide })
          );
          mesh.rotation.x = -Math.PI / 2;
        }
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        group.add(mesh);

        // Hover ember just above the fragment
        const ember = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 10, 10),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        ember.position.y = 0.65;
        group.add(ember);
        group.userData.ember = ember;

        // Halo ring on the floor
        const halo = new THREE.Mesh(
          new THREE.RingGeometry(0.35, 0.55, 28),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
        );
        halo.rotation.x = -Math.PI / 2;
        halo.position.y = 0.015;
        group.add(halo);
        group.userData.halo = halo;
        group.userData.floorRing = halo;

        // If already collected, hide
        if (collected.has(def.id)) {
          group.visible = false;
        } else {
          this.interactables.push(group);
        }

        this.scene.add(group);
        this.fragments.push(group);
      });
    }

    /* Set collected state externally (hide already-collected fragments) */
    setCollectedFragments(ids) {
      const set = new Set(ids || []);
      if (!this.fragments) return;
      this.fragments.forEach(g => {
        const id = g.userData.fragmentId;
        const had = !g.visible;
        const shouldHide = set.has(id);
        g.visible = !shouldHide;
        if (shouldHide && !had) {
          // Remove from interactables
          const idx = this.interactables.indexOf(g);
          if (idx >= 0) this.interactables.splice(idx, 1);
        }
      });
    }

    /* ==================================================
       NPCs — painted figures placed around the chamber.
       ================================================== */
    buildNPCs(opts) {
      this.npcs = [];

      const addNPC = (config) => {
        const group = new THREE.Group();
        const tex = config.texture();
        const mat = new THREE.SpriteMaterial({
          map: tex,
          color: config.tint || 0xffffff,
          transparent: true,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(config.scale[0], config.scale[1], 1);
        sprite.position.set(0, config.scale[1] / 2 + 0.2, 0);
        group.add(sprite);
        group.userData.sprite = sprite;

        // Halo aura
        const haloC = canvas(128, 128);
        const hctx = haloC.getContext('2d');
        const hg = hctx.createRadialGradient(64, 64, 4, 64, 64, 62);
        hg.addColorStop(0, `rgba(${config.haloRgb},0.55)`);
        hg.addColorStop(0.5, `rgba(${config.haloRgb},0.18)`);
        hg.addColorStop(1, `rgba(${config.haloRgb},0)`);
        hctx.fillStyle = hg;
        hctx.fillRect(0, 0, 128, 128);
        const haloTex = new THREE.CanvasTexture(haloC);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
          map: haloTex,
          color: config.haloColor || 0xffffff,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.7,
        }));
        halo.scale.set(config.scale[0] * 2.2, config.scale[1] * 1.35, 1);
        halo.position.set(0, config.scale[1] / 2 + 0.2, -0.1);
        group.add(halo);
        group.userData.halo = halo;

        // Floor ring
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.9, 1.3, 32),
          new THREE.MeshBasicMaterial({ color: config.haloColor || 0xffffff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.015;
        group.add(ring);
        group.userData.floorRing = ring;

        // Point light at NPC
        if (config.light) {
          const pl = new THREE.PointLight(config.haloColor, 0.45, 6, 2);
          pl.position.set(0, 1.6, 0);
          group.add(pl);
        }

        group.position.set(config.pos[0], 0, config.pos[2]);
        group.userData.kind = config.kind;
        group.userData.name = config.name;
        group.userData.subtitle = config.subtitle;
        group.userData.npcId = config.id;
        group.userData.basePhase = Math.random() * Math.PI * 2;

        this.scene.add(group);
        this.npcs.push(group);
        this.interactables.push(group);
      };

      // The Gambler — a translucent woman near the far poker table
      addNPC({
        id: 'gambler',
        kind: 'npc',
        name: 'The Gambler',
        subtitle: 'She has been here a long time.',
        pos: [12, 0, -4],
        scale: [2.1, 4.4],
        tint: 0xb2d8d0,
        haloRgb: '91,224,194',
        haloColor: 0x5be0c2,
        light: true,
        texture: makeGamblerTexture,
      });

      // The Muse — near the stained glass (which is over the door)
      addNPC({
        id: 'muse',
        kind: 'npc',
        name: 'The Muse',
        subtitle: 'She sells memories for breath.',
        pos: [-12, 0, -4],
        scale: [2.0, 4.2],
        tint: 0xffc8d2,
        haloRgb: '255,107,138',
        haloColor: 0xff6b8a,
        light: true,
        texture: makeMuseTexture,
      });

      // The Mirror — initially hidden; appears at high breath; placed near pool
      addNPC({
        id: 'mirror',
        kind: 'npc',
        name: 'The Mirror',
        subtitle: 'A woman wearing your winnings.',
        pos: [0, 0, 3.5],
        scale: [2.2, 4.5],
        tint: 0xd8c8ff,
        haloRgb: '199,166,255',
        haloColor: 0xc7a6ff,
        light: true,
        texture: makeMirrorTexture,
      });
      this.mirrorNpc = this.npcs[this.npcs.length - 1];
      // Replace the Mirror's sprite with a 3D mermaid (gold + violet palette)
      {
        if (this.mirrorNpc.userData.sprite) this.mirrorNpc.userData.sprite.visible = false;
        const mirrorMesh = buildMermaid({
          tier: 'soft',
          skinHex: '#f4dac0', skinTint: 0xf4dac0,
          tailHex: '#b59248', tailTint: 0xb59248, scaleHex: '#e8d4a4',
          hairColor: 0xc7a6ff, eyeColor: 0xffc870,
        });
        mirrorMesh.scale.setScalar(1.4);
        mirrorMesh.position.y = 0.3;
        mirrorMesh.rotation.y = Math.PI + Math.PI; // face +Z of the chamber (toward player)
        this.mirrorNpc.add(mirrorMesh);
        this.mirrorNpc.userData.mesh3d = mirrorMesh;
      }
      this.mirrorNpc.visible = false;
      // Remove from interactables until revealed
      const mirrorIdx = this.interactables.indexOf(this.mirrorNpc);
      if (mirrorIdx >= 0) this.interactables.splice(mirrorIdx, 1);

      // The Drowned Chorus — 4 translucent figures behind kelp, near wall
      this.chorus = [];
      for (let i = 0; i < 4; i++) {
        const a = (i - 1.5) * 0.28 + Math.PI * 1.08; // cluster behind
        const r = CHAMBER_RADIUS - 5;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const mat = new THREE.SpriteMaterial({
          map: makeChorusFigureTexture(i),
          color: 0xc7a6ff,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        });
        const s = new THREE.Sprite(mat);
        s.scale.set(1.6, 3.4, 1);
        s.position.set(x, 2.0, z);
        s.userData = { kind: 'chorus', basePhase: Math.random() * Math.PI * 2, baseX: x, baseZ: z };
        this.scene.add(s);
        this.chorus.push(s);
      }

      // Kelp in front of chorus — vertical ribbons
      for (let i = 0; i < 18; i++) {
        const a = Math.PI * 1.08 + (Math.random() - 0.5) * 0.9;
        const r = CHAMBER_RADIUS - 7 + Math.random() * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const kelp = new THREE.Mesh(
          new THREE.PlaneGeometry(0.22, 5 + Math.random() * 2),
          new THREE.MeshStandardMaterial({
            color: 0x1a3a22,
            emissive: 0x0a1a10,
            emissiveIntensity: 0.3,
            roughness: 0.95,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          })
        );
        kelp.position.set(x, 2.6, z);
        kelp.rotation.y = Math.random() * Math.PI;
        kelp.rotation.z = (Math.random() - 0.5) * 0.1;
        kelp.userData = { kind: 'kelp', basePhase: Math.random() * Math.PI * 2, baseRotZ: kelp.rotation.z };
        this.scene.add(kelp);
        this.chorus.push(kelp); // reuse array for animation
      }
    }

    revealMirror() {
      if (!this.mirrorNpc || this.mirrorNpc.visible) return;
      this.mirrorNpc.visible = true;
      this.interactables.push(this.mirrorNpc);
    }

    /* Sunken grand piano — leans against the east wall, half-collapsed */
    buildSunkenPiano() {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0a0604, roughness: 0.85, metalness: 0.3, emissive: 0x0a1414, emissiveIntensity: 0.08 });
      // Main cabinet
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.0, 1.2), bodyMat);
      cabinet.position.y = 0.5;
      group.add(cabinet);
      // Lid — open, tilted
      const lid = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 1.3), bodyMat);
      lid.position.set(0, 1.1, -0.05);
      lid.rotation.x = -0.4;
      group.add(lid);
      // Legs (one broken)
      for (let i = 0; i < 3; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 8), bodyMat);
        const positions = [[-1.2, 0, 0.45], [1.2, 0, 0.45], [-1.2, 0, -0.45]]; // 4th leg broken off
        leg.position.set(positions[i][0], 0.45, positions[i][2]);
        group.add(leg);
      }
      // Keys — a row of white sticks with black between
      for (let i = -10; i <= 10; i++) {
        const key = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.03, 0.4),
          new THREE.MeshStandardMaterial({ color: 0xe8e2cc, roughness: 0.65, metalness: 0.05, emissive: 0x1a1814, emissiveIntensity: 0.2 })
        );
        key.position.set(i * 0.13, 1.01, 0.4);
        group.add(key);
      }
      // Scattered black keys (sharps)
      for (let i = -10; i <= 10; i += 2) {
        if (i === 0 || i === 7 || i === -7) continue;
        const k = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.04, 0.22),
          new THREE.MeshStandardMaterial({ color: 0x0e0e12, roughness: 0.5, metalness: 0.1 })
        );
        k.position.set(i * 0.13 + 0.06, 1.045, 0.25);
        group.add(k);
      }

      // Seaweed growing on it
      const seaweedMat = new THREE.MeshStandardMaterial({
        color: 0x1a3a22, emissive: 0x0a1a10, emissiveIntensity: 0.25,
        roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.85,
      });
      for (let i = 0; i < 6; i++) {
        const strand = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.3 + Math.random() * 0.8), seaweedMat);
        strand.position.set(-1.3 + Math.random() * 2.6, 0.6 + Math.random() * 0.8, -0.45 + Math.random() * 0.3);
        strand.rotation.y = Math.random() * Math.PI;
        group.add(strand);
      }

      // Place along east wall, facing inward, tilted
      group.position.set(CHAMBER_RADIUS - 3.5, 0, -5);
      group.rotation.y = -Math.PI * 0.5 - 0.12;
      group.rotation.z = 0.08;
      this.scene.add(group);
      this.piano = group;
    }

    /* The Ledger — a hanging parchment scroll. Interactable. */
    buildLedgerScroll() {
      const group = new THREE.Group();

      // Parchment texture
      const c = canvas(256, 768);
      const ctx = c.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 768);
      grad.addColorStop(0, '#e8d4a4');
      grad.addColorStop(0.5, '#d8bf85');
      grad.addColorStop(1, '#b59248');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 768);
      // Stains
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(80,50,20,${0.06 + Math.random() * 0.1})`;
        const r = 8 + Math.random() * 24;
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 768, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Handwriting lines — fake cursive scribble
      ctx.strokeStyle = 'rgba(40,24,10,0.6)';
      ctx.lineWidth = 1;
      for (let row = 0; row < 40; row++) {
        const y = 80 + row * 16;
        let x = 30;
        ctx.beginPath();
        ctx.moveTo(x, y);
        while (x < 226) {
          x += 3 + Math.random() * 6;
          ctx.lineTo(x, y + (Math.random() - 0.5) * 3);
        }
        ctx.stroke();
      }
      // Title
      ctx.font = 'bold 24px "Cinzel", serif';
      ctx.fillStyle = 'rgba(40,20,8,0.92)';
      ctx.textAlign = 'center';
      ctx.fillText('THE LEDGER', 128, 44);
      ctx.font = 'italic 12px "Cormorant Garamond", serif';
      ctx.fillText('Every choice · in ink', 128, 62);
      // Seal at bottom
      ctx.fillStyle = 'rgba(139,30,44,0.82)';
      ctx.beginPath();
      ctx.arc(128, 720, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 12px "Cinzel", serif';
      ctx.fillStyle = 'rgba(232,226,204,0.9)';
      ctx.fillText('ABYSS', 128, 724);

      const tex = new THREE.CanvasTexture(c);

      // Parchment mesh — slight cylinder curve for the "hanging scroll" feel
      const parchment = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 3.2, 24, 1, true, -0.55, 1.1),
        new THREE.MeshStandardMaterial({
          map: tex,
          emissive: 0x2a1a08,
          emissiveIntensity: 0.45,
          roughness: 0.85,
          side: THREE.DoubleSide,
        })
      );
      parchment.rotation.y = Math.PI;
      parchment.position.y = 2.8;
      group.add(parchment);

      // Top and bottom rods
      const rodMat = new THREE.MeshStandardMaterial({ color: 0x2a1808, metalness: 0.3, roughness: 0.65, emissive: 0x1a0e05, emissiveIntensity: 0.3 });
      const rodTop = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 12), rodMat);
      rodTop.rotation.z = Math.PI / 2;
      rodTop.position.set(0, 4.4, 0);
      group.add(rodTop);
      const rodBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 12), rodMat);
      rodBottom.rotation.z = Math.PI / 2;
      rodBottom.position.set(0, 1.2, 0);
      group.add(rodBottom);

      // Cap knobs on rods — gold
      const capMat = new THREE.MeshStandardMaterial({ color: 0xb59248, metalness: 0.9, roughness: 0.3, emissive: 0x4a3a18, emissiveIntensity: 0.5 });
      [-1.2, 1.2].forEach(x => {
        const capT = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), capMat);
        capT.position.set(x, 4.4, 0);
        group.add(capT);
        const capB = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), capMat);
        capB.position.set(x, 1.2, 0);
        group.add(capB);
      });

      // Hanging chain
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x4a3a18, metalness: 0.7, roughness: 0.5 });
      [-1.0, 1.0].forEach(x => {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.0, 8), chainMat);
        chain.position.set(x, 5.4, 0);
        group.add(chain);
      });

      // Floor ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.3, 32),
        new THREE.MeshBasicMaterial({ color: 0xb59248, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      group.add(ring);
      group.userData.floorRing = ring;

      // Warm local light
      const light = new THREE.PointLight(0xb59248, 0.7, 6, 2);
      light.position.set(0, 3, 0.8);
      group.add(light);

      // Place on the back-left wall, facing inward
      group.position.set(-CHAMBER_RADIUS + 1.5, 0, -10);
      group.rotation.y = Math.PI / 2;
      group.userData.kind = 'ledger';
      group.userData.name = 'The Ledger';
      group.userData.subtitle = 'Every choice you made · press E to read';
      this.interactables.push(group);
      this.scene.add(group);
      this.ledgerScroll = group;
    }

    /* Floating prayer candles — cluster above the Siren altar */
    buildFloatingCandles() {
      this.prayerCandles = [];
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 2.5 + Math.random() * 1.8;
        const flameC = canvas(64, 128);
        const fctx = flameC.getContext('2d');
        // Candle body
        fctx.fillStyle = 'rgba(232,226,204,0.88)';
        fctx.fillRect(26, 60, 12, 60);
        // Flame
        const fg = fctx.createRadialGradient(32, 48, 4, 32, 48, 28);
        fg.addColorStop(0, 'rgba(255,240,200,1)');
        fg.addColorStop(0.35, 'rgba(255,180,100,0.9)');
        fg.addColorStop(0.7, 'rgba(255,90,60,0.4)');
        fg.addColorStop(1, 'rgba(255,90,60,0)');
        fctx.fillStyle = fg;
        fctx.beginPath();
        fctx.ellipse(32, 48, 10, 20, 0, 0, Math.PI * 2);
        fctx.fill();
        const tex = new THREE.CanvasTexture(flameC);
        const mat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(0.25, 0.5, 1);
        sprite.position.set(
          (this.sirenAltar ? this.sirenAltar.position.x : 0) + Math.cos(a) * r,
          1.5 + Math.random() * 2.2,
          (this.sirenAltar ? this.sirenAltar.position.z : 0) + Math.sin(a) * r
        );
        sprite.userData = {
          baseY: sprite.position.y,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.4,
        };
        this.scene.add(sprite);
        this.prayerCandles.push(sprite);
      }
    }

    /* ==================================================
       STAINED GLASS — above the door, re-colors with runtime state
       ================================================== */
    buildStainedGlass() {
      const tex = makeStainedGlassTexture();
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.5), mat);
      glass.position.set(0, 9.5, -CHAMBER_RADIUS + 1.1);
      this.scene.add(glass);
      this.stainedGlass = glass;

      // Back-light
      const glassLight = new THREE.PointLight(0xc7a6ff, 0.9, 15, 2);
      glassLight.position.set(0, 9.5, -CHAMBER_RADIUS + 0.5);
      this.scene.add(glassLight);
      this.stainedGlassLight = glassLight;
    }

    buildAmbience() {
      // Drifting motes as animated points
      const count = 420;
      const positions = new Float32Array(count * 3);
      const phases = new Float32Array(count);
      const speeds = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const r = Math.random() * (CHAMBER_RADIUS + 2);
        const a = Math.random() * Math.PI * 2;
        positions[i*3]     = Math.cos(a) * r;
        positions[i*3+1]   = Math.random() * (WALL_HEIGHT - 2) + 0.3;
        positions[i*3+2]   = Math.sin(a) * r;
        phases[i] = Math.random() * Math.PI * 2;
        speeds[i] = 0.15 + Math.random() * 0.5;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      this.motePhases = phases;
      this.moteSpeeds = speeds;
      const mat = new THREE.PointsMaterial({
        color: 0x7ef0ff,
        size: 0.09,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        depthWrite: false,
      });
      this.motes = new THREE.Points(geo, mat);
      this.scene.add(this.motes);

      // God-ray tilted planes descending from above
      const rayTex = makeRayTexture();
      const rayMat = new THREE.MeshBasicMaterial({
        map: rayTex,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.rays = [];
      for (let i = 0; i < 7; i++) {
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 16), rayMat);
        const a = (i / 7) * Math.PI * 2;
        ray.position.set(Math.cos(a) * (3 + Math.random() * 8), 7, Math.sin(a) * (3 + Math.random() * 8));
        ray.rotation.z = (Math.random() - 0.5) * 0.3;
        ray.rotation.y = Math.random() * Math.PI;
        ray.userData.baseY = ray.position.y;
        ray.userData.phase = Math.random() * Math.PI * 2;
        this.rays.push(ray);
        this.scene.add(ray);
      }

      // Rising bubbles (sprite cloud)
      const bubbleTex = makeBubbleTexture();
      const bubbleCount = 48;
      this.bubbles = [];
      for (let i = 0; i < bubbleCount; i++) {
        const mat = new THREE.SpriteMaterial({
          map: bubbleTex,
          transparent: true,
          opacity: 0.35 + Math.random() * 0.25,
          depthWrite: false,
          blending: THREE.NormalBlending,
        });
        const s = new THREE.Sprite(mat);
        const scale = 0.15 + Math.random() * 0.35;
        s.scale.set(scale, scale, 1);
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * (CHAMBER_RADIUS - 1);
        s.position.set(Math.cos(a) * r, -0.5 + Math.random() * WALL_HEIGHT, Math.sin(a) * r);
        s.userData = {
          speed: 0.4 + Math.random() * 0.9,
          wiggleAmp: 0.2 + Math.random() * 0.3,
          wigglePhase: Math.random() * Math.PI * 2,
          baseX: s.position.x,
          baseZ: s.position.z,
        };
        this.bubbles.push(s);
        this.scene.add(s);
      }

      // Distant silhouette fish (sprite drifting through)
      const fishC = canvas(128, 64);
      const fctx = fishC.getContext('2d');
      fctx.fillStyle = 'rgba(10,26,43,0.9)';
      fctx.beginPath();
      fctx.moveTo(8, 32);
      fctx.quadraticCurveTo(40, 18, 96, 28);
      fctx.lineTo(120, 20);
      fctx.lineTo(120, 44);
      fctx.lineTo(96, 36);
      fctx.quadraticCurveTo(40, 46, 8, 32);
      fctx.closePath();
      fctx.fill();
      const fishTex = new THREE.CanvasTexture(fishC);
      const fishMat = new THREE.SpriteMaterial({ map: fishTex, transparent: true, opacity: 0.45, depthWrite: false });
      this.fish = [];
      for (let i = 0; i < 3; i++) {
        const f = new THREE.Sprite(fishMat.clone());
        f.scale.set(2.4, 1.2, 1);
        f.position.set(-CHAMBER_RADIUS - 2 - i*4, 6 + Math.random()*4, (Math.random() - 0.5) * 20);
        f.userData = { speed: 0.35 + Math.random() * 0.3, startZ: f.position.z };
        this.fish.push(f);
        this.scene.add(f);
      }
    }

    buildPostFX() {
      // EffectComposer + passes are imported at the top of this module.
      const composer = new EffectComposer(this.renderer);
      composer.addPass(new RenderPass(this.scene, this.camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(this.container.clientWidth || 1024, this.container.clientHeight || 768),
        0.55, // strength — softer so scene doesn't wash out
        0.75, // radius
        0.35  // threshold — raise so only the brightest emissives bloom
      );
      composer.addPass(bloom);

      // Underwater distortion — subtle RGB split + gentle sine wobble
      const underwaterShader = {
        uniforms: {
          tDiffuse: { value: null },
          uTime:    { value: 0 },
          uStrength:{ value: 0.0028 },
          uPanic:   { value: 0.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float uTime;
          uniform float uStrength;
          uniform float uPanic;
          varying vec2 vUv;

          void main() {
            // Subtle sine wobble, two frequencies crossed
            float wx = sin(vUv.y * 38.0 + uTime * 1.3) * uStrength;
            float wy = cos(vUv.x * 34.0 + uTime * 1.05) * uStrength * 0.7;
            vec2 uv = vUv + vec2(wx, wy);

            // RGB split — stronger at edges + scaled by panic
            float edge = smoothstep(0.35, 0.95, length(uv - 0.5));
            float split = (0.0012 + edge * 0.004) * (1.0 + uPanic * 3.0);
            vec4 r = texture2D(tDiffuse, uv + vec2(split, 0.0));
            vec4 g = texture2D(tDiffuse, uv);
            vec4 b = texture2D(tDiffuse, uv - vec2(split, 0.0));
            gl_FragColor = vec4(r.r, g.g, b.b, 1.0);
          }
        `,
      };
      const distortPass = new ShaderPass(underwaterShader);
      composer.addPass(distortPass);
      this.distortPass = distortPass;

      this.composer = composer;
      this.bloom = bloom;
    }

    bindInput() {
      this.onKeyDown = (e) => {
        this.keys[e.code] = true;
        if (e.code === 'KeyE' && this.controls.isLocked) {
          this.tryInteract();
          e.preventDefault();
        }
      };
      this.onKeyUp = (e) => {
        this.keys[e.code] = false;
      };
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
    }

    requestLock() {
      if (!this.controls.isLocked) this.controls.lock();
    }

    tryInteract() {
      if (!this.activeInteract) return;
      const obj = this.activeInteract;
      const kind = obj.userData.kind;
      if (kind === 'table') {
        this.emit('interact', obj.userData.key);
      } else if (kind === 'exit') {
        this.emit('exit');
      } else if (kind === 'siren') {
        this.emit('siren');
      } else if (kind === 'fragment') {
        this.emit('fragment', obj.userData.fragmentId);
        obj.visible = false;
        const idx = this.interactables.indexOf(obj);
        if (idx >= 0) this.interactables.splice(idx, 1);
        this.activeInteract = null;
        this.emit('prompt', null);
      } else if (kind === 'npc') {
        this.emit('npc', obj.userData.npcId);
      } else if (kind === 'merchant') {
        this.emit('merchant');
      } else if (kind === 'charmkeeper') {
        this.emit('charmkeeper');
      } else if (kind === 'confessor') {
        this.emit('confessor');
      } else if (kind === 'portal') {
        this.emit('portal', obj.userData.targetRoom);
      } else if (kind === 'ledger') {
        this.emit('ledger');
      }
    }

    updateInteract() {
      // Closest interactable within INTERACT_RANGE
      const camPos = this.controls.getObject().position;
      let closest = null;
      let closestDist = INTERACT_RANGE;
      this.interactables.forEach(obj => {
        const d = camPos.distanceTo(obj.position);
        if (d < closestDist) {
          closestDist = d;
          closest = obj;
        }
      });

      // Update floor ring highlight
      this.interactables.forEach(obj => {
        if (obj.userData.floorRing) {
          obj.userData.floorRing.material.opacity = obj === closest ? 0.4 : 0.16;
        }
      });

      if (closest !== this.activeInteract) {
        this.activeInteract = closest;
        this.emit('prompt', closest ? {
          name: closest.userData.name,
          subtitle: closest.userData.subtitle,
          kind: closest.userData.kind,
        } : null);
      }
    }

    updateMotion(dt) {
      if (!this.controls.isLocked || this.paused) {
        // Decay velocity
        this.velocity.multiplyScalar(0.85);
        return;
      }

      const target = new THREE.Vector3();
      const running = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];
      const speed = running ? PLAYER_RUN : PLAYER_SPEED;

      if (this.keys['KeyW'] || this.keys['ArrowUp']) target.z -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) target.z += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) target.x -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) target.x += 1;
      if (target.lengthSq() > 0) target.normalize().multiplyScalar(speed);

      // Smooth acceleration toward target
      this.velocity.x += (target.x - this.velocity.x) * Math.min(1, dt * 8);
      this.velocity.z += (target.z - this.velocity.z) * Math.min(1, dt * 8);

      this.controls.moveRight(this.velocity.x * dt);
      this.controls.moveForward(-this.velocity.z * dt);

      // Clamp to room bounds
      const p = this.controls.getObject().position;
      if (this.currentRoom === 'casino') {
        const r = Math.sqrt(p.x*p.x + p.z*p.z);
        const maxR = CHAMBER_RADIUS - 1.6;
        if (r > maxR) {
          p.x = p.x / r * maxR;
          p.z = p.z / r * maxR;
        }
      } else if (this.currentRoom === 'pawnshop') {
        const maxX = 18/2 - 1.0, maxZ = 14/2 - 1.0;
        if (p.x > maxX) p.x = maxX; if (p.x < -maxX) p.x = -maxX;
        if (p.z > maxZ) p.z = maxZ; if (p.z < -maxZ) p.z = -maxZ;
      } else if (this.currentRoom === 'dressing') {
        const maxX = 16/2 - 1.0, maxZ = 13/2 - 1.0;
        if (p.x > maxX) p.x = maxX; if (p.x < -maxX) p.x = -maxX;
        if (p.z > maxZ) p.z = maxZ; if (p.z < -maxZ) p.z = -maxZ;
      }

      // Push-away collision with tables, door, Siren altar, merchants, portals
      const collisionRadii = {
        table: 1.55,
        exit: 2.0,
        siren: 2.4,
        merchant: 1.6,
        charmkeeper: 1.6,
        portal: 0.0, // portals pass-through; collision only on the frame would be weird
      };
      this.interactables.forEach(obj => {
        const cr = collisionRadii[obj.userData.kind] || 1.5;
        const dx = p.x - obj.position.x;
        const dz = p.z - obj.position.z;
        const d = Math.sqrt(dx*dx + dz*dz);
        if (d < cr && d > 0.001) {
          p.x = obj.position.x + dx / d * cr;
          p.z = obj.position.z + dz / d * cr;
        }
      });

      // Collide with central coin ring (small footprint)
      if (this.pool) {
        const dx = p.x - this.pool.position.x;
        const dz = p.z - this.pool.position.z;
        const d = Math.sqrt(dx*dx + dz*dz);
        if (d < 1.35 && d > 0.001) {
          p.x = this.pool.position.x + dx / d * 1.35;
          p.z = this.pool.position.z + dz / d * 1.35;
        }
      }

      // Camera bob — stronger when moving
      const moving = this.velocity.lengthSq() > 0.5;
      const prevBobT = this.bobT;
      this.bobT += dt * (moving ? (running ? 8 : 5.5) : 1.4);
      const bobAmt = moving ? (running ? 0.08 : 0.05) : 0.02;
      p.y = PLAYER_HEIGHT + Math.sin(this.bobT) * bobAmt;

      // Footstep — trigger when bob crosses a zero-downswing peak
      if (moving) {
        const prevSin = Math.sin(prevBobT);
        const currSin = Math.sin(this.bobT);
        if (prevSin > 0 && currSin <= 0 && typeof window.__trappedAudio !== 'undefined' && window.__trappedAudio && window.__trappedAudio.playFootstep) {
          window.__trappedAudio.playFootstep(running ? 1.0 : 0.6);
        }
      }

      // Swim sway — small x-z drift on the camera rig
      this.swimT += dt * 0.6;
    }

    updateAmbience(dt, now) {
      // Motes subtle drift + upward
      if (this.motes) {
        const pos = this.motes.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const phase = this.motePhases[i];
          const speed = this.moteSpeeds[i];
          pos.array[i*3]   += Math.sin(now * 0.0004 + phase) * dt * 0.15;
          pos.array[i*3+1] += speed * dt * 0.4;
          pos.array[i*3+2] += Math.cos(now * 0.0004 + phase) * dt * 0.15;
          if (pos.array[i*3+1] > WALL_HEIGHT) {
            pos.array[i*3+1] = 0.2;
            pos.array[i*3]   = (Math.random() - 0.5) * CHAMBER_RADIUS * 1.8;
            pos.array[i*3+2] = (Math.random() - 0.5) * CHAMBER_RADIUS * 1.8;
          }
        }
        pos.needsUpdate = true;
      }

      // Caustic shader — drive time uniform
      if (this.causticMat && this.causticMat.uniforms) {
        this.causticMat.uniforms.uTime.value = now * 0.001;
        this.causticMat.uniforms.uIntensity.value = 0.9 + Math.sin(now * 0.0008) * 0.18;
      }

      // Rays shimmer
      this.rays.forEach((ray, i) => {
        const phase = ray.userData.phase;
        ray.material.opacity = 0.28 + Math.sin(now * 0.0008 + phase) * 0.12;
        ray.position.y = ray.userData.baseY + Math.sin(now * 0.0005 + phase) * 0.3;
      });

      // Bubbles rise
      this.bubbles.forEach(b => {
        b.position.y += b.userData.speed * dt;
        b.position.x = b.userData.baseX + Math.sin(now * 0.001 + b.userData.wigglePhase) * b.userData.wiggleAmp;
        b.position.z = b.userData.baseZ + Math.cos(now * 0.001 + b.userData.wigglePhase) * b.userData.wiggleAmp * 0.4;
        if (b.position.y > WALL_HEIGHT + 1) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * (CHAMBER_RADIUS - 1);
          b.position.y = -0.8;
          b.userData.baseX = Math.cos(a) * r;
          b.userData.baseZ = Math.sin(a) * r;
        }
      });

      // Fish drift across
      this.fish.forEach((f, i) => {
        f.position.x += f.userData.speed * dt;
        if (f.position.x > CHAMBER_RADIUS + 4) {
          f.position.x = -CHAMBER_RADIUS - 4;
          f.position.z = (Math.random() - 0.5) * 20;
          f.position.y = 5 + Math.random() * 5;
        }
      });

      // Siren float + scale breath
      if (this.sirenAltar && this.sirenAltar.userData.siren) {
        const s = this.sirenAltar.userData.siren;
        // 3D mesh rig — breathing + sway + head track
        s.position.y = 0.6 + Math.sin(now * 0.0012) * 0.04;
        const bones = s.userData.bones;
        if (bones) {
          // Torso sway
          if (bones.hips) {
            bones.hips.rotation.z = Math.sin(now * 0.001) * 0.04;
            bones.hips.rotation.y = Math.sin(now * 0.0006) * 0.06;
          }
          // Head track toward player (cam position), constrained
          if (bones.head && this.controls) {
            const camPos = this.controls.getObject().position;
            const local = s.worldToLocal(camPos.clone());
            const targetYaw = Math.atan2(local.x, local.z) + Math.PI;
            const targetPitch = Math.atan2(local.y - 1.14, Math.sqrt(local.x*local.x + local.z*local.z));
            bones.head.rotation.y = targetYaw * 0.3;
            bones.head.rotation.x = -targetPitch * 0.25;
          }
          // Tail swish
          if (bones.tail) {
            bones.tail.rotation.z = Math.sin(now * 0.0013) * 0.1;
            bones.tail.rotation.x = Math.sin(now * 0.0009) * 0.03;
          }
          if (bones.fluke) {
            bones.fluke.rotation.z = Math.sin(now * 0.0013 + 0.3) * 0.25;
          }
          // Hair strands sway
          if (bones.hairStrands) {
            bones.hairStrands.forEach((strand, i) => {
              const p = strand.userData.basePhase;
              strand.rotation.y = Math.sin(now * 0.0008 + p) * 0.08;
              strand.rotation.x = Math.sin(now * 0.0011 + p) * 0.05;
            });
          }
          // Arms float
          if (bones.shoulderL) bones.shoulderL.rotation.z = 0.2 + Math.sin(now * 0.001) * 0.05;
          if (bones.shoulderR) bones.shoulderR.rotation.z = -0.2 - Math.sin(now * 0.001 + 1) * 0.05;
        }

        const halo = this.sirenAltar.userData.halo;
        if (halo) {
          const haloScale = 1 + Math.sin(now * 0.0008) * 0.05;
          halo.scale.set(6 * haloScale, 7 * haloScale, 1);
          halo.material.opacity = 0.65 + Math.sin(now * 0.0016) * 0.15;
        }
      }

      // Table candles flicker
      this.tables.forEach((t, i) => {
        if (t.userData.candle) {
          t.userData.candle.material.opacity = 0.72 + Math.sin(now * 0.004 + i) * 0.22;
        }
        if (t.userData.namePlate) {
          // Billboard always faces camera (sprites do this automatically)
          t.userData.namePlate.material.opacity = 0.85 + Math.sin(now * 0.001 + i) * 0.1;
        }
      });

      // Door beam pulse
      if (this.door && this.door.userData.beam) {
        this.door.userData.beam.material.opacity = 0.24 + Math.sin(now * 0.0015) * 0.1;
      }

      // Pool ember hover + light pulse (subtle)
      if (this.pool) {
        if (this.pool.userData.ember) {
          this.pool.userData.ember.position.y = 0.4 + Math.sin(now * 0.002) * 0.06;
          this.pool.userData.ember.material.opacity = 0.35 + Math.sin(now * 0.004) * 0.12;
        }
        if (this.pool.userData.light) {
          this.pool.userData.light.intensity = 0.12 + Math.sin(now * 0.001) * 0.05;
        }
      }

      // Fragments — ember pulse
      if (this.fragments) {
        this.fragments.forEach((g, i) => {
          if (!g.visible) return;
          if (g.userData.ember) {
            g.userData.ember.position.y = 0.65 + Math.sin(now * 0.003 + i) * 0.08;
            g.userData.ember.material.opacity = 0.45 + Math.sin(now * 0.005 + i) * 0.2;
          }
          if (g.userData.halo) {
            g.userData.halo.material.opacity = 0.15 + Math.sin(now * 0.002 + i * 0.3) * 0.08;
          }
        });
      }

      // NPCs — float + breath
      if (this.npcs) {
        this.npcs.forEach(g => {
          if (!g.visible) return;
          const s = g.userData.sprite;
          if (s) {
            s.position.y = s.scale.y / 2 + 0.2 + Math.sin(now * 0.0012 + g.userData.basePhase) * 0.15;
            const pulse = 1 + Math.sin(now * 0.0009 + g.userData.basePhase) * 0.018;
            // Don't mess with visibility toggling when re-scaling; keep scale ratio
            const baseY = s.userData.baseY || s.scale.y;
          }
          if (g.userData.halo) {
            g.userData.halo.material.opacity = 0.55 + Math.sin(now * 0.0014 + g.userData.basePhase) * 0.2;
          }
          if (g.userData.floorRing) {
            g.userData.floorRing.material.opacity = 0.18 + Math.sin(now * 0.0018 + g.userData.basePhase) * 0.08;
          }
        });
      }

      // Drowned chorus + kelp — swaying + react to player proximity
      const camPos = this.controls ? this.controls.getObject().position : null;
      if (this.chorus) {
        this.chorus.forEach((c, i) => {
          if (c.userData.kind === 'chorus') {
            c.position.y = 2.0 + Math.sin(now * 0.0009 + c.userData.basePhase) * 0.22;
            // Proximity — brief solidification when player close
            let prox = 0;
            if (camPos) {
              const d = camPos.distanceTo(c.position);
              prox = Math.max(0, 1 - d / 8);
            }
            c.material.opacity = 0.25 + Math.sin(now * 0.0013 + c.userData.basePhase) * 0.12 + prox * 0.5;
            c.scale.x = 1.6 + prox * 0.15;
            c.scale.y = 3.4 + prox * 0.3;
          } else if (c.userData.kind === 'kelp') {
            c.rotation.z = (c.userData.baseRotZ || 0) + Math.sin(now * 0.0007 + c.userData.basePhase) * 0.08;
          }
        });
      }

      // Stained glass — back-light gently pulses
      if (this.stainedGlassLight) {
        this.stainedGlassLight.intensity = 0.8 + Math.sin(now * 0.0009) * 0.25;
      }

      // Prayer candles above the Siren altar — float and flicker
      if (this.prayerCandles) {
        this.prayerCandles.forEach((c) => {
          c.position.y = c.userData.baseY + Math.sin(now * 0.001 * c.userData.speed + c.userData.phase) * 0.14;
          c.material.opacity = 0.7 + Math.sin(now * 0.008 + c.userData.phase) * 0.25;
        });
      }

      // Incense smoke in the Confessional
      if (this.incenseSmoke) {
        this.incenseSmoke.forEach(s => {
          s.position.y += s.userData.speed * dt;
          s.position.x += Math.sin(now * 0.001 + s.userData.phase) * dt * 0.1;
          s.material.opacity = Math.max(0, 0.3 - (s.position.y - s.userData.baseY) / 3.5);
          if (s.position.y > s.userData.baseY + 3) {
            s.position.y = s.userData.baseY;
            s.position.x = -1.8 + (Math.random() - 0.5) * 0.3;
          }
        });
      }

      // Pawn shop dust — slow swirl
      if (this.pawnDust) {
        const pos = this.pawnDust.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          pos.array[i*3+1] -= dt * 0.08;
          pos.array[i*3]   += Math.sin(now * 0.0004 + i) * dt * 0.06;
          pos.array[i*3+2] += Math.cos(now * 0.0003 + i) * dt * 0.06;
          if (pos.array[i*3+1] < 0) pos.array[i*3+1] = 6.5;
        }
        pos.needsUpdate = true;
      }

      // Vegas rope-lights twinkle + marquee bulb chase + neon flicker
      if (this.ropeLights) {
        this.ropeLights.forEach(p => {
          const t = now * 0.002 + p.userData.basePhase;
          p.material.opacity = 0.55 + Math.sin(t) * 0.4;
        });
      }
      if (this.marqueeBulbs) {
        const chaseSpeed = 0.005;
        this.marqueeBulbs.forEach((b, i) => {
          const phase = now * chaseSpeed + b.userData.basePhase;
          b.material.opacity = 0.3 + Math.max(0, Math.sin(phase)) * 0.7;
        });
      }
      // Chandelier slow sway
      if (this.chandelier) {
        this.chandelier.rotation.y = Math.sin(now * 0.0004) * 0.05;
        this.chandelier.position.y = (WALL_HEIGHT - 1.5) + Math.sin(now * 0.001) * 0.08;
      }
      // Central stage — rotating showgirl mermaid, chasing marquee bulbs, pulsing spotlights
      if (this.centralStage) {
        const dancer = this.centralStage.userData.dancer;
        if (dancer) {
          dancer.rotation.y = now * 0.0006;
          dancer.position.y = 2.8 + Math.sin(now * 0.0014) * 0.16;
        }
        if (this.stageBulbs) {
          this.stageBulbs.forEach(b => {
            const phase = now * 0.005 + b.userData.basePhase;
            b.material.opacity = 0.4 + Math.max(0, Math.sin(phase)) * 0.6;
          });
        }
        if (this.stageSpots) {
          this.stageSpots.forEach((beam, i) => {
            beam.material.opacity = 0.12 + Math.sin(now * 0.002 + beam.userData.spotPhase) * 0.1;
            beam.rotation.y = Math.sin(now * 0.0008 + i) * 0.5;
          });
        }
      }

      // Mirror ball — spins slowly, point-light pulses
      if (this.mirrorBall) {
        if (this.mirrorBall.userData.ball) this.mirrorBall.userData.ball.rotation.y = now * 0.0008;
        if (this.mirrorBall.userData.facets) this.mirrorBall.userData.facets.rotation.y = now * 0.0008;
      }

      // Sweeping spotlights — beams rotate/precess
      if (this.sweepSpots) {
        this.sweepSpots.forEach((beam, i) => {
          const phase = now * 0.0007 + beam.userData.basePhase;
          beam.rotation.z = Math.sin(phase) * 0.4;
          beam.rotation.x = Math.cos(phase * 1.3) * 0.3 + Math.PI / 3;
          beam.material.opacity = 0.12 + Math.max(0, Math.sin(phase * 2)) * 0.1;
        });
      }

      // Ticker tapes — scroll texture offset
      if (this.tickers) {
        this.tickers.forEach(t => {
          t.tex.offset.x -= t.speed * dt * 5;
        });
      }

      // Floor fog — drift + bob
      if (this.floorFog) {
        this.floorFog.forEach(s => {
          s.position.x = s.userData.baseX + Math.sin(now * 0.0004 + s.userData.basePhase) * 1.2;
          s.position.z = s.userData.baseZ + Math.cos(now * 0.00035 + s.userData.basePhase) * 1.2;
          s.position.y = 0.3 + Math.sin(now * 0.001 + s.userData.basePhase) * 0.15;
          s.material.opacity = 0.18 + Math.sin(now * 0.0008 + s.userData.basePhase) * 0.08;
        });
      }

      // Slot cabinets — flicker screens + glyph swap occasionally
      if (this.slotCabinets) {
        this.slotCabinets.forEach((cab, i) => {
          if (cab.userData.screenMat) {
            cab.userData.screenMat.opacity = 0.75 + Math.sin(now * 0.003 + i * 0.4) * 0.15;
          }
          if (cab.userData.marqSprite) {
            cab.userData.marqSprite.material.opacity = 0.7 + Math.max(0, Math.sin(now * 0.005 + i * 0.5)) * 0.3;
          }
        });
      }

      // Jackpot sign pulse
      if (this.slotJackpotSign) {
        this.slotJackpotSign.material.opacity = 0.85 + Math.sin(now * 0.003) * 0.15;
      }

      // Ghost players — idle breath + lean toward/away from table on last result
      if (this.ghostPlayers) {
        const elapsed = (now - this.lastResultT) / 1000;
        const reactionStrength = Math.max(0, 1 - elapsed / 1.6); // fades over 1.6s
        const leanSign = this.lastResultSign || 0;
        this.ghostPlayers.forEach(g => {
          const u = g.userData;
          // Subtle breath
          g.position.y = u.baseY + Math.sin(now * 0.0012 + u.basePhase) * 0.04;
          // Lean — positive toward (player won = ghost recoils away from table)
          // Since ghost sits on the opposite side, "away from table" means pulling further out.
          const lean = -leanSign * reactionStrength * 0.2;
          g.position.x = u.basePos.x + u.basePos.x * 0.12 * lean;
          g.position.z = u.basePos.z + u.basePos.z * 0.12 * lean;
          // Opacity flickers slightly
          g.material.opacity = 0.5 + Math.sin(now * 0.001 + u.basePhase) * 0.08 + reactionStrength * 0.12;
        });
      }

      // Table neon flicker
      if (this.tables) {
        this.tables.forEach((t) => {
          if (t.userData.neonSign) {
            const phase = now * 0.01 + (t.userData.neonSign.userData.flicker || 0);
            // 95% steady, 5% micro-dim
            const flick = Math.random() > 0.992 ? 0.35 + Math.random() * 0.5 : 1;
            t.userData.neonSign.material.opacity = 0.85 * flick;
          }
        });
      }

      // Dressing room curtains + silhouettes + rose confetti
      if (this.curtains) {
        this.curtains.forEach((c) => {
          c.rotation.z = Math.sin(now * 0.0008 + c.userData.basePhase) * 0.04;
          c.position.x = c.userData.baseX + Math.sin(now * 0.0004 + c.userData.basePhase) * 0.05;
        });
      }
      if (this.curtainFigures) {
        this.curtainFigures.forEach(s => {
          s.position.y = 2.1 + Math.sin(now * 0.001 + s.userData.basePhase) * 0.16;
          s.material.opacity = 0.45 + Math.sin(now * 0.0015 + s.userData.basePhase) * 0.1;
        });
      }
      if (this.roseConfetti) {
        this.roseConfetti.forEach(p => {
          p.position.y -= dt * p.userData.speed * 0.45;
          p.position.x = p.userData.baseX + Math.sin(now * 0.001 + p.userData.basePhase) * 0.3;
          p.position.z = p.userData.baseZ + Math.cos(now * 0.0008 + p.userData.basePhase) * 0.3;
          p.rotation.z += dt * 0.4;
          if (p.position.y < 0.2) {
            p.position.y = 5.5 + Math.random();
            p.userData.baseX = (Math.random() - 0.5) * 13;
            p.userData.baseZ = (Math.random() - 0.5) * 10;
          }
        });
      }
    }

    handleResize() {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.composer) this.composer.setSize(w, h);
    }

    loop() {
      if (this.disposed) return;
      const dt = Math.min(0.05, this.clock.getDelta());
      const now = performance.now();
      this.updateMotion(dt);
      this.updateAmbience(dt, now);
      this.updateInteract();
      if (this.distortPass) this.distortPass.uniforms.uTime.value = now * 0.001;
      if (this.composer) this.composer.render(dt);
      else this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(() => this.loop());
    }

    setPanic(v) {
      if (this.distortPass) this.distortPass.uniforms.uPanic.value = v;
    }

    setPaused(p) {
      this.paused = p;
      if (p && this.controls.isLocked) this.controls.unlock();
    }

    /* Called by React when the house-edge tier changes.
       Darkens the chamber, dims the felt, tarnishes the gold. */
    setEdgeTier(tier) {
      const darkness = ({ easy: 0, normal: 0.1, hard: 0.35, rigged: 0.6, cruel: 0.85 })[tier] || 0;
      const prevTier = this.currentEdgeTier;
      this.currentEdgeTier = tier;

      // Siren dress category — soft/chain/teeth — rebuild sprite if changed
      const dressTier = ['hard','rigged'].includes(tier) ? 'chain'
                     : tier === 'cruel' ? 'teeth'
                     : 'soft';
      const prevDress = ['hard','rigged'].includes(prevTier) ? 'chain'
                     : prevTier === 'cruel' ? 'teeth'
                     : 'soft';
      if (this.sirenAltar && this.sirenAltar.userData.siren && dressTier !== (this.sirenAltar.userData.sirenTier || 'soft')) {
        const oldMesh = this.sirenAltar.userData.siren;
        // Dispose old mesh tree
        oldMesh.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
            else { if (obj.material.map) obj.material.map.dispose(); obj.material.dispose(); }
          }
        });
        this.sirenAltar.remove(oldMesh);
        // Build fresh tier — with appropriate palette tints
        const tierPalette = ({
          soft:  { tailTint: 0x5a3ca0, tailHex: '#5a3ca0', scaleHex: '#c7a6ff', hairColor: 0xc7a6ff, eyeColor: 0x7ef0ff },
          chain: { tailTint: 0x7a2050, tailHex: '#7a2050', scaleHex: '#e8b448', hairColor: 0xb070c0, eyeColor: 0xffffff },
          teeth: { tailTint: 0x0a0512, tailHex: '#0a0512', scaleHex: '#80ffff', hairColor: 0xe8e2cc, eyeColor: 0x7ef0ff, skinHex: '#e0d0c0', skinTint: 0xe0d0c0 },
        })[dressTier] || {};
        const newMesh = buildMermaid({ tier: dressTier, ...tierPalette });
        newMesh.scale.setScalar(1.6);
        newMesh.position.set(0, 0.6, 0);
        this.sirenAltar.add(newMesh);
        newMesh.rotation.y = Math.atan2(14, -18) - Math.PI / 6 + Math.PI;
        this.sirenAltar.userData.siren = newMesh;
        this.sirenAltar.userData.sirenTier = dressTier;
      }

      if (this.renderer) this.renderer.toneMappingExposure = 1.1 - darkness * 0.45;
      // Dim each table's emissive felt glow + tarnish rim
      if (this.tables) {
        this.tables.forEach(t => {
          t.children.forEach(c => {
            if (!c.isMesh || !c.material) return;
            if (c.material.emissiveIntensity !== undefined) {
              if (c.userData._origEI === undefined) c.userData._origEI = c.material.emissiveIntensity;
              c.material.emissiveIntensity = c.userData._origEI * (1 - darkness * 0.75);
            }
            if (c.material.metalness > 0.6 && c.material.color) {
              // Tarnish gold — shift toward grey-green
              if (!c.userData._origColor) c.userData._origColor = c.material.color.getHex();
              const orig = new THREE.Color(c.userData._origColor);
              const tarnish = new THREE.Color(0x2a3834);
              c.material.color.copy(orig).lerp(tarnish, darkness * 0.7);
            }
          });
          if (t.userData.candle) {
            t.userData.candle.material.opacity = 0.85 * (1 - darkness * 0.6);
          }
        });
      }
      if (this.bloom) {
        this.bloom.strength = 0.55 * (1 - darkness * 0.4);
      }
    }

    on(event, cb) {
      (this.listeners[event] = this.listeners[event] || []).push(cb);
    }

    emit(event) {
      const args = Array.prototype.slice.call(arguments, 1);
      (this.listeners[event] || []).forEach(cb => cb.apply(null, args));
    }

    teleportToStart() {
      const p = this.controls.getObject().position;
      p.set(0, PLAYER_HEIGHT, 14);
      this.velocity.set(0, 0, 0);
    }

    dispose() {
      this.disposed = true;
      cancelAnimationFrame(this.rafId);
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      if (this.controls && this.controls.isLocked) this.controls.unlock();
      this.scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
          else { if (obj.material.map) obj.material.map.dispose(); obj.material.dispose(); }
        }
      });
      if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }


export { TrappedWorld };
