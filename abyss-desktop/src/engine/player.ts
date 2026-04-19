/* Player controller — WASD + sprint, axis-separated AABB collision.
   Movement applies via camera.forward/right so strafing works correctly. */

import { Vector3 } from '@babylonjs/core';
import type { FpsCamera } from './camera.js';

interface Aabb { minX: number; minZ: number; maxX: number; maxZ: number; }

export interface Player {
  position: Vector3;
  radius: number;
  addAabb(minX: number, minZ: number, maxX: number, maxZ: number): void;
  clearAabbs(): void;
  update(dt: number, keys: Record<string, boolean>): void;
}

export function createPlayer(camera: FpsCamera, opts: { walkSpeed?: number; sprintSpeed?: number; radius?: number; start?: Vector3 } = {}): Player {
  const pos = opts.start ? opts.start.clone() : new Vector3(0, 1.65, 12);
  const walk = opts.walkSpeed ?? 5.2;
  const sprint = opts.sprintSpeed ?? 8.6;
  const radius = opts.radius ?? 0.4;
  const aabbs: Aabb[] = [];
  const TMP_F = new Vector3();
  const TMP_R = new Vector3();

  function collides(px: number, pz: number): boolean {
    for (let i = 0; i < aabbs.length; i++) {
      const a = aabbs[i];
      const closestX = Math.max(a.minX, Math.min(px, a.maxX));
      const closestZ = Math.max(a.minZ, Math.min(pz, a.maxZ));
      const dx = px - closestX, dz = pz - closestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  function tryMove(dx: number, dz: number) {
    const nx = pos.x + dx;
    if (!collides(nx, pos.z)) pos.x = nx;
    const nz = pos.z + dz;
    if (!collides(pos.x, nz)) pos.z = nz;
  }

  return {
    position: pos,
    radius,
    addAabb(minX, minZ, maxX, maxZ) { aabbs.push({ minX, minZ, maxX, maxZ }); },
    clearAabbs() { aabbs.length = 0; },
    update(dt, keys) {
      const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? sprint : walk;
      let fwd = 0, side = 0;
      if (keys['KeyW'] || keys['ArrowUp']) fwd += 1;
      if (keys['KeyS'] || keys['ArrowDown']) fwd -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) side += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) side -= 1;
      if (fwd === 0 && side === 0) {
        camera.camera.position.copyFrom(pos);
        return;
      }
      camera.forward(TMP_F);
      camera.right(TMP_R);
      const wx = TMP_F.x * fwd + TMP_R.x * side;
      const wz = TMP_F.z * fwd + TMP_R.z * side;
      const len = Math.hypot(wx, wz) || 1;
      const step = speed * dt;
      tryMove((wx / len) * step, (wz / len) * step);
      camera.camera.position.copyFrom(pos);
    },
  };
}
