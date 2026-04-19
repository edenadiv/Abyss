/* First-person camera — raw mouse deltas → yaw/pitch with per-frame
   smoothing. Wraps a Babylon UniversalCamera but drives rotation
   directly (no attachControl), so mouse look stays identical whether
   pointer lock is in a modal or a fullscreen game. */

import { Scene, UniversalCamera, Vector3 } from '@babylonjs/core';

const HALF_PI = Math.PI * 0.5 - 0.001;

export interface FpsCamera {
  camera: UniversalCamera;
  yaw: number;
  pitch: number;
  setFov(deg: number): void;
  setSensitivity(s: number): void;
  applyLook(dx: number, dy: number, invertY?: boolean): void;
  update(dtSec: number): void;
  forward(out: Vector3): Vector3;
  right(out: Vector3): Vector3;
  setPosition(x: number, y: number, z: number): void;
}

export function createFpsCamera(scene: Scene, opts: { fovDeg?: number; height?: number; sensitivity?: number } = {}): FpsCamera {
  const height = opts.height ?? 1.65;
  let sens = opts.sensitivity ?? 0.0022;

  const cam = new UniversalCamera('fps-cam', new Vector3(0, height, 6), scene);
  cam.minZ = 0.1;
  cam.maxZ = 200;
  cam.fov = ((opts.fovDeg ?? 76) * Math.PI) / 180;
  // Drive Euler rotation directly — avoid Babylon's quaternion path so
  // mouse look stays identical frame-to-frame without drift.
  (cam as unknown as { rotationQuaternion: null }).rotationQuaternion = null;
  cam.rotation.set(0, 0, 0);

  let yaw = 0, pitch = 0;
  let wishYaw = 0, wishPitch = 0;

  const fp: FpsCamera = {
    camera: cam,
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    setFov(deg) { cam.fov = (deg * Math.PI) / 180; },
    setSensitivity(s) { sens = s; },
    applyLook(dx, dy, invertY = false) {
      wishYaw -= dx * sens;
      wishPitch -= (invertY ? -dy : dy) * sens;
      if (wishPitch > HALF_PI) wishPitch = HALF_PI;
      if (wishPitch < -HALF_PI) wishPitch = -HALF_PI;
    },
    update(dt) {
      const lerp = 1 - Math.exp(-dt * 35);
      yaw += (wishYaw - yaw) * lerp;
      pitch += (wishPitch - pitch) * lerp;
      cam.rotation.y = yaw;
      cam.rotation.x = pitch;
    },
    forward(out) {
      out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      return out;
    },
    right(out) {
      out.set(Math.cos(yaw), 0, -Math.sin(yaw));
      return out;
    },
    setPosition(x, y, z) { cam.position.set(x, y, z); },
  };
  return fp;
}
