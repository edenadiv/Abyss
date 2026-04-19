/* Painting entity — gilt brass frame + plane that loads a painting.
   Ships with a placeholder painterly texture; real image loads async. */

import {
  Scene, Mesh, MeshBuilder, TransformNode,
  PBRMetallicRoughnessMaterial, Color3, StandardMaterial,
  Texture, DynamicTexture,
  Vector3,
} from '@babylonjs/core';
import { brass } from '../fx/materials.js';
import { paintingUrl } from '../content/art.js';

export interface PaintingDef {
  slug: string;
  width: number;
  aspect: number; // height / width
}

function placeholderTex(scene: Scene, slug: string): DynamicTexture {
  const tex = new DynamicTexture('ph-' + slug, { width: 256, height: 256 }, scene, false);
  const g = tex.getContext() as CanvasRenderingContext2D;
  const c = g.canvas as HTMLCanvasElement;
  // Moody dark field — brush-stroke noise + warm horizon glow.
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#080612');
  grad.addColorStop(0.5, '#0e0b1a');
  grad.addColorStop(1, '#040206');
  g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 320; i++) {
    g.fillStyle = `rgba(${60 + Math.random() * 50},${50 + Math.random() * 40},${80 + Math.random() * 40},${0.05 + Math.random() * 0.06})`;
    g.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
  }
  const glow = g.createRadialGradient(128, 180, 10, 128, 180, 180);
  glow.addColorStop(0, 'rgba(196,154,74,0.15)');
  glow.addColorStop(1, 'rgba(196,154,74,0)');
  g.fillStyle = glow; g.fillRect(0, 0, c.width, c.height);
  tex.update(true);
  return tex;
}

export function buildPainting(scene: Scene, def: PaintingDef): TransformNode {
  const group = new TransformNode('painting-' + def.slug, scene);
  const w = def.width;
  const h = def.width * def.aspect;

  // Canvas plane
  const mat = new PBRMetallicRoughnessMaterial('mat-' + def.slug, scene);
  mat.baseTexture = placeholderTex(scene, def.slug);
  mat.metallic = 0.05;
  mat.roughness = 0.65;
  mat.emissiveColor = new Color3(0.05, 0.04, 0.03);
  const plane = MeshBuilder.CreatePlane('canvas-' + def.slug, { width: w, height: h }, scene);
  plane.material = mat;
  plane.position.y = 0;
  plane.parent = group;
  plane.receiveShadows = true;

  // Brass frame — 4 bars
  const frame = brass(scene);
  const t = 0.09;           // frame thickness
  const d = 0.06;           // frame depth
  const bars: Array<[number, number, number, number, number]> = [
    [w + t * 2, t, 0,  h / 2 + t / 2, 0],
    [w + t * 2, t, 0, -(h / 2 + t / 2), 0],
    [t, h, -(w / 2 + t / 2), 0, 0],
    [t, h, (w / 2 + t / 2), 0, 0],
  ];
  for (const [bw, bh, bx, by, bz] of bars) {
    const m = MeshBuilder.CreateBox('frame-' + def.slug, { width: bw, height: bh, depth: d }, scene);
    m.material = frame;
    m.position.set(bx, by, bz - d * 0.1);
    m.parent = group;
  }

  // Async load the real image
  const url = paintingUrl(def.slug);
  if (url) {
    const real = new Texture(url, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE,
      () => {
        mat.baseTexture = real;
        mat.emissiveColor = new Color3(0.08, 0.06, 0.04);
      },
      () => { /* keep placeholder on error */ },
    );
    real.anisotropicFilteringLevel = 16;
  }

  return group;
}
