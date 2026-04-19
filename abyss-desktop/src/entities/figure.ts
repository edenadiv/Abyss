/* Figure — painted sprite billboard representing a character (Siren,
   Mirror, Gambler, Muse, Confessor, Charmkeeper, Merchant).

   Rather than attempt 3D figures (the vase-mermaid failure mode), we
   composite a high-resolution painterly sprite from the source art.
   At build time, scripts/bake-characters.mjs produces four tiers per
   character — SOFT / CHAIN / TEETH / HERO. At runtime we swap textures
   when the house edge changes outfit tier. */

import {
  Scene, MeshBuilder, Mesh, TransformNode,
  StandardMaterial, Texture, Color3, Vector3,
  DynamicTexture,
} from '@babylonjs/core';
import type { OutfitTier } from '../types.js';

export interface FigureDef {
  id: string;                      // siren, mirror, gambler, muse, ...
  width: number;                   // world units
  height: number;
  /* paths — one per tier. Missing tiers fall back to `soft`. */
  textures: Partial<Record<OutfitTier, string>>;
  /* if `paintingSlug` is set, we use that painting as the texture
     directly (for NPCs where we haven't baked a dedicated sprite yet) */
  paintingSlug?: string;
}

export interface Figure {
  id: string;
  node: TransformNode;
  mesh: Mesh;
  position: Vector3;
  setTier(tier: OutfitTier): void;
  dispose(): void;
}

/* Build a painterly placeholder texture — used while the baked character
   sprite is still loading, or as the final texture for the nudity-dimmer
   "show me a museum piece" fallback path. */
function buildPlaceholderTex(scene: Scene, id: string): DynamicTexture {
  const tex = new DynamicTexture('fig-ph-' + id, { width: 512, height: 1024 }, scene, false);
  const g = tex.getContext() as CanvasRenderingContext2D;
  const c = g.canvas as HTMLCanvasElement;
  g.clearRect(0, 0, c.width, c.height);

  // Soft painterly backdrop — warm candlelight behind a vague silhouette.
  const bg = g.createRadialGradient(c.width / 2, c.height * 0.55, 40, c.width / 2, c.height * 0.55, c.width * 0.9);
  bg.addColorStop(0, 'rgba(196,154,74,0.22)');
  bg.addColorStop(0.45, 'rgba(90,40,60,0.15)');
  bg.addColorStop(1, 'rgba(8,4,8,0)');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);

  // Silhouette — cloaked figure, no anatomical detail. Placeholder only.
  g.fillStyle = 'rgba(10,6,12,0.92)';
  g.beginPath();
  g.moveTo(c.width / 2, c.height * 0.08);
  g.lineTo(c.width * 0.34, c.height * 0.22);
  g.lineTo(c.width * 0.24, c.height * 0.62);
  g.lineTo(c.width * 0.18, c.height);
  g.lineTo(c.width * 0.82, c.height);
  g.lineTo(c.width * 0.76, c.height * 0.62);
  g.lineTo(c.width * 0.66, c.height * 0.22);
  g.closePath();
  g.fill();

  // Faint brush-stroke texture
  for (let i = 0; i < 600; i++) {
    g.fillStyle = `rgba(${200 + Math.random() * 40},${170 + Math.random() * 40},${120 + Math.random() * 40},${Math.random() * 0.04})`;
    g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 1);
  }

  tex.hasAlpha = true;
  tex.update(true);
  return tex;
}

/* Load a figure sprite texture from /characters/{id}_{tier}.jpg. Falls
   back to /art/{paintingSlug}.jpg if the baked sprite is missing. */
function loadTierTexture(scene: Scene, def: FigureDef, tier: OutfitTier, onDone: (tex: Texture) => void) {
  const url = def.textures[tier]
    ?? def.textures.soft
    ?? (def.paintingSlug ? `art/${def.paintingSlug}.jpg` : null);
  if (!url) return;
  const tex = new Texture(url, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE,
    () => {
      tex.hasAlpha = true;
      onDone(tex);
    },
    () => { /* keep whatever was loaded before */ },
  );
  tex.anisotropicFilteringLevel = 16;
}

