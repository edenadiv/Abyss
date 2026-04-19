/* Fixed-timestep game loop.
   Sim ticks at a constant hz regardless of render rate. `maxSkipped` caps
   catch-up work after tab-hide stalls, preventing the classic death
   spiral where a single long frame spawns 200 sim steps. */

export interface LoopStats {
  fps: number;
  frameMs: number;
  simMs: number;
  renderMs: number;
  steps: number;
}

export interface LoopOptions {
  update: (dtSec: number) => void;
  render: (dtSec: number, alpha: number) => void;
  hz?: number;
  maxSkipped?: number;
}

export interface LoopHandle {
  stats: LoopStats;
  stop(): void;
}

export function startLoop({ update, render, hz = 60, maxSkipped = 5 }: LoopOptions): LoopHandle {
  const stepMs = 1000 / hz;
  let lastT = performance.now();
  let acc = 0;
  let rafId = 0;
  let running = true;

  const stats: LoopStats = { fps: 0, frameMs: 0, simMs: 0, renderMs: 0, steps: 0 };
  let fpsAcc = 0, fpsFrames = 0;

  const tick = (now: number) => {
    if (!running) return;
    const dt = now - lastT;
    lastT = now;
    stats.frameMs = dt;

    acc += Math.min(dt, stepMs * maxSkipped);
    let steps = 0;
    const tSim0 = performance.now();
    while (acc >= stepMs && steps < maxSkipped) {
      update(stepMs / 1000);
      acc -= stepMs;
      steps++;
    }
    stats.simMs = performance.now() - tSim0;
    stats.steps = steps;

    const alpha = acc / stepMs;
    const tR0 = performance.now();
    render(dt / 1000, alpha);
    stats.renderMs = performance.now() - tR0;

    fpsFrames++;
    fpsAcc += dt;
    if (fpsAcc >= 500) {
      stats.fps = Math.round((fpsFrames * 1000) / fpsAcc);
      fpsAcc = 0; fpsFrames = 0;
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return {
    stats,
    stop() { running = false; cancelAnimationFrame(rafId); },
  };
}
