/* Shared PBR materials. Constructed lazily from a factory so a single
   cache is reused across rooms — keeps shader-compilation hitches to
   first-ever-use instead of every room swap. */

import {
  Scene, Color3, Color4,
  PBRMetallicRoughnessMaterial,
  PBRMaterial,
  Texture, DynamicTexture,
  Vector2,
} from '@babylonjs/core';

function procTex(scene: Scene, name: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, c: HTMLCanvasElement) => void): DynamicTexture {
  const tex = new DynamicTexture(name, { width: w, height: h }, scene, false);
  const g = tex.getContext() as CanvasRenderingContext2D;
  const c = g.canvas as HTMLCanvasElement;
  draw(g, c);
  tex.update(true);
  tex.anisotropicFilteringLevel = 8;
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

/* Cache so the same material is reused across all walls / floors. */
const cache = new Map<string, any>();
function memo<T>(key: string, build: () => T): T {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key) as T;
}

export function resetMaterialCache() { cache.clear(); }

export function floorMarble(scene: Scene): PBRMetallicRoughnessMaterial {
  return memo('floor-marble', () => {
    const m = new PBRMetallicRoughnessMaterial('mat-floor', scene);
    const diff = procTex(scene, 'floor-diff', 1024, 1024, (g, c) => {
      // Polished obsidian-black marble with faint cold veins.
      g.fillStyle = '#08090d'; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 180; i++) {
        g.strokeStyle = `rgba(${90 + Math.random() * 50},${110 + Math.random() * 40},${160 + Math.random() * 40},${0.04 + Math.random() * 0.06})`;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(Math.random() * c.width, Math.random() * c.height);
        for (let k = 0; k < 4; k++) g.lineTo(Math.random() * c.width, Math.random() * c.height);
        g.stroke();
      }
      // Gold-leaf flecks
      for (let i = 0; i < 140; i++) {
        g.fillStyle = `rgba(196,154,74,${0.08 + Math.random() * 0.12})`;
        g.fillRect(Math.random() * c.width, Math.random() * c.height, 2 + Math.random() * 2, 1);
      }
    });
    diff.uScale = 6; diff.vScale = 6;
    m.baseTexture = diff;
    m.baseColor = new Color3(1, 1, 1);
    m.metallic = 0.15;
    m.roughness = 0.22; // highly polished
    return m;
  });
}

export function wallPlaster(scene: Scene, variant: 'warm' | 'cool' = 'warm'): PBRMetallicRoughnessMaterial {
  return memo('wall-' + variant, () => {
    const m = new PBRMetallicRoughnessMaterial('mat-wall-' + variant, scene);
    const diff = procTex(scene, 'wall-' + variant, 1024, 1024, (g, c) => {
      const base = variant === 'warm' ? '#1a110c' : '#0e0d14';
      g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
      // Damask relief — very faint
      for (let y = 0; y < c.height; y += 96) {
        for (let x = 0; x < c.width; x += 96) {
          const cx = x + 48, cy = y + 48;
          g.strokeStyle = variant === 'warm' ? 'rgba(160,120,70,0.04)' : 'rgba(120,110,160,0.04)';
          g.lineWidth = 1.5;
          g.beginPath();
          for (let a = 0; a < 4; a++) {
            g.moveTo(cx, cy);
            const ang = a * Math.PI / 2;
            g.quadraticCurveTo(cx + Math.cos(ang + 0.4) * 50, cy + Math.sin(ang + 0.4) * 50, cx + Math.cos(ang) * 40, cy + Math.sin(ang) * 40);
          }
          g.stroke();
        }
      }
      // Grime
      for (let i = 0; i < 600; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
        g.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
      }
    });
    diff.uScale = 2; diff.vScale = 1.2;
    m.baseTexture = diff;
    m.baseColor = new Color3(1, 1, 1);
    m.metallic = 0.02;
    m.roughness = 0.92;
    return m;
  });
}

