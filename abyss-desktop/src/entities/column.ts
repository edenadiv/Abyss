/* Column — fluted pier between wall segments. Entirely static. */

import { Scene, MeshBuilder, TransformNode } from '@babylonjs/core';
import { brass } from '../fx/materials.js';
import { wallPlaster } from '../fx/materials.js';

export function buildColumn(scene: Scene, height: number): TransformNode {
  const g = new TransformNode('column', scene);
  const stone = wallPlaster(scene, 'warm');
  const brs = brass(scene);

  const base = MeshBuilder.CreateBox('col-base', { width: 0.8, height: 0.3, depth: 0.8 }, scene);
  base.position.y = 0.15;
  base.material = stone;
  base.parent = g;
  base.receiveShadows = true;

  const shaft = MeshBuilder.CreateCylinder('col-shaft', { diameterTop: 0.56, diameterBottom: 0.64, height: height - 0.9, tessellation: 12 }, scene);
  shaft.position.y = 0.3 + (height - 0.9) / 2;
  shaft.material = stone;
  shaft.parent = g;
  shaft.receiveShadows = true;

  const cap = MeshBuilder.CreateBox('col-cap', { width: 0.74, height: 0.3, depth: 0.74 }, scene);
  cap.position.y = height - 0.3;
  cap.material = brs;
  cap.parent = g;

  const capTop = MeshBuilder.CreateBox('col-captop', { width: 0.9, height: 0.15, depth: 0.9 }, scene);
  capTop.position.y = height - 0.075;
  capTop.material = brs;
  capTop.parent = g;

  return g;
}
