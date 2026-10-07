import { useEffect, useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { createMotion, poseAt, retarget, snap, type EntityKind, type Motion } from "../../render/motion";
import { createGroundCache, createSpriteCache, paintScene, type Ctx2D, type MakeCanvas } from "../../render/paint";
import { buildScene, type Poses, type Scene, type SceneInput } from "../../render/scene";
import { toArt, type WorldRect } from "../../render/world";
import type { Point } from "../../game/types";

const makeCanvas: MakeCanvas = (w, h) => {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  return ctx ? { image: canvas, ctx } : null;
};

/**
 * The pixel-art map: one requestAnimationFrame loop turns the latest props into a scene and
 * paints it. Without a 2D context (jsdom, very old browsers) it stays an empty canvas.
 * `onScene` exists for tests.
 */
export function MapCanvas({ input, world, onScene }: { input: SceneInput; world: WorldRect; onScene?: (scene: Scene) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const latest = useRef({ input, world, onScene, reduced });
  useLayoutEffect(() => {
    latest.current = { input, world, onScene, reduced };
  });

  // Assigning a canvas's size clears it and resets its context, so only do it when the size changes.
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (canvas.width !== world.backingWidth) canvas.width = world.backingWidth;
    if (canvas.height !== world.backingHeight) canvas.height = world.backingHeight;
  }, [world.backingWidth, world.backingHeight]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d") as Ctx2D | null | undefined;
    if (!canvas || !ctx) return;
    const sprites = createSpriteCache(makeCanvas);
    const ground = createGroundCache(makeCanvas, sprites);
    const motions = new Map<string, Motion>();
    let wasDowned = latest.current.input.downed;
    let raf = 0;

    const track = (key: string, kind: EntityKind, p: Point, t: number, reducedNow: boolean, jump: boolean) => {
      const at = toArt(p);
      const m = motions.get(key);
      const next = !m ? createMotion(kind, at, t) : jump ? snap(m, at, t) : retarget(m, at, t, reducedNow);
      motions.set(key, next);
      return poseAt(next, t, reducedNow);
    };

    const frame = (t: number) => {
      const { input: now, world: rect, onScene: report, reduced: still } = latest.current;
      const respawned = wasDowned && !now.downed;
      wasDowned = now.downed;
      const present = new Set(now.teammates.map((m) => `mate:${m.id}`));
      for (const key of motions.keys()) if (key.startsWith("mate:") && !present.has(key)) motions.delete(key);
      const poses: Poses = {
        player: track("player", "player", now.player, t, still, respawned),
        drone: track("drone", "drone", now.drone, t, still, respawned),
        teammates: Object.fromEntries(now.teammates.map((m) => [m.id, track(`mate:${m.id}`, "teammate", m, t, still, false)])),
      };
      const scene = buildScene(now, poses, t, still);
      report?.(scene);
      paintScene(ctx, scene, rect, sprites, ground);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const dpr = world.s / world.scale;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-testid="map-canvas"
      className="pointer-events-none absolute top-0 left-0"
      style={{ width: `${world.backingWidth / dpr}px`, height: `${world.backingHeight / dpr}px`, imageRendering: "pixelated" }}
    />
  );
}
