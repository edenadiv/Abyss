/* Casino — octagonal chamber with 7 tables, 22 paintings, chandeliers,
   a central stage holding the Siren, slot-cabinet arc, and a single
   exit door. */

import {
  Scene, TransformNode, MeshBuilder, Vector3, Color3, Color4,
  StandardMaterial, SpotLight, PointLight,
  Texture, DynamicTexture,
} from '@babylonjs/core';
import { attachSceneFog, attachBaseLights } from '../fx/env.js';
import { floorMarble, wallPlaster, brass, velvet } from '../fx/materials.js';
import { buildChandelier } from '../entities/chandelier.js';
import { buildCandelabra } from '../entities/candelabra.js';
import { buildColumn } from '../entities/column.js';
import { buildPainting } from '../entities/painting.js';
import { buildTable, type TableEntity } from '../entities/table.js';
import { buildFigure, FIGURE_MANIFEST, type Figure } from '../entities/figure.js';
import { TABLES } from '../content/tables.js';
import type { OutfitTier } from '../types.js';

const RADIUS = 30;
const HEIGHT = 15;
const WALL_SEGMENTS = 8;
const TABLE_RING = 14;

export interface CasinoScene {
  root: TransformNode;
  tables: TableEntity[];
  figures: Map<string, Figure>;
  setOutfitTier(tier: OutfitTier): void;
  getInteractables(): Array<{ kind: 'table' | 'door' | 'figure'; key: string; position: Vector3; label: string }>;
  aabbs: { minX: number; minZ: number; maxX: number; maxZ: number }[];
}

