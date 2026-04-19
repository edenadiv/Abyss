/* Candelabra — tall brass five-branch stand. Stage piece. */

import {
  Scene, MeshBuilder, TransformNode,
  PointLight, Color3, Vector3,
} from '@babylonjs/core';
import { brass, candleFlame } from '../fx/materials.js';

export function buildCandelabra(scene: Scene): { node: TransformNode; light: PointLight } {
  const g = new TransformNode('candelabra', scene);
  const br = brass(scene);
  const fl = candleFlame(scene);

  const base = MeshBuilder.CreateCylinder('cand-base', { diameterBottom: 0.74, diameterTop: 0.56, height: 0.24, tessellation: 16 }, scene);
  base.material = br;
  base.position.y = 0.12;
  base.parent = g;

  const stem = MeshBuilder.CreateCylinder('cand-stem', { diameter: 0.12, height: 2.4, tessellation: 12 }, scene);
  stem.material = br;
  stem.position.y = 1.44;
  stem.parent = g;

  for (let i = -2; i <= 2; i++) {
    const reach = Math.abs(i) * 0.22;
    const yBase = 2.3 + Math.abs(i) * 0.06;
    if (i !== 0) {
      const arm = MeshBuilder.CreateCylinder('cand-arm-' + i, { diameter: 0.05, height: Math.abs(i) * 0.44, tessellation: 6 }, scene);
      arm.rotation.z = Math.PI / 2;
      arm.position.set((i > 0 ? 1 : -1) * reach * 0.5, 2.1, 0);
      arm.material = br;
      arm.parent = g;
    }
    const candle = MeshBuilder.CreateCylinder('cand-can-' + i, { diameterTop: 0.08, diameterBottom: 0.1, height: 0.3, tessellation: 8 }, scene);
    candle.position.set(i * reach, yBase + 0.15, 0);
    candle.material = br;
    candle.parent = g;

    const flame = MeshBuilder.CreateCylinder('cand-fl-' + i, { diameterTop: 0, diameterBottom: 0.08, height: 0.14, tessellation: 6 }, scene);
    flame.material = fl;
    flame.position.set(i * reach, yBase + 0.37, 0);
    flame.parent = g;
  }

  const light = new PointLight('cand-light', new Vector3(0, 2.5, 0), scene);
  light.intensity = 12;
  light.range = 4;
  light.diffuse = new Color3(1.0, 0.74, 0.42);
  light.parent = g;

  return { node: g, light };
}
