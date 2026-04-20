/* Babylon engine bootstrap. WebGPU first, WebGL2 fallback. The renderer
   drives a single <canvas>; every scene we build later runs against this
   engine. */

import {
  Engine, WebGPUEngine,
  Scene, Color3, Color4,
  HemisphericLight, DirectionalLight, Vector3,
  UniversalCamera,
} from '@babylonjs/core';

export interface EngineBundle {
  engine: Engine | WebGPUEngine;
  isWebGPU: boolean;
  canvas: HTMLCanvasElement;
  scene: Scene;
  dispose(): void;
}

async function tryWebGPU(canvas: HTMLCanvasElement): Promise<WebGPUEngine | null> {
  // Babylon 7's WebGPU path has known issues with DefaultRenderingPipeline +
  // SSAO2RenderingPipeline (swapchain-texture-in-submit race). Until it's
  // clean we only attempt WebGPU when ABYSS_WEBGPU=1 is set — the WebGL2
  // path is visually identical on this scene at 120+ fps on M-class.
  if (typeof navigator === 'undefined' || !(navigator as any).gpu) return null;
  // Opt-in only — either env at build time, or ?webgpu=1 in the URL.
  const envOptIn = typeof import.meta.env !== 'undefined' && (import.meta.env as any).VITE_WEBGPU === '1';
  const urlOptIn = typeof window !== 'undefined' && /[?&]webgpu=1/.test(window.location.search);
  if (!envOptIn && !urlOptIn) return null;
  try {
    const supported = await (WebGPUEngine as any).IsSupportedAsync;
    if (!supported) return null;
    const engine = new WebGPUEngine(canvas, {
      antialias: true,
      stencil: false,
      powerPreference: 'high-performance',
      enableAllFeatures: true,
    });
    await engine.initAsync();
    return engine;
  } catch (err) {
    console.warn('[engine] WebGPU init failed — using WebGL2:', err);
    return null;
  }
}

export async function createEngineBundle(canvas: HTMLCanvasElement, preset: 'low' | 'medium' | 'high' | 'ultra' = 'high'): Promise<EngineBundle> {
  const webgpu = await tryWebGPU(canvas);
  const engine: Engine | WebGPUEngine = webgpu ?? new Engine(canvas, true, {
    antialias: true,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    adaptToDeviceRatio: true,
  });

  const dprCap = preset === 'low' ? 1.0 : preset === 'medium' ? 1.25 : preset === 'high' ? 1.5 : 2.0;
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, dprCap));

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.01, 0.03, 1);
  scene.ambientColor = new Color3(0.05, 0.04, 0.09);

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  console.log(`[engine] ${webgpu ? 'WebGPU' : 'WebGL2'} · preset=${preset} · dprCap=${dprCap} · devicePixelRatio=${window.devicePixelRatio}`);
  console.log(`[engine] capabilities ready`);

  return {
    engine, isWebGPU: !!webgpu, canvas, scene,
    dispose() {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      engine.dispose();
    },
  };
}

/* Starter lights — overridden per-scene later. */
export function attachStarterLights(scene: Scene) {
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.25;
  hemi.diffuse = new Color3(0.7, 0.8, 1.0);
  hemi.groundColor = new Color3(0.05, 0.04, 0.08);

  const moon = new DirectionalLight('moon', new Vector3(-0.45, -0.9, -0.2), scene);
  moon.intensity = 1.2;
  moon.diffuse = new Color3(0.78, 0.84, 1.0);
  return { hemi, moon };
}

/* Placeholder camera so we can render _something_ out of the box. */
export function attachPlaceholderCamera(scene: Scene, canvas: HTMLCanvasElement) {
  const cam = new UniversalCamera('placeholder-cam', new Vector3(0, 1.6, 6), scene);
  cam.setTarget(Vector3.Zero());
  cam.attachControl(canvas, true);
  cam.speed = 0.15;
  return cam;
}