export function buildCasino(scene: Scene): CasinoScene {
  attachSceneFog(scene, 0.025);
  const { moon } = attachBaseLights(scene);

  const root = new TransformNode('casino-root', scene);

  // --- Floor ---
  const floor = MeshBuilder.CreateDisc('floor', { radius: RADIUS + 2, tessellation: 48 }, scene);
  floor.rotation.x = Math.PI / 2;
  floor.material = floorMarble(scene);
  floor.receiveShadows = true;
  floor.parent = root;

  // --- Ceiling ---
  const ceiling = MeshBuilder.CreateDisc('ceiling', { radius: RADIUS + 2, tessellation: 48 }, scene);
  ceiling.rotation.x = -Math.PI / 2;
  ceiling.position.y = HEIGHT;
  ceiling.material = wallPlaster(scene, 'cool');
  ceiling.parent = root;

  // --- Walls: 8 segments ---
  const aabbs: { minX: number; minZ: number; maxX: number; maxZ: number }[] = [];
  for (let i = 0; i < WALL_SEGMENTS; i++) {
    const a = (i / WALL_SEGMENTS) * Math.PI * 2;
    const a2 = ((i + 1) / WALL_SEGMENTS) * Math.PI * 2;
    const x1 = Math.cos(a) * RADIUS, z1 = Math.sin(a) * RADIUS;
    const x2 = Math.cos(a2) * RADIUS, z2 = Math.sin(a2) * RADIUS;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;

    const wall = MeshBuilder.CreatePlane('wall-' + i, { width: len, height: HEIGHT }, scene);
    wall.position.set(cx, HEIGHT / 2, cz);
    wall.rotation.y = Math.atan2(x1 - x2, z2 - z1);
    wall.material = i % 2 === 0 ? wallPlaster(scene, 'warm') : wallPlaster(scene, 'cool');
    wall.receiveShadows = true;
    wall.parent = root;

    // Column at the seam
    const col = buildColumn(scene, HEIGHT);
    col.position.set(Math.cos(a) * (RADIUS - 0.35), 0, Math.sin(a) * (RADIUS - 0.35));
    col.parent = root;

    // AABB per segment — wall + column
    const nx = Math.abs(Math.cos(a + Math.PI / 8));
    const nz = Math.abs(Math.sin(a + Math.PI / 8));
    const ex = 0.8 + nx * (len / 2);
    const ez = 0.8 + nz * (len / 2);
    aabbs.push({ minX: cx - ex, minZ: cz - ez, maxX: cx + ex, maxZ: cz + ez });
  }

  // --- Central stage ---
  const stage = MeshBuilder.CreateCylinder('stage', { diameterTop: 6.2, diameterBottom: 6.8, height: 0.6, tessellation: 32 }, scene);
  stage.position.y = 0.3;
  stage.material = velvet(scene, 0x4a1a28);
  stage.receiveShadows = true;
  stage.parent = root;

  // Gold trim on stage lip
  const stageRim = MeshBuilder.CreateTorus('stage-rim', { diameter: 6.2, thickness: 0.08, tessellation: 32 }, scene);
  stageRim.position.y = 0.6;
  stageRim.material = brass(scene);
  stageRim.parent = root;

  aabbs.push({ minX: -3.4, minZ: -3.4, maxX: 3.4, maxZ: 3.4 });

  // Stage spotlight — warm, sharp, focused on the Siren
  const stageLight = new SpotLight('stage-spot', new Vector3(0, 10, 0), new Vector3(0, -1, 0), Math.PI * 0.35, 1.5, scene);
  stageLight.intensity = 50;
  stageLight.diffuse = new Color3(1.0, 0.82, 0.52);
  stageLight.parent = root;

  // Candelabra flanking the stage
  const candL = buildCandelabra(scene); candL.node.position.set(-2.6, 0.6, 0); candL.node.parent = root;
  const candR = buildCandelabra(scene); candR.node.position.set( 2.6, 0.6, 0); candR.node.parent = root;

  // --- Drape behind the stage (south-facing) ---
  const drape = MeshBuilder.CreatePlane('drape', { width: 12, height: 10 }, scene);
  drape.position.set(0, 5, 6);
  drape.rotation.y = Math.PI;
  drape.material = velvet(scene, 0x3a1018);
  drape.receiveShadows = true;
  drape.parent = root;

  // --- Chandeliers: 4 off-center (stage has its own light, so skip center) ---
  const chandPositions: [number, number][] = [
    [-RADIUS * 0.55, -RADIUS * 0.55],
    [ RADIUS * 0.55, -RADIUS * 0.55],
    [-RADIUS * 0.55,  RADIUS * 0.55],
    [ RADIUS * 0.55,  RADIUS * 0.55],
  ];
  for (const [x, z] of chandPositions) {
    const c = buildChandelier(scene);
    c.node.position.set(x, HEIGHT - 2.2, z);
    c.node.parent = root;
  }

  // --- Paintings: one per wall segment, mid-height ---
  const PAINTING_ASSIGNMENT = [
    { slug: 'mermaid',          width: 2.6, aspect: 1.45 },
    { slug: 'ulysses-sirens',   width: 3.2, aspect: 0.62 },
    { slug: 'water-serpents-ii',width: 2.8, aspect: 1.1 },
    { slug: 'danae-k',          width: 2.6, aspect: 1.15 },
    { slug: 'depths-sea',       width: 2.4, aspect: 1.4 },
    { slug: 'hylas',            width: 3.2, aspect: 0.62 },
    { slug: 'birth-venus-b',    width: 2.6, aspect: 1.5 },
    { slug: 'isle-dead',        width: 2.8, aspect: 0.7 },
  ];
  for (let i = 0; i < WALL_SEGMENTS; i++) {
    const def = PAINTING_ASSIGNMENT[i];
    const aMid = ((i + 0.5) / WALL_SEGMENTS) * Math.PI * 2;
    const wallX = Math.cos(aMid) * (RADIUS - 0.45);
    const wallZ = Math.sin(aMid) * (RADIUS - 0.45);
    const painting = buildPainting(scene, def);
    painting.position.set(wallX, 6, wallZ);
    painting.rotation.y = Math.atan2(-wallX, -wallZ);
    painting.parent = root;

    // Low warm wash on each painting
    const wash = new SpotLight('wash-' + i, new Vector3(wallX * 0.85, 9, wallZ * 0.85), new Vector3(-wallX, -2.5, -wallZ).normalize(), Math.PI * 0.4, 2, scene);
    wash.intensity = 4;
    wash.diffuse = new Color3(1.0, 0.82, 0.5);
    wash.parent = root;
  }

  // --- Tables: 7 in a ring ---
  const tables: TableEntity[] = [];
  TABLES.forEach((def, i) => {
    const a = (i / TABLES.length) * Math.PI * 2 + Math.PI * 0.1;
    const x = Math.cos(a) * TABLE_RING;
    const z = Math.sin(a) * TABLE_RING;
    const t = buildTable(scene, def, new Vector3(x, 0, z));
    t.node.parent = root;
    tables.push(t);
    aabbs.push({ minX: x - 1.7, minZ: z - 1.7, maxX: x + 1.7, maxZ: z + 1.7 });

    // Warm over-table lamp (no shadow — preset 2 of "expensive things we skip")
    const lamp = new PointLight('tlamp-' + i, new Vector3(x, 3.5, z), scene);
    lamp.intensity = 3;
    lamp.range = 5;
    lamp.diffuse = new Color3(1.0, 0.72, 0.42);
    lamp.parent = root;
  });

  // --- Slot cabinet arc (west) ---
  const slotColors = [0x7ef0ff, 0xc7a6ff, 0xffd27a, 0xff6b8a, 0x5be0c2];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i - 2) * 0.11;
    const x = Math.cos(a) * (RADIUS - 1.6);
    const z = Math.sin(a) * (RADIUS - 1.6);
    const body = MeshBuilder.CreateBox('slot-' + i, { width: 1.1, height: 2.1, depth: 0.7 }, scene);
    body.position.set(x, 1.05, z);
    body.rotation.y = Math.atan2(-x, -z);
    const mat = new StandardMaterial('slot-mat-' + i, scene);
    mat.diffuseColor = new Color3(0.12, 0.06, 0.06);
    mat.emissiveColor = new Color3(
      ((slotColors[i] >> 16) & 0xff) / 255 * 0.35,
      ((slotColors[i] >> 8) & 0xff) / 255 * 0.35,
      (slotColors[i] & 0xff) / 255 * 0.35,
    );
    body.material = mat;
    body.parent = root;

    const glow = new PointLight('slot-glow-' + i, new Vector3(x, 2.3, z), scene);
    glow.intensity = 1;
    glow.range = 1.5;
    glow.diffuse = new Color3(
      ((slotColors[i] >> 16) & 0xff) / 255,
      ((slotColors[i] >> 8) & 0xff) / 255,
      (slotColors[i] & 0xff) / 255,
    );
    glow.parent = root;
  }

  // --- Exit door (north wall) ---
  const doorFrame = MeshBuilder.CreateBox('door-frame', { width: 2.6, height: 4.4, depth: 0.5 }, scene);
  doorFrame.position.set(0, 2.2, -RADIUS + 0.3);
  doorFrame.material = brass(scene);
  doorFrame.parent = root;
  const doorGlow = MeshBuilder.CreatePlane('door-inner', { width: 2.0, height: 3.4 }, scene);
  doorGlow.position.set(0, 2.1, -RADIUS + 0.4);
  const doorMat = new StandardMaterial('door-mat', scene);
  doorMat.diffuseColor = new Color3(0.02, 0.04, 0.06);
  doorMat.emissiveColor = new Color3(0.18, 0.45, 0.6);
  doorMat.disableLighting = true;
  doorGlow.material = doorMat;
  doorGlow.parent = root;

  const doorLight = new PointLight('door-light', new Vector3(0, 3, -RADIUS + 1.2), scene);
  doorLight.intensity = 6;
  doorLight.range = 5;
  doorLight.diffuse = new Color3(0.35, 0.75, 1.0);
  doorLight.parent = root;

  // --- Figures: Siren on stage + ambient NPCs ---
  const figures = new Map<string, Figure>();
  const siren = buildFigure(scene, FIGURE_MANIFEST.siren, new Vector3(0, 0.6, 0), 'soft');
  siren.node.parent = root;
  figures.set('siren', siren);

  const npcPlacements: Array<{ id: string; pos: [number, number, number] }> = [
    { id: 'gambler',     pos: [ 8, 0, 7] },
    { id: 'muse',        pos: [-9, 0, 6] },
    { id: 'charmkeeper', pos: [10, 0, -8] },
    { id: 'merchant',    pos: [-10, 0, -4] },
  ];
  for (const p of npcPlacements) {
    const def = FIGURE_MANIFEST[p.id];
    if (!def) continue;
    const f = buildFigure(scene, def, new Vector3(p.pos[0], p.pos[1], p.pos[2]), 'soft');
    f.node.parent = root;
    figures.set(p.id, f);
    aabbs.push({ minX: p.pos[0] - 0.5, minZ: p.pos[2] - 0.5, maxX: p.pos[0] + 0.5, maxZ: p.pos[2] + 0.5 });
  }

  // --- Misty horizon / god-ray hint — a faint upward-cone mesh near the stage ---
  const godRay = MeshBuilder.CreateCylinder('god-ray', { diameterTop: 0.4, diameterBottom: 4.5, height: HEIGHT - 0.8, tessellation: 24 }, scene);
  godRay.position.set(0, HEIGHT / 2, 0);
  const grMat = new StandardMaterial('gr-mat', scene);
  grMat.diffuseColor = new Color3(1.0, 0.82, 0.52);
  grMat.emissiveColor = new Color3(0.22, 0.16, 0.08);
  grMat.alpha = 0.08;
  grMat.disableLighting = true;
  grMat.backFaceCulling = false;
  godRay.material = grMat;
  godRay.isPickable = false;
  godRay.parent = root;

  return {
    root,
    tables,
    figures,
    aabbs,
    setOutfitTier(tier) {
      figures.get('siren')?.setTier(tier);
      figures.get('mirror')?.setTier(tier);
      figures.get('charmkeeper')?.setTier(tier);
      figures.get('muse')?.setTier(tier);
    },
    getInteractables() {
      const out: Array<{ kind: 'table' | 'door' | 'figure'; key: string; position: Vector3; label: string }> = [];
      for (const t of tables) out.push({ kind: 'table', key: t.def.key, position: new Vector3(t.position.x, 1.2, t.position.z), label: t.def.name });
      out.push({ kind: 'door', key: 'exit', position: new Vector3(0, 2, -RADIUS + 1.5), label: 'THE DOOR' });
      for (const f of figures.values()) out.push({ kind: 'figure', key: f.id, position: f.position.clone(), label: f.id.toUpperCase() });
      return out;
    },
  };
}
