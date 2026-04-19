/* App — top-level scene router. Reads `scene` state, renders intro/hub/games/endings. */

import React, { useState, useEffect, useRef } from 'react';
import { fmt } from './utils/format.js';
import { FRAGMENTS } from './mythology/fragments.js';
import { TRINKETS } from './mythology/trinkets.js';
import { TAROT_CARDS, pickTarotCard } from './mythology/tarot.js';
import { ENDING_CARDS, ENDING_PAINTINGS } from './mythology/endings.js';
import { pickLine } from './mythology/sirenLines.js';
import { effectiveHouseEdge } from './mythology/houseEdge.js';
import { loadMeta, saveMeta, META_DEFAULTS } from './state/meta.js';
import { appendLedger, loadLedger } from './state/ledger.js';
import { useFragments } from './state/useFragments.js';
import { useTrinkets } from './state/useTrinkets.js';
import {
  WaterBackground, BreathHUD, SirenWhisper,
  Intro, Hub, Ending, TweaksPanel,
  POVLayer, POVContent,
  FragmentInventory, FragmentReader, FragmentGallery,
  GhostIntro, SpectatorScreen,
  RevelationEnding, MirrorEnding, SovereignEnding,
  NPCEncounter, SirenEncounter,
  TrinketBar, ShopModal, CharmOffer, ConfessorModal,
  Ledger, Threshold, EndingsTracker, CreditsScroll,
  TarotReveal, EndingBackdrop,
  WorldHub, GameModal,
} from './components.jsx';
import {
  Blackjack, Roulette, Slots, Dice, CoinFlip, Baccarat, Poker,
} from './games/index.jsx';

// ---------- TWEAK DEFAULTS ----------
const TWEAK_DEFAULTS = {
  startingBreath: 200,
  dialogueStyle: 'seductive',
  waterDepth: 'abyss',
  houseEdge: 'normal',
};