export function buildFigure(scene: Scene, def: FigureDef, position: Vector3, initialTier: OutfitTier = 'soft'): Figure {
  const group = new TransformNode('fig-' + def.id, scene);
  group.position.copyFrom(position);

  const mat = new StandardMaterial('figmat-' + def.id, scene);
  mat.diffuseTexture = buildPlaceholderTex(scene, def.id);
  mat.diffuseTexture.hasAlpha = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.emissiveColor = new Color3(0.22, 0.18, 0.14);
  mat.disableLighting = true;
  mat.backFaceCulling = false;

  const mesh = MeshBuilder.CreatePlane('fig-' + def.id, { width: def.width, height: def.height }, scene);
  mesh.material = mat;
  mesh.parent = group;
  mesh.billboardMode = Mesh.BILLBOARDMODE_Y; // always face the camera around Y
  mesh.position.y = def.height / 2;

  // Kick off the initial tier texture load.
  loadTierTexture(scene, def, initialTier, (t) => { mat.diffuseTexture = t; });

  return {
    id: def.id,
    node: group,
    mesh,
    position: position.clone(),
    setTier(tier) {
      loadTierTexture(scene, def, tier, (t) => {
        const old = mat.diffuseTexture;
        mat.diffuseTexture = t;
        // Dispose the old texture if it was a Texture (not a DynamicTexture
        // we'd want to reuse) — skip placeholders.
        if (old && (old as Texture).url) (old as Texture).dispose();
      });
    },
    dispose() {
      const tex = mat.diffuseTexture;
      if (tex) tex.dispose();
      mat.dispose();
      mesh.dispose();
      group.dispose();
    },
  };
}

/* Pre-baked character manifest — one entry per NPC. At runtime, if the
   `/characters/{id}_{tier}.jpg` files aren't present (user didn't run
   `npm run bake:characters` yet), we fall back to the painting slug, so
   the Siren shows Waterhouse's *A Mermaid* as a full-body painterly sprite
   until the baker produces her dedicated asset. */

export const FIGURE_MANIFEST: Record<string, FigureDef> = {
  siren: {
    id: 'siren', width: 2.6, height: 5.2,
    paintingSlug: 'mermaid',
    textures: {
      soft:  'characters/siren_soft.jpg',
      chain: 'characters/siren_chain.jpg',
      teeth: 'characters/siren_teeth.jpg',
      hero:  'characters/siren_hero.jpg',
    },
  },
  mirror: {
    id: 'mirror', width: 2.2, height: 5.0,
    paintingSlug: 'danae-k',
    textures: {
      soft:  'characters/mirror_soft.jpg',
      chain: 'characters/mirror_chain.jpg',
      teeth: 'characters/mirror_teeth.jpg',
      hero:  'characters/mirror_hero.jpg',
    },
  },
  gambler: {
    id: 'gambler', width: 1.8, height: 4.4,
    paintingSlug: 'cardplayers',
    textures: { soft: 'characters/gambler_soft.jpg' },
  },
  muse: {
    id: 'muse', width: 2.0, height: 4.8,
    paintingSlug: 'hylas',
    textures: {
      soft:  'characters/muse_soft.jpg',
      chain: 'characters/muse_chain.jpg',
      teeth: 'characters/muse_teeth.jpg',
    },
  },
  merchant: {
    id: 'merchant', width: 1.8, height: 4.4,
    paintingSlug: 'proserpine',
    textures: { soft: 'characters/merchant_soft.jpg' },
  },
  charmkeeper: {
    id: 'charmkeeper', width: 2.0, height: 4.6,
    paintingSlug: 'ondine',
    textures: {
      soft:  'characters/charmkeeper_soft.jpg',
      chain: 'characters/charmkeeper_chain.jpg',
      teeth: 'characters/charmkeeper_teeth.jpg',
    },
  },
  confessor: {
    id: 'confessor', width: 1.6, height: 4.4,
    paintingSlug: 'francesca',
    textures: { soft: 'characters/confessor_soft.jpg' },
  },
};
