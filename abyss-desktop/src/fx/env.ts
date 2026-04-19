/* Environment / atmospherics — PBR-ready ambient, procedurally generated
   equirect IBL (we can swap an HDRI file in later). Volumetric fog is
   handled by scene.fogMode + scene.fogDensity for now; Babylon's
   VolumetricLight post-process gets added in Phase 3 when the moon
   direction is known. */

import {
  Scene, Vector3, Color3, Color4,
  HemisphericLight, DirectionalLight,
  DynamicTexture, CubeTexture, Texture,
} from '@babylonjs/core';

/* Build a cheap procedural IBL cubemap so PBR materials have something
   to specular-reflect. Later we can load an .env file for a proper HDRI. */
export function attachProceduralIBL(scene: Scene): CubeTexture | null {
  try {
    // 6 face textures painted as warm-gold-top, cool-deep-bottom,
    // fog-mid — gives any PBR material a museum-after-hours glow.
    const size = 256;
    const faces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map((face) => {
      const tex = new DynamicTexture('ibl-' + face, size, scene, false);
      const g = tex.getContext() as CanvasRenderingContext2D;
      // Top → bottom gradient per face.
      const grad = g.createLinearGradient(0, 0, 0, size);
      if (face === 'py') { // sky — warm moon glow
        grad.addColorStop(0, '#1a3650');
        grad.addColorStop(1, '#0a1e30');
      } else if (face === 'ny') { // floor — inky
        grad.addColorStop(0, '#04060a');
        grad.addColorStop(1, '#020304');
      } else { // sides — misty blue-violet with warm lower band
        grad.addColorStop(0, '#142038');
        grad.addColorStop(0.5, '#0c1628');
        grad.addColorStop(1, '#1a1208');
      }
      g.fillStyle = grad; g.fillRect(0, 0, size, size);
      // Specks / highlights
      for (let i = 0; i < 120; i++) {
        const a = Math.random() * 0.08;
        g.fillStyle = `rgba(${180 + Math.random() * 60},${180 + Math.random() * 50},${200 + Math.random() * 40},${a})`;
        g.fillRect(Math.random() * size, Math.random() * size, 1, 1);
      }
      tex.update();
      return tex;
    });

    // Babylon can build a CubeTexture from 6 dynamic canvases via the
    // CubeTexture.CreateFromImages path — uses HTMLCanvasElements.
    const urls = faces.map(f => (f.getContext().canvas as HTMLCanvasElement).toDataURL('image/png'));
    const cube = CubeTexture.CreateFromImages(urls, scene);
    cube.gammaSpace = false; // treat as HDR-ish
    cube.level = 0.65;
    scene.environmentTexture = cube;
    scene.environmentIntensity = 0.6;
    return cube;
  } catch (err) {
    console.warn('[env] IBL setup failed, materials will use flat shading', err);
    return null;
  }
}

export function attachSceneFog(scene: Scene, density = 0.03) {
  scene.fogMode = 2; // FOGMODE_EXP2
  scene.fogColor = new Color3(0.03, 0.05, 0.09);
  scene.fogDensity = density;
  scene.clearColor = new Color4(0.012, 0.01, 0.02, 1);
}

/* Baseline two-light rig — overridden per-room when more drama is needed. */
export function attachBaseLights(scene: Scene): { hemi: HemisphericLight; moon: DirectionalLight } {
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.3;
  hemi.diffuse = new Color3(0.65, 0.75, 0.95);
  hemi.groundColor = new Color3(0.05, 0.04, 0.06);

  const moon = new DirectionalLight('moon', new Vector3(-0.5, -0.9, -0.2), scene);
  moon.intensity = 1.1;
  moon.diffuse = new Color3(0.78, 0.84, 1.0);
  moon.specular = new Color3(1.0, 1.0, 1.0);
  moon.shadowEnabled = true;
  moon.shadowMinZ = 0.5;
  moon.shadowMaxZ = 80;
  return { hemi, moon };
}
