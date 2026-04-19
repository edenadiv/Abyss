/* Chandelier — brass ring, 8 candle-flames, one soft point light.
   No shadow — the moon does the shadow work; these are mood lamps. */

import {
  Scene, MeshBuilder, TransformNode,
  PointLight, Color3, Vector3,
} from '@babylonjs/core';
import { brass, candleFlame } from '../fx/materials.js';

export function buildChandelier(scene: Scene): { node: TransformNode; light: PointLight; flames: TransformNode[] } {
  const group = new TransformNode('chandelier', scene);
  const br = brass(scene);
  const fl = candleFlame(scene);

  // Ceiling rod
  const rod = MeshBuilder.CreateCylinder('chand-rod', { diameter: 0.07, height: 3 }, scene);
  rod.material = br;
  rod.position.y = 1.5;
  rod.parent = group;

  // Ring
  const ring = MeshBuilder.CreateTorus('chand-ring', { diameter: 2.4, thickness: 0.14, tessellation: 32 }, scene);
  ring.material = br;
  ring.parent = group;

  // Central disk
  const disk = MeshBuilder.CreateCylinder('chand-disk', { diameter: 0.5, height: 0.15, tessellation: 12 }, scene);
  disk.material = br;
  disk.parent = group;

  // 8 candles with flames
  const flames: TransformNode[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 1.2;
    const z = Math.sin(a) * 1.2;

    const candle = MeshBuilder.CreateCylinder('candle-' + i, { diameterTop: 0.12, diameterBottom: 0.16, height: 0.3 }, scene);
    const candleMat = br;
    candle.material = candleMat;
    candle.position.set(x, 0.18, z);
    candle.parent = group;

    const flame = MeshBuilder.CreateCylinder('flame-' + i, { diameterTop: 0, diameterBottom: 0.1, height: 0.18, tessellation: 8 }, scene);
    flame.material = fl;
    flame.position.set(x, 0.42, z);
    flame.parent = group;
    flames.push(flame);
  }

  // Single warm point light
  const light = new PointLight('chand-light', new Vector3(0, 0, 0), scene);
  light.intensity = 25;
  light.range = 10;
  light.diffuse = new Color3(1.0, 0.76, 0.48);
  light.specular = new Color3(1.0, 0.88, 0.62);
  light.parent = group;

  return { node: group, light, flames };
}
