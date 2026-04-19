/* HUD — rendered with Babylon GUI (drawn into the WebGL context, no DOM).
   Only redraws when values change. Three-panel layout:
     bottom center: mercury-meniscus breath gauge
     top right:     sextant depth readout
     top left:      tarot fragment tally */

import { Scene } from '@babylonjs/core';
import {
  AdvancedDynamicTexture, Rectangle, TextBlock, Control, Image, Container, Ellipse,
} from '@babylonjs/gui';

export interface Hud {
  setBreath(b: number, max: number): void;
  setDepth(d: number): void;
  setFragmentCount(n: number): void;
  setPrompt(label: string | null): void;
  setTier(tier: string | null): void;
  setFps(fps: number | null): void;
  showFps(v: boolean): void;
  show(): void;
  hide(): void;
  dispose(): void;
}

export function createHud(scene: Scene): Hud {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('hud-ui', true, scene);
  ui.idealWidth = 1920; ui.idealHeight = 1080;
  ui.useSmallestIdeal = true;

  // --- Breath gauge (bottom center) ---
  const gaugeBox = new Rectangle('gauge-box');
  gaugeBox.width = '420px'; gaugeBox.height = '96px';
  gaugeBox.thickness = 0;
  gaugeBox.background = 'rgba(4,3,8,0.78)';
  gaugeBox.cornerRadius = 4;
  gaugeBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  gaugeBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  gaugeBox.paddingBottom = '40px';
  gaugeBox.paddingLeft = '16px'; gaugeBox.paddingRight = '16px';
  ui.addControl(gaugeBox);

  const gaugeFrame = new Rectangle('gauge-frame');
  gaugeFrame.width = '400px'; gaugeFrame.height = '24px';
  gaugeFrame.thickness = 1;
  gaugeFrame.color = '#c49a4a';
  gaugeFrame.background = 'rgba(2,1,4,0.8)';
  gaugeFrame.cornerRadius = 2;
  gaugeFrame.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  gaugeFrame.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  gaugeFrame.paddingBottom = '10px';
  gaugeBox.addControl(gaugeFrame);

  const gaugeFill = new Rectangle('gauge-fill');
  gaugeFill.height = '18px'; gaugeFill.width = '0px';
  gaugeFill.thickness = 0;
  gaugeFill.background = '#c49a4a';
  gaugeFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  gaugeFill.cornerRadius = 1;
  gaugeFrame.addControl(gaugeFill);

  const gaugeLabel = new TextBlock('gauge-label', 'BREATH');
  gaugeLabel.color = '#a89972';
  gaugeLabel.fontSize = 11;
  gaugeLabel.fontFamily = 'JetBrains Mono, monospace';
  gaugeLabel.height = '16px';
  gaugeLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  gaugeLabel.paddingTop = '4px';
  gaugeBox.addControl(gaugeLabel);

  const gaugeValue = new TextBlock('gauge-value', '200 / 500');
  gaugeValue.color = '#e8ddbc';
  gaugeValue.fontSize = 22;
  gaugeValue.fontFamily = 'UnifrakturMaguntia, "Cloister Black", serif';
  gaugeValue.height = '32px';
  gaugeValue.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  gaugeValue.paddingTop = '20px';
  gaugeBox.addControl(gaugeValue);

  // --- Depth readout (top right) ---
  const depthBox = new Rectangle('depth-box');
  depthBox.width = '180px'; depthBox.height = '64px';
  depthBox.thickness = 0;
  depthBox.background = 'rgba(4,3,8,0.62)';
  depthBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  depthBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  depthBox.paddingTop = '18px'; depthBox.paddingRight = '22px';
  ui.addControl(depthBox);

  const depthValue = new TextBlock('depth-value', '8812m');
  depthValue.color = '#8a5fb0';
  depthValue.fontSize = 26;
  depthValue.fontFamily = 'UnifrakturMaguntia, serif';
  depthValue.height = '40px';
  depthValue.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  depthValue.paddingTop = '4px';
  depthBox.addControl(depthValue);

  const depthLabel = new TextBlock('depth-label', 'DEPTH');
  depthLabel.color = '#a89972';
  depthLabel.fontSize = 10;
  depthLabel.fontFamily = 'JetBrains Mono, monospace';
  depthLabel.height = '16px';
  depthLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  depthLabel.paddingBottom = '6px';
  depthBox.addControl(depthLabel);

  // --- Fragment tally (top left) — 12 small blackletter cards ---
  const fragBox = new Rectangle('frag-box');
  fragBox.width = '160px'; fragBox.height = '48px';
  fragBox.thickness = 0;
  fragBox.background = 'rgba(4,3,8,0.62)';
  fragBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  fragBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  fragBox.paddingTop = '18px'; fragBox.paddingLeft = '22px';
  ui.addControl(fragBox);

  const fragValue = new TextBlock('frag-value', '');
  fragValue.color = '#c7a6ff';
  fragValue.fontSize = 15;
  fragValue.fontFamily = 'UnifrakturMaguntia, serif';
  fragBox.addControl(fragValue);

  // --- Interaction prompt (screen center-low) ---
  const promptBox = new Rectangle('prompt-box');
  promptBox.thickness = 1;
  promptBox.color = '#c49a4a';
  promptBox.background = 'rgba(4,3,8,0.84)';
  promptBox.cornerRadius = 2;
  promptBox.width = '340px'; promptBox.height = '40px';
  promptBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  promptBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  promptBox.topInPixels = 140;
  promptBox.isVisible = false;
  ui.addControl(promptBox);
  const promptText = new TextBlock('prompt-text', '');
  promptText.color = '#e8ddbc';
  promptText.fontSize = 14;
  promptText.fontFamily = 'JetBrains Mono, monospace';
  promptBox.addControl(promptText);

  // --- Tier badge (right side under depth) ---
  const tierBadge = new TextBlock('tier-badge', '');
  tierBadge.color = '#ff6b8a';
  tierBadge.fontSize = 11;
  tierBadge.fontFamily = 'JetBrains Mono, monospace';
  tierBadge.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  tierBadge.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  tierBadge.paddingTop = '96px'; tierBadge.paddingRight = '28px';
  tierBadge.isVisible = false;
  ui.addControl(tierBadge);

  // --- Crosshair — tiny candle glyph ---
  const xhair = new Ellipse('xhair');
  xhair.width = '4px'; xhair.height = '4px';
  xhair.thickness = 0;
  xhair.background = 'rgba(232,221,188,0.6)';
  xhair.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  xhair.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  ui.addControl(xhair);

  // --- FPS ---
  const fpsText = new TextBlock('fps-text', '');
  fpsText.color = '#7ef0ff';
  fpsText.fontSize = 11;
  fpsText.fontFamily = 'JetBrains Mono, monospace';
  fpsText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  fpsText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  fpsText.paddingLeft = '14px'; fpsText.paddingBottom = '12px';
  fpsText.isVisible = false;
  ui.addControl(fpsText);

  return {
    setBreath(b, max) {
      gaugeValue.text = `${Math.max(0, Math.round(b))} / ${max}`;
      const pct = Math.max(0, Math.min(1, b / max));
      gaugeFill.width = `${Math.round(400 * pct)}px`;
      // Gold → amber → blood as breath drops
      gaugeFill.background = pct > 0.4 ? '#c49a4a' : pct > 0.15 ? '#c06a40' : '#7a1420';
    },
    setDepth(d) { depthValue.text = `${d.toLocaleString()}m`; },
    setFragmentCount(n) {
      fragValue.text = n > 0 ? `✦ ${n} / 12 fragments` : '';
      fragBox.isVisible = n > 0;
    },
    setPrompt(label) {
      if (label) { promptText.text = `[ E ]  ${label}`; promptBox.isVisible = true; }
      else promptBox.isVisible = false;
    },
    setTier(tier) {
      if (tier && tier !== 'easy' && tier !== 'normal') {
        tierBadge.text = `◆ ${tier.toUpperCase()}`;
        tierBadge.isVisible = true;
        tierBadge.color = tier === 'cruel' ? '#ff6b8a' : tier === 'rigged' ? '#ffa07a' : '#ffd27a';
      } else {
        tierBadge.isVisible = false;
      }
    },
    setFps(fps) { if (fps != null) fpsText.text = `${fps} fps`; },
    showFps(v) { fpsText.isVisible = v; },
    show() { ui.rootContainer.isVisible = true; },
    hide() { ui.rootContainer.isVisible = false; },
    dispose() { ui.dispose(); },
  };
}