function App() {
  const [scene, setScene] = useState('intro'); // intro | ghostIntro | hub | spectator | game:X | ending:Y
  const [breath, setBreath] = useState(TWEAK_DEFAULTS.startingBreath);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [settings, setSettings] = useState(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = useState(false);
  const [whisper, setWhisper] = useState(null);
  const [editModeActive, setEditModeActive] = useState(false);

  // Mythology layer
  const { collected: fragments, collect: collectFragment, clear: clearFragments, setCollected: setFragments } = useFragments();
  const { owned: trinkets, buy: buyTrinketRaw, consume: consumeTrinket, has: hasTrinket, clear: clearTrinkets, setOwned: setTrinkets } = useTrinkets();
  const [meta, setMeta] = useState(loadMeta);
  const [activeNpc, setActiveNpc] = useState(null);   // gambler | muse | mirror | null
  const [fragmentReader, setFragmentReader] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [mirrorUnlocked, setMirrorUnlocked] = useState(false);
  const [maxBreathSeen, setMaxBreathSeen] = useState(0);
  const [deathNoticed, setDeathNoticed] = useState(false);
  const [prevEdgeTier, setPrevEdgeTier] = useState(null);
  const [shopOpen, setShopOpen] = useState(() => /[?&]shop=1/.test(window.location.search));
  const [charmOpen, setCharmOpen] = useState(() => /[?&]charm=1/.test(window.location.search));
  const [confessorOpen, setConfessorOpen] = useState(() => /[?&]confessor=1/.test(window.location.search));
  const [atThreshold, setAtThreshold] = useState(() => /[?&]threshold=1/.test(window.location.search));
  const [lockedIn, setLockedIn] = useState(false);
  const [tarotCard, setTarotCard] = useState(null);
  const [ledgerOpen, setLedgerOpen] = useState(() => /[?&]ledger=1/.test(window.location.search));
  const runIdxRef = useRef(null);
  // Compute runIdx lazily on first need (loaded from meta.totalRuns)
  const getRunIdx = () => {
    if (runIdxRef.current == null) runIdxRef.current = Math.max(1, (loadMeta().totalRuns || 0) + 1);
    return runIdxRef.current;
  };
  const [revelationForeclosed, setRevelationForeclosed] = useState(false);
  const [worldRoom, setWorldRoom] = useState('casino');
  const cursedIntervalRef = useRef(null);

  const TARGET_BREATH = 500;

  // Load persisted state (position + fragments + trinkets)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('atlantis_state') || '{}');
      if (saved.scene) setScene(saved.scene);
      if (typeof saved.breath === 'number') setBreath(saved.breath);
      if (typeof saved.gamesPlayed === 'number') setGamesPlayed(saved.gamesPlayed);
      if (saved.settings) setSettings(s => ({ ...s, ...saved.settings }));
      if (Array.isArray(saved.fragments)) setFragments(saved.fragments);
      if (Array.isArray(saved.trinkets)) setTrinkets(saved.trinkets);
      if (typeof saved.mirrorUnlocked === 'boolean') setMirrorUnlocked(saved.mirrorUnlocked);
      if (typeof saved.revelationForeclosed === 'boolean') setRevelationForeclosed(saved.revelationForeclosed);
      if (typeof saved.lockedIn === 'boolean') setLockedIn(saved.lockedIn);
    } catch(e) {}
  }, []);

  useEffect(() => {
    sessionStorage.setItem('atlantis_state', JSON.stringify({
      scene, breath, gamesPlayed, settings, fragments, trinkets, mirrorUnlocked, revelationForeclosed, lockedIn,
    }));
  }, [scene, breath, gamesPlayed, settings, fragments, trinkets, mirrorUnlocked, revelationForeclosed, lockedIn]);

  // Cursed trinket — drip breath while it has charges
  useEffect(() => {
    const cursed = trinkets.find(t => t.id === 'drowning-chain' && t.charges > 0);
    if (cursed && !cursedIntervalRef.current) {
      cursedIntervalRef.current = setInterval(() => {
        setBreath(b => Math.max(0, b - 1));
        consumeTrinket('drowning-chain', 1);
      }, 1000);
    } else if (!cursed && cursedIntervalRef.current) {
      clearInterval(cursedIntervalRef.current);
      cursedIntervalRef.current = null;
    }
    return () => {
      if (cursedIntervalRef.current) { clearInterval(cursedIntervalRef.current); cursedIntervalRef.current = null; }
    };
  }, [trinkets]);

  // Expose trinkets globally so game components can peek (simple read-through)
  useEffect(() => {
    window.__trinkets = {
      has: (id) => trinkets.some(t => t.id === id && t.charges > 0),
      consume: (id, n = 1) => consumeTrinket(id, n),
      state: trinkets,
    };
  }, [trinkets]);

  // Edit mode protocol
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') { setEditModeActive(true); setTweaksVisible(true); }
      if (e.data?.type === '__deactivate_edit_mode') { setEditModeActive(false); setTweaksVisible(false); }
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  // Persist tweaks back to file
  useEffect(() => {
    if (editModeActive) {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: settings }, '*');
    }
  }, [settings, editModeActive]);

  // Depth visual
  const depthNum = settings.waterDepth === 'shallow' ? 1242
                 : settings.waterDepth === 'abyss' ? 8812 : 3842;

  // Effective house edge (rises with gamesPlayed) — softened if Kraken Tooth is active
  const rawTier = effectiveHouseEdge(settings.houseEdge, gamesPlayed);
  const tierOrder = ['easy','normal','hard','rigged','cruel'];
  let softened = hasTrinket('kraken-tooth')
    ? tierOrder[Math.max(0, tierOrder.indexOf(rawTier) - 1)]
    : rawTier;
  // Locked-in mode — the Siren treats you kindly now that you chose to stay.
  if (lockedIn) softened = tierOrder[Math.max(0, tierOrder.indexOf(softened) - 1)];
  const houseEdgeTier = softened;

  // Toll bell + update meta when the edge tier tightens
  useEffect(() => {
    if (prevEdgeTier && prevEdgeTier !== houseEdgeTier) {
      // Bell audio cue — only a subtle tightening
      const audio = window.__trappedAudio;
      if (audio && audio.playBellToll) audio.playBellToll();
    }
    setPrevEdgeTier(houseEdgeTier);
  }, [houseEdgeTier]);

  // Track max breath for Mirror ending unlock
  useEffect(() => {
    setMaxBreathSeen(m => Math.max(m, breath));
    if (breath >= 1000 && !mirrorUnlocked) {
      setMirrorUnlocked(true);
      setMirrorAnnouncement(true);
      setTimeout(() => setMirrorAnnouncement(false), 5200);
      const audio = window.__trappedAudio;
      if (audio && audio.playMirrorReveal) audio.playMirrorReveal();
    }
    // If already over 1200 and has visited Mirror — auto ending
    if (breath >= 1200 && mirrorUnlocked && scene === 'hub') {
      setTimeout(() => setScene('ending:mirror'), 900);
    }
  }, [breath, mirrorUnlocked, scene]);

  const [mirrorAnnouncement, setMirrorAnnouncement] = useState(false);
  const [revelationCinematic, setRevelationCinematic] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);

  // Auto-show credits when the sixth unique ending is reached
  useEffect(() => {
    const reached = new Set(meta.endingsReached || []);
    if ((meta.deaths || 0) > 0) reached.add('ghost');
    if (reached.size >= 8 && !meta.creditsSeen) {
      setTimeout(() => {
        setCreditsOpen(true);
        setMeta(m => {
          const next = { ...m, creditsSeen: true };
          saveMeta(next);
          return next;
        });
      }, 1400);
    }
  }, [meta]);

  // Handle bet result
  const handleResult = (delta) => {
    // Trinket modifiers on outcome
    let adjusted = delta;
    if (delta > 0 && hasTrinket('lucky-kiss')) {
      adjusted = Math.round(delta * 1.25);
      consumeTrinket('lucky-kiss', 1);
    }
    if (delta > 0 && hasTrinket('drowning-chain')) {
      adjusted = Math.round(adjusted * 1.5);
    }
    if (hasTrinket('kraken-tooth')) {
      consumeTrinket('kraken-tooth', 1);
    }
    // Locked-in: payouts doubled (you stayed, the house is grateful)
    if (lockedIn && adjusted > 0) adjusted = adjusted * 2;
    setBreath(b => Math.max(0, b + adjusted));
    setGamesPlayed(g => g + 1);
    // Ghost players react
    if (window.__trappedWorld && window.__trappedWorld.markLastResult) window.__trappedWorld.markLastResult(adjusted);
    const audio = window.__trappedAudio;
    // Tarot card reveal
    const cursedActive = hasTrinket('drowning-chain');
    const card = pickTarotCard(adjusted, cursedActive);
    if (card) {
      setTarotCard(card);
      if (audio && card.tier === 'big-loss' && audio.playBellToll) audio.playBellToll();
      else if (audio && card.tier === 'big-win' && audio.playMirrorReveal) audio.playMirrorReveal();
    }
    // Ledger: record this hand.
    const game = scene.startsWith('game:') ? scene.split(':')[1] : 'table';
    appendLedger({
      runIdx: getRunIdx(),
      kind: 'hand',
      text: game,
      delta: adjusted,
    });
    setMeta(m => {
      const next = { ...m, handsPlayedEver: m.handsPlayedEver + 1, breathsSurrendered: m.breathsSurrendered + Math.max(0, -delta) };
      saveMeta(next);
      return next;
    });
    // Drive music mood by the win / loss
    if (audio && audio.setMood) {
      audio.setMood(delta > 30 ? 'bright' : delta < -30 ? 'dark' : 'neutral');
      setTimeout(() => audio.setMood && audio.setMood('neutral'), 8000);
    }
    // Whisper occasionally
    if (Math.random() < 0.4) {
      const newBreath = Math.max(0, breath + delta);
      if (newBreath < 50) setWhisper(pickLine('low_breath', settings.dialogueStyle));
      else if (newBreath > 400) setWhisper(pickLine('high_breath', settings.dialogueStyle));
      else if (delta > 0) setWhisper(pickLine('win', settings.dialogueStyle));
      else setWhisper(pickLine('loss', settings.dialogueStyle));
      setTimeout(() => setWhisper(null), 6000);
    }
  };

  // Handle fragment pickup
  const handleFragmentPickup = (id) => {
    collectFragment(id);
    setMeta(m => {
      const ever = Array.from(new Set([...(m.fragmentsEverFound || []), id]));
      const next = { ...m, fragmentsEverFound: ever };
      saveMeta(next);
      return next;
    });
    const f = FRAGMENTS.find(x => x.id === id);
    appendLedger({ runIdx: getRunIdx(), kind: 'fragment', text: f ? f.title : id });
  };

  // Buy a trinket
  const handleBuyTrinket = (id, cost) => {
    if (breath < cost) return;
    setBreath(b => b - cost);
    buyTrinketRaw(id);
    const audio = window.__trappedAudio;
    if (audio && audio.playPurchase) audio.playPurchase();
    const t = TRINKETS.find(x => x.id === id);
    appendLedger({ runIdx: getRunIdx(), kind: 'buy', text: t ? t.name : id, delta: -cost });
  };

  // Sell a fragment (forecloses Revelation ending)
  const handleSellFragment = (id, price) => {
    setFragments(prev => prev.filter(x => x !== id));
    setBreath(b => b + price);
    setRevelationForeclosed(true);
    const audio = window.__trappedAudio;
    if (audio && audio.playFragmentSell) audio.playFragmentSell();
    const f = FRAGMENTS.find(x => x.id === id);
    appendLedger({ runIdx: getRunIdx(), kind: 'sell', text: f ? f.title : id, delta: price });
  };

  // Detect death — transition to ending:drown, increment meta, mark dead
  useEffect(() => {
    if (breath <= 0 && scene.startsWith('game:')) {
      setTimeout(() => {
        if (!deathNoticed) {
          setDeathNoticed(true);
          setMeta(m => {
            const next = {
              ...m,
              deaths: m.deaths + 1,
              lastDeathAt: Date.now(),
              maxBreathEver: Math.max(m.maxBreathEver, maxBreathSeen),
            };
            saveMeta(next);
            return next;
          });
          const audio = window.__trappedAudio;
          if (audio && audio.playFlatline) audio.playFlatline();
          appendLedger({ runIdx: getRunIdx(), kind: 'death', text: 'breath gone' });
        }
        setScene('ending:drown');
      }, 1500);
    } else if (breath <= 0 && scene === 'hub') {
      if (!deathNoticed) {
        setDeathNoticed(true);
        setMeta(m => {
          const next = {
            ...m,
            deaths: m.deaths + 1,
            lastDeathAt: Date.now(),
            maxBreathEver: Math.max(m.maxBreathEver, maxBreathSeen),
          };
          saveMeta(next);
          return next;
        });
      }
      setScene('ending:drown');
    }
  }, [breath, scene]);

  const [endingDiscovered, setEndingDiscovered] = useState(null);

  // Mark endings seen in meta
  useEffect(() => {
    if (scene.startsWith('ending:')) {
      const kind = scene.split(':')[1];
      appendLedger({ runIdx: getRunIdx(), kind: 'ending', text: kind });
      setMeta(m => {
        const alreadyHad = (m.endingsReached || []).includes(kind);
        const reached = Array.from(new Set([...(m.endingsReached || []), kind]));
        const next = { ...m, endingsReached: reached };
        if (kind === 'revelation') next.hasSeenRevelation = true;
        if (kind === 'mirror')     next.hasSeenMirror = true;
        saveMeta(next);
        // Celebrate first-time discoveries
        if (!alreadyHad) {
          setEndingDiscovered(kind);
          setTimeout(() => setEndingDiscovered(null), 4200);
        }
        return next;
      });
    }
  }, [scene]);

  // New-run function: wipe run state, keep meta
  const beginNewRun = () => {
    setBreath(settings.startingBreath);
    setGamesPlayed(0);
    setWhisper(null);
    clearFragments();
    clearTrinkets();
    setMirrorUnlocked(false);
    setRevelationForeclosed(false);
    setLockedIn(false);
    setMaxBreathSeen(0);
    setActiveNpc(null);
    setFragmentReader(null);
    setDeathNoticed(false);
    setMeta(m => {
      const next = { ...m, totalRuns: m.totalRuns + 1 };
      saveMeta(next);
      runIdxRef.current = next.totalRuns;
      return next;
    });
    appendLedger({ runIdx: runIdxRef.current || 1, kind: 'run', text: 'descent begins' });
    setScene('hub');
  };

  const restart = () => {
    // If the last result was death, land on ghost intro (unless they've never died)
    if (meta.deaths > 0) {
      setBreath(settings.startingBreath);
      setGamesPlayed(0);
      setWhisper(null);
      setDeathNoticed(false);
      setScene('ghostIntro');
    } else {
      setScene('intro');
      setBreath(settings.startingBreath);
      setGamesPlayed(0);
      setWhisper(null);
      setDeathNoticed(false);
    }
  };

  // Reset-from-intro: ensure breath matches current starting value
  useEffect(() => {
    if (scene === 'intro') setBreath(settings.startingBreath);
  }, [scene === 'intro' ? settings.startingBreath : null]);

  const lowBreath = breath > 0 && breath < 50;
  const inWorld = scene === 'hub' || scene.startsWith('game:');
  const inGameModal = scene.startsWith('game:');
  const allFragmentsFound = fragments.length >= 12;

  return (
    <>
      {/* Subtle water backdrop — dimmed when the 3D world is live */}
      <div className={inWorld ? 'world-active' : ''} style={{position: 'fixed', inset: 0, zIndex: 0}}>
        <WaterBackground/>
      </div>

      {/* ========== 3D walkable casino — stays mounted during game modals ========== */}
      {inWorld && (
        <WorldHub
          breath={breath}
          targetBreath={TARGET_BREATH}
          whisper={whisper}
          paused={inGameModal || !!activeNpc || shopOpen || charmOpen}
          collectedFragments={fragments}
          houseEdgeTier={houseEdgeTier}
          mirrorUnlocked={mirrorUnlocked}
          onPickTable={(key) => setScene('game:' + key)}
          onExit={() => {
            if (lockedIn) return; // door is sealed — this shouldn't even fire
            // Present the Threshold first. Breath is NOT yet deducted — only spent if they step through.
            setAtThreshold(true);
          }}
          onSiren={() => setScene('ending:house')}
          onFragment={handleFragmentPickup}
          onNPC={(id) => setActiveNpc(id)}
          onMerchant={() => setShopOpen(true)}
          onCharmkeeper={() => setCharmOpen(true)}
          onConfessor={() => setConfessorOpen(true)}
          onRoomChange={(name) => {
            setWorldRoom(name);
            appendLedger({ runIdx: getRunIdx(), kind: 'portal', text: name });
          }}
          onLedger={() => setLedgerOpen(true)}
        />
      )}

      {inWorld && trinkets && trinkets.length > 0 && (
        <TrinketBar owned={trinkets} onPick={() => {}}/>
      )}

      {shopOpen && (
        <ShopModal
          breath={breath}
          owned={trinkets}
          fragments={fragments}
          foreclosed={revelationForeclosed}
          playerName={meta && meta.playerName}
          onBuyTrinket={handleBuyTrinket}
          onSellFragment={handleSellFragment}
          onClose={() => setShopOpen(false)}
        />
      )}

      {atThreshold && (
        <Threshold
          breath={breath}
          gamesPlayed={gamesPlayed}
          fragments={fragments}
          revelationForeclosed={revelationForeclosed}
          onStepThrough={() => {
            setAtThreshold(false);
            setBreath(b => Math.max(0, b - TARGET_BREATH));
            appendLedger({ runIdx: getRunIdx(), kind: 'threshold', text: 'stepped through the door', delta: -TARGET_BREATH });
            if (allFragmentsFound && !revelationForeclosed) {
              const audio = window.__trappedAudio;
              if (audio && audio.playMirrorReveal) audio.playMirrorReveal();
              setRevelationCinematic(true);
              setTimeout(() => { setRevelationCinematic(false); setScene('ending:revelation'); }, 2400);
            } else {
              setScene('ending:escape');
            }
          }}
          onStayOneMore={() => {
            setAtThreshold(false);
            setLockedIn(true);
            const audio = window.__trappedAudio;
            if (audio && audio.playBellToll) audio.playBellToll();
            appendLedger({ runIdx: getRunIdx(), kind: 'threshold', text: 'stayed one more hand · door sealed' });
          }}
          onStayForever={() => {
            setAtThreshold(false);
            const audio = window.__trappedAudio;
            if (audio && audio.playMirrorReveal) audio.playMirrorReveal();
            appendLedger({ runIdx: getRunIdx(), kind: 'threshold', text: 'stayed forever' });
            setScene('ending:sovereign');
          }}
          onWalkAway={() => {
            setAtThreshold(false);
            appendLedger({ runIdx: getRunIdx(), kind: 'threshold', text: 'let the tide take you sideways' });
            setScene('ending:walkAway');
          }}
        />
      )}

      {lockedIn && inWorld && (
        <div className="locked-in-banner">YOU CHOSE TO STAY · THE DOOR WILL NOT OPEN AGAIN</div>
      )}

      {ledgerOpen && (
        <Ledger onClose={() => setLedgerOpen(false)}/>
      )}

      {tarotCard && (
        <TarotReveal card={tarotCard} onDone={() => setTarotCard(null)}/>
      )}

      {charmOpen && (
        <CharmOffer
          breath={breath}
          owned={trinkets}
          playerName={meta && meta.playerName}
          onBuyTrinket={(id, cost) => { handleBuyTrinket(id, cost); setCharmOpen(false); }}
          onClose={() => setCharmOpen(false)}
        />
      )}

      {confessorOpen && (
        <ConfessorModal
          breath={breath}
          fragments={fragments}
          playerName={meta && meta.playerName}
          onClose={() => setConfessorOpen(false)}
          onConfess={(id) => {
            setFragments(prev => prev.filter(x => x !== id));
            setBreath(b => b + 60);
            const f = FRAGMENTS.find(x => x.id === id);
            appendLedger({ runIdx: getRunIdx(), kind: 'confess', text: f ? f.title : id, delta: 60 });
            const audio = window.__trappedAudio;
            if (audio && audio.playWhisper) audio.playWhisper();
            setConfessorOpen(false);
          }}
          onBuyBackFragment={(id) => {
            if (breath < 20) return;
            setBreath(b => b - 20);
            collectFragment(id);
            setMeta(m => {
              const ever = Array.from(new Set([...(m.fragmentsEverFound || []), id]));
              const next = { ...m, fragmentsEverFound: ever };
              saveMeta(next);
              return next;
            });
            const f = FRAGMENTS.find(x => x.id === id);
            appendLedger({ runIdx: getRunIdx(), kind: 'confess', text: 'recalled · ' + (f ? f.title : id), delta: -20 });
            const audio = window.__trappedAudio;
            if (audio && audio.playFragmentPickup) audio.playFragmentPickup();
            setConfessorOpen(false);
          }}
        />
      )}

      {/* Fragment inventory bar — visible when in world */}
      {inWorld && fragments.length > 0 && (
        <FragmentInventory
          collected={fragments}
          onRead={(id) => setFragmentReader(id)}
          onOpen={() => setGalleryOpen(true)}
        />
      )}

      {/* ========== Game modals — float above the 3D world ========== */}
      {scene === 'game:blackjack' && (
        <GameModal title="Blackjack" onClose={() => setScene('hub')}>
          <Blackjack breath={breath} houseEdge={houseEdgeTier} dialogueStyle={settings.dialogueStyle}
            onResult={handleResult} onExit={() => setScene('hub')}/>
        </GameModal>
      )}
      {scene === 'game:roulette' && (
        <GameModal title="Omens Wheel" onClose={() => setScene('hub')}>
          <Roulette breath={breath} houseEdge={houseEdgeTier} dialogueStyle={settings.dialogueStyle}
            onResult={handleResult} onExit={() => setScene('hub')}/>
        </GameModal>
      )}
      {scene === 'game:slots' && (
        <GameModal title="Glyphs" onClose={() => setScene('hub')}>
          <Slots breath={breath} houseEdge={houseEdgeTier} dialogueStyle={settings.dialogueStyle}
            onResult={handleResult} onExit={() => setScene('hub')}/>
        </GameModal>
      )}
      {scene === 'game:dice' && (
        <GameModal title="Bones" onClose={() => setScene('hub')}>
          <Dice breath={breath} houseEdge={houseEdgeTier} dialogueStyle={settings.dialogueStyle}
            onResult={handleResult} onExit={() => setScene('hub')}/>
        </GameModal>
      )}
      {scene === 'game:coin' && (
        <GameModal title="The Coin" onClose={() => setScene('hub')}>
          <CoinFlip breath={breath} houseEdge={houseEdgeTier} dialogueStyle={settings.dialogueStyle}
            onResult={handleResult} onExit={() => setScene('hub')}/>
        </GameModal>
      )}
      {scene === 'game:baccarat' && (
        <GameModal title="Baccarat" onClose={() => setScene('hub')}>
          <Baccarat breath={breath} houseEdge={houseEdgeTier} dialogueStyle={settings.dialogueStyle}
            onResult={handleResult} onExit={() => setScene('hub')}/>
        </GameModal>
      )}
      {scene === 'game:poker' && (
        <GameModal title="Ghost Poker" onClose={() => setScene('hub')}>
          <Poker breath={breath} houseEdge={houseEdgeTier} dialogueStyle={settings.dialogueStyle}
            onResult={handleResult} onExit={() => setScene('hub')}/>
        </GameModal>
      )}

      {/* NPC dialogs over the world */}
      {activeNpc && (
        <NPCEncounter
          npcId={activeNpc}
          breath={breath}
          houseEdgeTier={houseEdgeTier}
          gamesPlayed={gamesPlayed}
          fragments={fragments}
          onClose={() => setActiveNpc(null)}
          onBuyFragment={(cost, id) => {
            // Muse can sell a random unpicked fragment for breath
            if (breath < cost) return;
            setBreath(b => b - cost);
            if (id) handleFragmentPickup(id);
          }}
          onMirrorAccept={() => { setActiveNpc(null); setScene('ending:mirror'); }}
        />
      )}

      {/* Fragment reader modal */}
      {fragmentReader && (
        <FragmentReader
          fragmentId={fragmentReader}
          onClose={() => setFragmentReader(null)}
        />
      )}

      {/* Fragment gallery — shift+F */}
      {galleryOpen && (
        <FragmentGallery
          collected={fragments}
          onClose={() => setGalleryOpen(false)}
          onPick={(id) => { setFragmentReader(id); setGalleryOpen(false); }}
        />
      )}

      {/* House edge subtle indicator (only shown when > normal) */}
      {inWorld && (houseEdgeTier === 'hard' || houseEdgeTier === 'rigged' || houseEdgeTier === 'cruel') && (
        <div className="house-edge-indicator">
          <span className="edge-label">THE HOUSE</span>
          <span className="edge-tier">{houseEdgeTier.toUpperCase()}</span>
        </div>
      )}

      {/* Mirror-unlock announcement */}
      {mirrorAnnouncement && (
        <div className="mirror-announcement">
          <div className="mirror-announcement-kind">A NEW PRESENCE</div>
          <div className="mirror-announcement-title">She is watching the pool now.</div>
          <div className="mirror-announcement-sub">A woman, dressed in your winnings.</div>
        </div>
      )}

      {/* Revelation cinematic — flash of stained glass color before the reveal */}
      {revelationCinematic && <div className="revelation-cinematic"/>}

      {/* Credits, auto or user-triggered */}
      {creditsOpen && <CreditsScroll meta={meta} onClose={() => setCreditsOpen(false)}/>}

      {/* First-time ending discovered — brief overlay */}
      {endingDiscovered && (() => {
        const card = ENDING_CARDS.find(c => c.id === endingDiscovered);
        const label = card ? card.label : endingDiscovered.toUpperCase();
        return (
          <div className="ending-discovered">
            <div className="ending-discovered-kind">ENDING DISCOVERED</div>
            <div className="ending-discovered-label">{label}</div>
          </div>
        );
      })()}

      {/* ========== 2D scenes (intro, endings, ghost, spectator) — POV-wrapped ========== */}
      {(scene === 'intro' || scene === 'ghostIntro' || scene === 'spectator' || scene.startsWith('ending:')) && (
        <POVContent lowBreath={lowBreath}>
          {scene === 'intro' && (
            <div data-screen-label="01 Intro">
              <Intro
                dialogueStyle={settings.dialogueStyle}
                onStart={() => {
                  setBreath(settings.startingBreath);
                  setGamesPlayed(0);
                  setMeta(m => {
                    const next = { ...m, totalRuns: m.totalRuns + 1 };
                    saveMeta(next);
                    runIdxRef.current = next.totalRuns;
                    return next;
                  });
                  appendLedger({ runIdx: runIdxRef.current || 1, kind: 'run', text: 'descent begins' });
                  setScene('hub');
                  setWhisper(pickLine('greet', settings.dialogueStyle));
                  setTimeout(() => setWhisper(null), 8000);
                }}
              />
            </div>
          )}

          {scene === 'ghostIntro' && (
            <div data-screen-label="Ghost Intro">
              <GhostIntro
                meta={meta}
                onBeginNewRun={beginNewRun}
                onSpectate={() => setScene('spectator')}
              />
            </div>
          )}

          {scene === 'spectator' && (
            <div data-screen-label="Spectator">
              <SpectatorScreen onReturn={() => setScene('ghostIntro')}/>
            </div>
          )}

          {scene === 'ending:escape' && (
            <div data-screen-label="Ending Escape">
              <EndingBackdrop kind="escape"/>
              <Ending kind="escape" breath={breath} gamesPlayed={gamesPlayed} onRestart={restart}/>
            </div>
          )}
          {scene === 'ending:drown' && (
            <div data-screen-label="Ending Drown">
              <EndingBackdrop kind="drown"/>
              <Ending kind="drown" breath={breath} gamesPlayed={gamesPlayed} onRestart={restart}/>
            </div>
          )}
          {scene === 'ending:house' && (
            <div data-screen-label="Ending House">
              <EndingBackdrop kind="house"/>
              <Ending kind="house" breath={breath} gamesPlayed={gamesPlayed} onRestart={restart}/>
            </div>
          )}
          {scene === 'ending:revelation' && (
            <div data-screen-label="Ending Revelation">
              <EndingBackdrop kind="revelation"/>
              <RevelationEnding
                breath={breath}
                gamesPlayed={gamesPlayed}
                fragmentCount={fragments.length}
                onRestart={() => { clearFragments(); restart(); }}
              />
            </div>
          )}
          {scene === 'ending:mirror' && (
            <div data-screen-label="Ending Mirror">
              <EndingBackdrop kind="mirror"/>
              <MirrorEnding
                breath={breath}
                gamesPlayed={gamesPlayed}
                onRestart={() => { clearFragments(); restart(); }}
              />
            </div>
          )}
          {scene === 'ending:sovereign' && (
            <div data-screen-label="Ending Sovereign">
              <EndingBackdrop kind="sovereign"/>
              <SovereignEnding
                breath={breath}
                gamesPlayed={gamesPlayed}
                onRestart={() => { clearFragments(); setLockedIn(false); restart(); }}
              />
            </div>
          )}
          {scene === 'ending:walkAway' && (
            <div data-screen-label="Ending Walk Away">
              <EndingBackdrop kind="walkAway"/>
              <Ending kind="walkAway" breath={breath} gamesPlayed={gamesPlayed} onRestart={restart}/>
            </div>
          )}
        </POVContent>
      )}

      {/* Film-grain overlay for cinematic texture */}
      <div className="film-grain"/>

      {/* Goggles vignette, chromatic blur, debris, fog, bubbles, panic vignette */}
      <POVLayer lowBreath={lowBreath}/>

      {/* HUD sits above the POV overlays so it stays sharp and readable */}
      {inWorld && (
        <BreathHUD breath={breath} max={TARGET_BREATH} depth={depthNum}/>
      )}

      <TweaksPanel visible={tweaksVisible} settings={settings} setSettings={setSettings}/>

      {/* Restart button in top right when in hub/game */}
      {inWorld && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { if (confirm("Return to the surface? Your progress will be lost.")) restart(); }}
          style={{position:'fixed', top: 20, right: 180, zIndex: 111}}>
          Restart
        </button>
      )}
    </>
  );
}

export default App;
