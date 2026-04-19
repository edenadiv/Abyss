/* Game table — wood pedestal, felt top, colored inlay, floating label. */

import {
  Scene, MeshBuilder, TransformNode,
  StandardMaterial, Color3, Color4,
  DynamicTexture, Texture,
  Vector3,
} from '@babylonjs/core';
import { wood, felt, brass } from '../fx/materials.js';
import type { TableDef } from '../content/tables.js';

export interface TableEntity {
  node: TransformNode;
  def: TableDef;
  position: Vector3;
  bounds: { x: number; z: number; r: number };
}

function labelTexture(scene: Scene, def: TableDef): DynamicTexture {
  const tex = new DynamicTexture('lbl-' + def.key, { width: 1024, height: 256 }, scene, false);
  const g = tex.getContext() as CanvasRenderingContext2D;
  const c = g.canvas as HTMLCanvasElement;
  g.clearRect(0, 0, c.width, c.height);
  // Etched ivory label
  g.fillStyle = '#e8ddbc';
  g.font = 'bold 84px "UnifrakturMaguntia", "Cloister Black", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(def.name, c.width / 2, c.height / 2);
  tex.hasAlpha = true;
  tex.update(true);
  return tex;
}

export function buildTable(scene: Scene, def: TableDef, position: Vector3): TableEntity {
  const group = new TransformNode('table-' + def.key, scene);
  group.position.copyFrom(position);

  // Pedestal
  const ped = MeshBuilder.CreateCylinder('ped-' + def.key, { diameterTop: 2.7, diameterBottom: 3.0, height: 0.9, tessellation: 20 }, scene);
  ped.position.y = 0.45;
  ped.material = wood(scene);
  ped.parent = group;
  ped.receiveShadows = true;

  // Felt top
  const top = MeshBuilder.CreateCylinder('top-' + def.key, { diameter: 3.0, height: 0.12, tessellation: 24 }, scene);
  top.position.y = 0.96;
  top.material = felt(scene, def.accent);
  top.parent = group;
  top.receiveShadows = true;

  // Brass rim
  const rim = MeshBuilder.CreateTorus('rim-' + def.key, { diameter: 3.02, thickness: 0.05, tessellation: 24 }, scene);
  rim.position.y = 1.03;
  rim.material = brass(scene);
  rim.parent = group;

  // Glowing accent disc in the center
  const accentMat = new StandardMaterial('acc-' + def.key, scene);
  const rr = ((def.accent >> 16) & 0xff) / 255;
  const gg = ((def.accent >> 8) & 0xff) / 255;
  const bb = (def.accent & 0xff) / 255;
  accentMat.diffuseColor = new Color3(rr, gg, bb);
  accentMat.emissiveColor = new Color3(rr * 1.4, gg * 1.4, bb * 1.4);
  accentMat.disableLighting = false;
  const accent = MeshBuilder.CreateDisc('acc-disc-' + def.key, { radius: 0.5, tessellation: 24 }, scene);
  accent.position.y = 1.04;
  accent.rotation.x = Math.PI / 2;
  accent.material = accentMat;
  accent.parent = group;

  // Floating blackletter label above
  const labelMat = new StandardMaterial('lblmat-' + def.key, scene);
  labelMat.diffuseTexture = labelTexture(scene, def);
  labelMat.diffuseTexture.hasAlpha = true;
  labelMat.useAlphaFromDiffuseTexture = true;
  labelMat.emissiveColor = new Color3(0.9, 0.88, 0.75);
  labelMat.disableLighting = true;
  labelMat.backFaceCulling = false;
  const label = MeshBuilder.CreatePlane('lbl-' + def.key, { width: 2.6, height: 0.65 }, scene);
  label.material = labelMat;
  label.position.y = 2.4;
  label.parent = group;

  return {
    node: group,
    def,
    position: position.clone(),
    bounds: { x: position.x, z: position.z, r: 2.3 },
  };
}
