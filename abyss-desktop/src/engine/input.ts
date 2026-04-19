/* Raw keyboard + mouse. Mouse deltas accumulate per-frame; the camera
   consumes them. Pointer lock is request-on-click. */

type Keymap = Record<string, boolean>;

export interface Input {
  keys: Keymap;
  mouse: { dx: number; dy: number; locked: boolean };
  on(event: 'lock' | 'unlock', cb: () => void): void;
  requestLock(el: HTMLElement): void;
  releaseLock(): void;
  consumeMouse(): { dx: number; dy: number };
  dispose(): void;
}

export function createInput(target: Window | HTMLElement = window): Input {
  const keys: Keymap = Object.create(null);
  const mouse = { dx: 0, dy: 0, locked: false };
  const listeners = { lock: [] as (() => void)[], unlock: [] as (() => void)[] };

  const onKeyDown = (e: KeyboardEvent) => { if (!e.repeat) keys[e.code] = true; };
  const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
  const onMouseMove = (e: MouseEvent) => {
    if (!mouse.locked) return;
    mouse.dx += e.movementX || 0;
    mouse.dy += e.movementY || 0;
  };
  const onLockChange = () => {
    mouse.locked = document.pointerLockElement != null;
    (mouse.locked ? listeners.lock : listeners.unlock).forEach(cb => cb());
  };

  target.addEventListener('keydown', onKeyDown as EventListener);
  target.addEventListener('keyup', onKeyUp as EventListener);
  target.addEventListener('mousemove', onMouseMove as EventListener);
  document.addEventListener('pointerlockchange', onLockChange);

  return {
    keys,
    mouse,
    on(event, cb) { listeners[event].push(cb); },
    requestLock(el) {
      if (!el || mouse.locked) return;
      el.requestPointerLock?.();
    },
    releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); },
    consumeMouse() {
      const dx = mouse.dx, dy = mouse.dy;
      mouse.dx = 0; mouse.dy = 0;
      return { dx, dy };
    },
    dispose() {
      target.removeEventListener('keydown', onKeyDown as EventListener);
      target.removeEventListener('keyup', onKeyUp as EventListener);
      target.removeEventListener('mousemove', onMouseMove as EventListener);
      document.removeEventListener('pointerlockchange', onLockChange);
    },
  };
}