export function brass(scene: Scene): PBRMetallicRoughnessMaterial {
  return memo('brass', () => {
    const m = new PBRMetallicRoughnessMaterial('mat-brass', scene);
    m.baseColor = new Color3(0.77, 0.60, 0.29);
    m.metallic = 0.95;
    m.roughness = 0.28;
    m.emissiveColor = new Color3(0.14, 0.10, 0.04);
    return m;
  });
}

export function gold(scene: Scene): PBRMetallicRoughnessMaterial {
  return memo('gold', () => {
    const m = new PBRMetallicRoughnessMaterial('mat-gold', scene);
    m.baseColor = new Color3(0.86, 0.70, 0.34);
    m.metallic = 1.0;
    m.roughness = 0.18;
    m.emissiveColor = new Color3(0.18, 0.12, 0.04);
    return m;
  });
}

export function wood(scene: Scene): PBRMetallicRoughnessMaterial {
  return memo('wood', () => {
    const m = new PBRMetallicRoughnessMaterial('mat-wood', scene);
    const diff = procTex(scene, 'wood-diff', 512, 512, (g, c) => {
      // Dark walnut with grain.
      g.fillStyle = '#1c120a'; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 36; i++) {
        g.strokeStyle = `rgba(${50 + Math.random() * 30},${30 + Math.random() * 20},${15 + Math.random() * 15},${0.25 + Math.random() * 0.35})`;
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        const y = Math.random() * c.height;
        g.moveTo(0, y);
        for (let x = 0; x < c.width; x += 20) {
          g.lineTo(x, y + Math.sin(x * 0.02 + i) * 6);
        }
        g.stroke();
      }
    });
    diff.uScale = 1.5; diff.vScale = 3;
    m.baseTexture = diff;
    m.baseColor = new Color3(1, 1, 1);
    m.metallic = 0.06;
    m.roughness = 0.7;
    return m;
  });
}

export function felt(scene: Scene, tint: number = 0x0a2a1a): PBRMetallicRoughnessMaterial {
  const key = 'felt-' + tint.toString(16);
  return memo(key, () => {
    const m = new PBRMetallicRoughnessMaterial('mat-' + key, scene);
    const diff = procTex(scene, key + '-diff', 512, 512, (g, c) => {
      const r = (tint >> 16) & 0xff, gg = (tint >> 8) & 0xff, b = tint & 0xff;
      g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 6000; i++) {
        const shade = Math.random() < 0.5 ? 1.1 : 0.85;
        g.fillStyle = `rgba(${Math.floor(r * shade)},${Math.floor(gg * shade)},${Math.floor(b * shade)},1)`;
        g.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
      }
    });
    diff.uScale = 2; diff.vScale = 2;
    m.baseTexture = diff;
    m.baseColor = new Color3(1, 1, 1);
    m.metallic = 0;
    m.roughness = 0.92;
    return m;
  });
}

export function velvet(scene: Scene, color: number = 0x4a1a28): PBRMaterial {
  const key = 'velvet-' + color.toString(16);
  return memo(key, () => {
    const m = new PBRMaterial('mat-' + key, scene);
    const r = (color >> 16) & 0xff, gg = (color >> 8) & 0xff, b = color & 0xff;
    m.albedoColor = new Color3(r / 255, gg / 255, b / 255);
    m.metallic = 0;
    m.roughness = 0.95;
    m.reflectivityColor = new Color3(0.1, 0.05, 0.06);
    m.sheen.isEnabled = true;
    m.sheen.color = new Color3(r / 255 * 1.3, gg / 255 * 1.3, b / 255 * 1.3);
    m.sheen.intensity = 0.8;
    return m;
  });
}

export function candleFlame(scene: Scene): PBRMaterial {
  return memo('candle-flame', () => {
    const m = new PBRMaterial('mat-flame', scene);
    m.albedoColor = new Color3(1.0, 0.8, 0.35);
    m.emissiveColor = new Color3(1.4, 1.0, 0.45);
    m.metallic = 0;
    m.roughness = 1;
    m.disableLighting = true;
    m.alpha = 0.95;
    return m;
  });
}
