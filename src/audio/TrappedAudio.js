/* TrappedAudio — procedurally synthesized underwater ambience.
   Web Audio API only, no external audio assets. */

const AC = typeof window !== 'undefined'
  ? (window.AudioContext || window.webkitAudioContext)
  : null;

  class TrappedAudio {
    constructor() {
      this.ctx = null;
      this.nodes = {};
      this.started = false;
      this.state = { sirenProximity: 0, panic: 0 };
    }

    start() {
      if (this.started) return;
      this.started = true;

      const ctx = this.ctx = new AC();
      const now = ctx.currentTime;

      // ======== Master chain ========
      const master = ctx.createGain();
      master.gain.value = 0;
      master.gain.linearRampToValueAtTime(0.6, now + 1.5);
      master.connect(ctx.destination);
      this.nodes.master = master;

      // ======== Low rumble — brown noise through low-pass ========
      const brownNoise = this.makeBrownNoiseNode(ctx);
      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.value = 120;
      rumbleFilter.Q.value = 0.7;
      const rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0.55;
      brownNoise.connect(rumbleFilter).connect(rumbleGain).connect(master);

      // ======== Hiss — pink-ish noise through band-pass high ========
      const pinkNoise = this.makePinkNoiseNode(ctx);
      const hissFilter = ctx.createBiquadFilter();
      hissFilter.type = 'bandpass';
      hissFilter.frequency.value = 900;
      hissFilter.Q.value = 0.4;
      const hissGain = ctx.createGain();
      hissGain.gain.value = 0.05;
      pinkNoise.connect(hissFilter).connect(hissGain).connect(master);

      // ======== Slow drone chord — three detuned oscillators through Phrygian ========
      // Phrygian in A (A minor with lowered 2): A, Bb, C, D, E, F, G
      // Chord progression: Am(i) → Bbmaj(bII) → Fmaj(bVI) → Am(i)
      this.chordProgression = [
        [55.00, 65.41, 82.41],    // Am:   A1, C2, E2
        [58.27, 69.30, 87.31],    // Bbmaj: Bb1, D2, F2
        [43.65, 65.41, 87.31],    // Fmaj: F1, C2, F2
        [55.00, 65.41, 82.41],    // Am again
      ];
      this.currentChord = 0;

      const droneA = ctx.createOscillator(); droneA.type = 'sine';
      const droneB = ctx.createOscillator(); droneB.type = 'sine';
      const droneC = ctx.createOscillator(); droneC.type = 'sine';
      const [fA, fB, fC] = this.chordProgression[0];
      droneA.frequency.value = fA;
      droneB.frequency.value = fB;
      droneC.frequency.value = fC;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.1;
      droneA.connect(droneGain);
      droneB.connect(droneGain);
      droneC.connect(droneGain);
      droneGain.connect(master);
      droneA.start(); droneB.start(); droneC.start();
      this.nodes.droneA = droneA;
      this.nodes.droneB = droneB;
      this.nodes.droneC = droneC;

      // Schedule chord changes every 36 seconds
      this.chordTimer = setInterval(() => this.advanceChord(), 36000);

      // LFO on drone gain for tidal swell
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.06;
      lfo.connect(lfoGain).connect(droneGain.gain);
      lfo.start();

      // ======== Siren humming — sawtooth through vocal-formant filter ========
      const hum = ctx.createOscillator();
      hum.type = 'sawtooth';
      hum.frequency.value = 220; // A3
      // Vowel /ah/ formants: ~800, 1150, 2900
      const f1 = ctx.createBiquadFilter(); f1.type = 'peaking'; f1.frequency.value = 800;  f1.Q.value = 8; f1.gain.value = 18;
      const f2 = ctx.createBiquadFilter(); f2.type = 'peaking'; f2.frequency.value = 1150; f2.Q.value = 10; f2.gain.value = 14;
      const f3 = ctx.createBiquadFilter(); f3.type = 'peaking'; f3.frequency.value = 2900; f3.Q.value = 12; f3.gain.value = 10;
      const humLow = ctx.createBiquadFilter(); humLow.type = 'lowpass'; humLow.frequency.value = 3500;
      const humGain = ctx.createGain();
      humGain.gain.value = 0; // muted until Siren proximity or wins
      hum.connect(f1).connect(f2).connect(f3).connect(humLow).connect(humGain).connect(master);
      hum.start();
      // Vibrato
      const humVib = ctx.createOscillator();
      humVib.frequency.value = 4;
      const humVibGain = ctx.createGain();
      humVibGain.gain.value = 2;
      humVib.connect(humVibGain).connect(hum.frequency);
      humVib.start();
      this.nodes.hum = hum;
      this.nodes.humGain = humGain;

      // ======== Siren proximity tone — eerie but muted ========
      const sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 220;
      const sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(master);
      sirenOsc.start();

      // Vibrato on Siren tone
      const sirenVib = ctx.createOscillator();
      sirenVib.frequency.value = 4.5;
      const sirenVibGain = ctx.createGain();
      sirenVibGain.gain.value = 4;
      sirenVib.connect(sirenVibGain).connect(sirenOsc.frequency);
      sirenVib.start();

      // ======== Panic heartbeat low thud ========
      // Triggered periodically when panic state is high
      this.panicTimer = null;

      // Save refs for modulation
      this.nodes.rumbleGain = rumbleGain;
      this.nodes.hissGain = hissGain;
      this.nodes.droneGain = droneGain;
      this.nodes.sirenGain = sirenGain;
      this.nodes.sirenOsc = sirenOsc;

      // ======== Bubble pop scheduler ========
      this.scheduleBubble();
    }

    makeBrownNoiseNode(ctx) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.start();
      return src;
    }

    makePinkNoiseNode(ctx) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0+b1+b2+b3+b4+b5+b6+white*0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.start();
      return src;
    }

    scheduleBubble() {
      if (!this.ctx || !this.started) return;
      const interval = 0.8 + Math.random() * 2.8;
      this.bubbleTimeout = setTimeout(() => {
        this.playBubble();
        this.scheduleBubble();
      }, interval * 1000);
    }

    playBubble() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const base = 280 + Math.random() * 1200;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 2.4, now + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.025 + Math.random() * 0.025, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(g).connect(this.nodes.master);
      osc.start(now); osc.stop(now + 0.2);
    }

    playChipStack() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = 2400 + Math.random() * 1200;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.00001, now + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.015, now + i * 0.04 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.00001, now + i * 0.04 + 0.08);
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 2000 + Math.random() * 1200;
        filt.Q.value = 8;
        o.connect(filt).connect(g).connect(this.nodes.master);
        o.start(now + i * 0.04); o.stop(now + i * 0.04 + 0.1);
      }
    }

    playFragmentPickup() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Ethereal chime: two notes, consonant, short
      const notes = [392, 587]; // G4, D5
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.00001, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.05, now + i * 0.08 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.00001, now + i * 0.08 + 1.2);
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = f * 1.5;
        filt.Q.value = 4;
        o.connect(filt).connect(g).connect(this.nodes.master);
        o.start(now + i * 0.08);
        o.stop(now + i * 0.08 + 1.3);
      });
    }

    playBellToll() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      // Low bell — sine burst + pink noise shimmer
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(110, now);
      sub.frequency.exponentialRampToValueAtTime(55, now + 3);
      const subG = ctx.createGain();
      subG.gain.setValueAtTime(0.00001, now);
      subG.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
      subG.gain.exponentialRampToValueAtTime(0.00001, now + 3.4);
      sub.connect(subG).connect(this.nodes.master);
      sub.start(now); sub.stop(now + 3.5);
    }

    playFootstep(intensity) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      // Swim-step: short bubbly burst (low sine + noise)
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(90 + Math.random() * 40, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.00001, now);
      g.gain.exponentialRampToValueAtTime(0.015 * intensity, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.00001, now + 0.15);
      o.connect(g).connect(this.nodes.master);
      o.start(now); o.stop(now + 0.17);

      // Tiny bubble-pop accent
      const pop = ctx.createOscillator();
      pop.type = 'triangle';
      pop.frequency.setValueAtTime(320 + Math.random() * 400, now);
      pop.frequency.exponentialRampToValueAtTime(120, now + 0.08);
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(0.00001, now);
      pg.gain.exponentialRampToValueAtTime(0.008 * intensity, now + 0.01);
      pg.gain.exponentialRampToValueAtTime(0.00001, now + 0.09);
      pop.connect(pg).connect(this.nodes.master);
      pop.start(now); pop.stop(now + 0.1);
    }

    playShopBell() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      // Two crystal-bell notes
      [660, 990].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.00001, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.035, now + i * 0.1 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.00001, now + i * 0.1 + 1.5);
        o.connect(g).connect(this.nodes.master);
        o.start(now + i * 0.1); o.stop(now + i * 0.1 + 1.6);
      });
    }

    playPurchase() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      // Coin drop + soft shimmer
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = 1800 + Math.random() * 900;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.00001, now + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.018, now + i * 0.05 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.00001, now + i * 0.05 + 0.1);
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 1800 + Math.random() * 800;
        filt.Q.value = 8;
        o.connect(filt).connect(g).connect(this.nodes.master);
        o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.12);
      }
      // Soft triangle chime
      const chime = ctx.createOscillator();
      chime.type = 'triangle';
      chime.frequency.value = 880;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.00001, now);
      cg.gain.exponentialRampToValueAtTime(0.03, now + 0.04);
      cg.gain.exponentialRampToValueAtTime(0.00001, now + 0.8);
      chime.connect(cg).connect(this.nodes.master);
      chime.start(now); chime.stop(now + 0.9);
    }

    playFragmentSell() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      // Dissonant pad under a coin clink
      const pad = ctx.createOscillator();
      pad.type = 'sawtooth';
      pad.frequency.setValueAtTime(82, now);
      pad.frequency.exponentialRampToValueAtTime(62, now + 2.5);
      const padG = ctx.createGain();
      padG.gain.setValueAtTime(0.00001, now);
      padG.gain.exponentialRampToValueAtTime(0.06, now + 0.3);
      padG.gain.exponentialRampToValueAtTime(0.00001, now + 2.6);
      const padF = ctx.createBiquadFilter();
      padF.type = 'lowpass';
      padF.frequency.value = 600;
      pad.connect(padF).connect(padG).connect(this.nodes.master);
      pad.start(now); pad.stop(now + 2.7);

      // Dissonant minor-2nd companion
      const pad2 = ctx.createOscillator();
      pad2.type = 'sawtooth';
      pad2.frequency.value = 87;
      const pad2G = ctx.createGain();
      pad2G.gain.setValueAtTime(0.00001, now);
      pad2G.gain.exponentialRampToValueAtTime(0.035, now + 0.4);
      pad2G.gain.exponentialRampToValueAtTime(0.00001, now + 2.0);
      pad2.connect(padF).connect(pad2G).connect(this.nodes.master);
      pad2.start(now); pad2.stop(now + 2.1);

      // Tiny coin clink on top
      setTimeout(() => {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = 2200;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.00001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 0.005);
        g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 2400; filt.Q.value = 8;
        o.connect(filt).connect(g).connect(this.nodes.master);
        o.start(); o.stop(ctx.currentTime + 0.12);
      }, 200);
    }

    setMood(mood) {
      if (!this.ctx) return;
      const shift = ({ bright: 1.06, dark: 0.94, neutral: 1.0 })[mood] || 1.0;
      const now = this.ctx.currentTime;
      if (this.nodes.droneA && this.nodes.droneB && this.nodes.droneC) {
        const [fA, fB, fC] = this.chordProgression[this.currentChord];
        this.nodes.droneA.frequency.linearRampToValueAtTime(fA * shift, now + 2.2);
        this.nodes.droneB.frequency.linearRampToValueAtTime(fB * shift, now + 2.2);
        this.nodes.droneC.frequency.linearRampToValueAtTime(fC * shift, now + 2.2);
      }
    }

    playMirrorReveal() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      // Shimmer cluster — ascending pitch
      const notes = [261.6, 329.6, 392.0, 523.3]; // C4, E4, G4, C5
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.00001, now + i * 0.25);
        g.gain.exponentialRampToValueAtTime(0.04, now + i * 0.25 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.00001, now + i * 0.25 + 1.6);
        o.connect(g).connect(this.nodes.master);
        o.start(now + i * 0.25); o.stop(now + i * 0.25 + 1.7);
      });
    }

    playFlatline() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      // Long sustained sine at ~250Hz — heart-monitor flatline vibe
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 230;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.00001, now);
      g.gain.exponentialRampToValueAtTime(0.14, now + 0.15);
      g.gain.setValueAtTime(0.14, now + 3.5);
      g.gain.exponentialRampToValueAtTime(0.00001, now + 5);
      o.connect(g).connect(this.nodes.master);
      o.start(now); o.stop(now + 5.1);
    }

    playDoorOpen() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Low sub rumble
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(45, now);
      sub.frequency.exponentialRampToValueAtTime(120, now + 2.0);
      const subG = ctx.createGain();
      subG.gain.setValueAtTime(0.0001, now);
      subG.gain.exponentialRampToValueAtTime(0.25, now + 0.4);
      subG.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
      sub.connect(subG).connect(this.nodes.master);
      sub.start(now); sub.stop(now + 2.2);

      // Shimmer overlay (noise burst through HPF)
      const noise = this.makePinkNoiseNode(ctx);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1200;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.exponentialRampToValueAtTime(0.1, now + 0.3);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
      noise.connect(hp).connect(ng).connect(this.nodes.master);
    }

    setSirenProximity(v) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      this.nodes.sirenGain.gain.cancelScheduledValues(now);
      this.nodes.sirenGain.gain.linearRampToValueAtTime(v * 0.06, now + 0.6);
      // Siren humming swells
      if (this.nodes.humGain) {
        this.nodes.humGain.gain.cancelScheduledValues(now);
        this.nodes.humGain.gain.linearRampToValueAtTime(v * 0.04, now + 0.8);
      }
    }

    advanceChord() {
      if (!this.ctx) return;
      this.currentChord = (this.currentChord + 1) % this.chordProgression.length;
      const [fA, fB, fC] = this.chordProgression[this.currentChord];
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const rampTime = 6; // 6-second crossfade
      this.nodes.droneA.frequency.cancelScheduledValues(now);
      this.nodes.droneB.frequency.cancelScheduledValues(now);
      this.nodes.droneC.frequency.cancelScheduledValues(now);
      this.nodes.droneA.frequency.linearRampToValueAtTime(fA, now + rampTime);
      this.nodes.droneB.frequency.linearRampToValueAtTime(fB, now + rampTime);
      this.nodes.droneC.frequency.linearRampToValueAtTime(fC, now + rampTime);
    }

    /* Procedural whisper — short phoneme-like noise burst formed by filters */
    playWhisper(character) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Random vowel target
      const vowels = {
        ah: [800, 1150, 2900],
        ee: [270, 2290, 3010],
        oo: [300, 870,  2240],
        eh: [530, 1840, 2480],
      };
      const chars = Object.keys(vowels);
      const vowel = vowels[chars[Math.floor(Math.random() * chars.length)]];

      const noise = this.makePinkNoiseNode(ctx);
      const vf1 = ctx.createBiquadFilter(); vf1.type = 'peaking'; vf1.frequency.value = vowel[0]; vf1.Q.value = 12; vf1.gain.value = 18;
      const vf2 = ctx.createBiquadFilter(); vf2.type = 'peaking'; vf2.frequency.value = vowel[1]; vf2.Q.value = 14; vf2.gain.value = 14;
      const vf3 = ctx.createBiquadFilter(); vf3.type = 'peaking'; vf3.frequency.value = vowel[2]; vf3.Q.value = 16; vf3.gain.value = 8;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4500;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.035, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      noise.connect(vf1).connect(vf2).connect(vf3).connect(lp).connect(g).connect(this.nodes.master);
    }

    setPanic(v) {
      if (!this.ctx) return;
      // boost rumble + hiss + shift siren down
      const ctx = this.ctx;
      const now = ctx.currentTime;
      this.nodes.rumbleGain.gain.linearRampToValueAtTime(0.5 + v * 0.4, now + 0.6);
      this.nodes.hissGain.gain.linearRampToValueAtTime(0.05 + v * 0.15, now + 0.6);
      if (v > 0.5 && !this.panicTimer) {
        this.panicTimer = setInterval(() => this.playHeartbeat(), 1200);
      } else if (v <= 0.5 && this.panicTimer) {
        clearInterval(this.panicTimer);
        this.panicTimer = null;
      }
    }

    playHeartbeat() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      [0, 0.18].forEach(offset => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(70, now + offset);
        o.frequency.exponentialRampToValueAtTime(30, now + offset + 0.15);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now + offset);
        g.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
        o.connect(g).connect(this.nodes.master);
        o.start(now + offset); o.stop(now + offset + 0.2);
      });
    }

    /* ======== Wave 1 additions — fanfare, heartbeat ramp, fragment hum, gallery duck ======== */

    winFanfare(amount = 20) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const size = Math.min(1.8, Math.max(0.4, amount / 40));

      // Brass-ish triad swell using detuned saws
      const freqs = [261.63, 329.63, 392.0]; // C major
      freqs.forEach((f, i) => {
        [0, -4, 4].forEach(detune => {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f;
          o.detune.value = detune;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.06 * size, now + 0.08 + i * 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7 + size * 0.5);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 2400;
          o.connect(lp).connect(g).connect(this.nodes.master);
          o.start(now);
          o.stop(now + 1.0 + size * 0.5);
        });
      });

      // Bell ding on top
      const bell = ctx.createOscillator();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(1760, now);
      bell.frequency.exponentialRampToValueAtTime(880, now + 0.6);
      const bellG = ctx.createGain();
      bellG.gain.setValueAtTime(0.0001, now);
      bellG.gain.exponentialRampToValueAtTime(0.12 * size, now + 0.02);
      bellG.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      bell.connect(bellG).connect(this.nodes.master);
      bell.start(now);
      bell.stop(now + 0.9);
    }

    setHeartbeatBpm(bpm) {
      if (this.__hbBpm === bpm) return;
      this.__hbBpm = bpm;
      if (this.__hbTimer) { clearInterval(this.__hbTimer); this.__hbTimer = null; }
      if (!bpm || bpm <= 0) return;
      const interval = Math.round(60000 / bpm);
      this.__hbTimer = setInterval(() => this.playHeartbeat(), interval);
    }

    setFragmentHum(distance) {
      if (!this.ctx || !this.nodes.master) return;
      // Lazy-init a continuous low sine hum that fades in when a fragment is near.
      if (!this.__humNodes) {
        const ctx = this.ctx;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = 110;
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = 165; // perfect fifth
        const g = ctx.createGain();
        g.gain.value = 0.0001;
        o.connect(g);
        o2.connect(g);
        g.connect(this.nodes.master);
        o.start(); o2.start();
        this.__humNodes = { o, o2, g };
      }
      const near = Math.max(0, Math.min(1, 1.0 - (distance - 1) / 6));
      const target = 0.0001 + near * 0.09;
      const now = this.ctx.currentTime;
      this.__humNodes.g.gain.cancelScheduledValues(now);
      this.__humNodes.g.gain.linearRampToValueAtTime(target, now + 0.2);
    }

    enterGallery() {
      if (!this.nodes.master) return;
      const now = this.ctx.currentTime;
      this.__preGalleryGain = this.__preGalleryGain || this.nodes.master.gain.value || 0.6;
      this.nodes.master.gain.cancelScheduledValues(now);
      this.nodes.master.gain.linearRampToValueAtTime(this.__preGalleryGain * 0.35, now + 1.2);
      // Long-reverb choir-ish drone
      if (this.__choirNodes) return;
      const ctx = this.ctx;
      const mix = ctx.createGain();
      mix.gain.value = 0.0001;
      const notes = [220, 261.63, 329.63, 392]; // Am7
      const oscs = notes.map(f => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const og = ctx.createGain();
        og.gain.value = 0.2;
        o.connect(og).connect(mix);
        o.start();
        return o;
      });
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;
      mix.connect(lp).connect(this.nodes.master);
      mix.gain.linearRampToValueAtTime(0.12, now + 1.5);
      this.__choirNodes = { mix, oscs, lp };
    }

    leaveGallery() {
      if (!this.nodes.master) return;
      const now = this.ctx.currentTime;
      this.nodes.master.gain.cancelScheduledValues(now);
      this.nodes.master.gain.linearRampToValueAtTime(this.__preGalleryGain || 0.6, now + 1.0);
      if (this.__choirNodes) {
        const { mix, oscs } = this.__choirNodes;
        mix.gain.cancelScheduledValues(now);
        mix.gain.linearRampToValueAtTime(0.0001, now + 1.5);
        setTimeout(() => {
          try { oscs.forEach(o => o.stop()); } catch {}
        }, 1800);
        this.__choirNodes = null;
      }
    }

    stop() {
      if (!this.ctx) return;
      if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
      if (this.panicTimer) clearInterval(this.panicTimer);
      if (this.chordTimer) clearInterval(this.chordTimer);
      if (this.__hbTimer) clearInterval(this.__hbTimer);
      try {
        this.nodes.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.nodes.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
        setTimeout(() => { try { this.ctx.close(); } catch(e){} }, 500);
      } catch(e){}
      this.started = false;
    }
  }

export { TrappedAudio };
