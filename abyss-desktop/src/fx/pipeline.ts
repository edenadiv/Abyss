/* Post-processing stack — Babylon's default pipeline tuned for Abyss.
   Everything is preset-keyed so Low / Medium / High / Ultra each deliver
   a coherent look without the player having to toggle 15 checkboxes. */

import {
  Scene, Camera,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
  Color4,
  SSAO2RenderingPipeline,
} from '@babylonjs/core';

export interface FxHandle {
  pipeline: DefaultRenderingPipeline;
  ssao?: SSAO2RenderingPipeline;
  setBreath(breath: number): void;
  setExposure(e: number): void;
  dispose(): void;
}

export interface FxOptions {
  preset: 'low' | 'medium' | 'high' | 'ultra';
}

export function createPostProcessing(scene: Scene, cameras: Camera[], opts: FxOptions): FxHandle {
  const preset = opts.preset;
  const hq = preset === 'high' || preset === 'ultra';
  const ultra = preset === 'ultra';

  const pipeline = new DefaultRenderingPipeline('abyss-dp', hq, scene, cameras);

  // Tone mapping — ACES, slightly underexposed so the paintings punch.
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  pipeline.imageProcessing.exposure = 1.05;
  pipeline.imageProcessing.contrast = 1.08;

  // Bloom — always on; emissives (candles, urn, door glow) should glow.
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.55;
  pipeline.bloomWeight = hq ? 0.45 : 0.3;
  pipeline.bloomKernel = hq ? 64 : 32;
  pipeline.bloomScale = hq ? 0.5 : 0.35;

  // Depth of field — High+; focus driven externally via pipeline.depthOfField.focusDistance.
  pipeline.depthOfFieldEnabled = hq;
  if (hq) {
    pipeline.depthOfField.focalLength = 50;
    pipeline.depthOfField.fStop = 4;
    pipeline.depthOfField.focusDistance = 4000; // mm
    pipeline.depthOfFieldBlurLevel = ultra ? 2 : 1;
  }

  // Grain — subtle film grain at low alpha for a 35mm feel.
  pipeline.grainEnabled = true;
  pipeline.grain.intensity = 8;
  pipeline.grain.animated = true;

  // Chromatic aberration — very gentle. Disabled on Low.
  pipeline.chromaticAberrationEnabled = preset !== 'low';
  if (pipeline.chromaticAberrationEnabled) {
    pipeline.chromaticAberration.aberrationAmount = 3;
    pipeline.chromaticAberration.radialIntensity = 0.7;
  }

  // FXAA on non-HQ (cheap), TAA on HQ handled via scene sample count.
  pipeline.fxaaEnabled = !hq;
  pipeline.samples = hq ? 4 : 1;

  // Sharpening — subtle, brings out oil-paint brushwork after bloom/DOF softens.
  pipeline.sharpenEnabled = hq;
  if (hq) { pipeline.sharpen.edgeAmount = 0.22; pipeline.sharpen.colorAmount = 1.0; }

  // Screen-space AO for medium+
  let ssao: SSAO2RenderingPipeline | undefined;
  if (preset !== 'low') {
    ssao = new SSAO2RenderingPipeline('abyss-ssao', scene, {
      ssaoRatio: hq ? 0.75 : 0.5,
      blurRatio: hq ? 1.0 : 0.5,
    }, cameras);
    ssao.radius = 2.4;
    ssao.totalStrength = hq ? 1.4 : 1.0;
    ssao.expensiveBlur = hq;
    ssao.samples = ultra ? 16 : hq ? 12 : 8;
    ssao.maxZ = 80;
  }

  // Scene background stays dark — fog does the rest.
  scene.clearColor = new Color4(0.012, 0.01, 0.02, 1);

  return {
    pipeline,
    ssao,
    setBreath(b: number) {
      // Low breath: narrower vignette + desaturation (via exposure + contrast).
      const panic = Math.max(0, Math.min(1, (50 - Math.max(0, b)) / 50));
      pipeline.imageProcessing.vignetteEnabled = true;
      pipeline.imageProcessing.vignetteWeight = 1.5 + panic * 4;
      pipeline.imageProcessing.vignetteColor = new Color4(0.02 + panic * 0.2, 0.01, 0.02, 0);
      pipeline.imageProcessing.vignetteStretch = 0.6;
      pipeline.imageProcessing.contrast = 1.08 + panic * 0.15;
      pipeline.imageProcessing.exposure = 1.05 - panic * 0.25;
    },
    setExposure(e: number) { pipeline.imageProcessing.exposure = e; },
    dispose() {
      pipeline.dispose();
      ssao?.dispose();
    },
  };
}
