import { describe, expect, it } from "vitest";
import { createGroundCache, createSpriteCache, paintScene, type Ctx2D, type MakeCanvas } from "./paint";
import { buildScene, type Scene, type SceneInput } from "./scene";
import { fitWorld, toArt } from "./world";

type Call = [string, ...unknown[]];
type FakeImage = { id: number; w: number; h: number };

/** A recording 2D context; it has no arc or gradient methods at all. */
function recorder(): Ctx2D & { log: Call[] } {
  const log: Call[] = [];
  let fill: unknown = "#000000";
  let alpha = 1;
  let smoothing = true;
  return {
    log,
    setTransform: (...a: number[]) => void log.push(["setTransform", ...a]),
    drawImage: (img: unknown, x: number, y: number) => void log.push(["drawImage", img, x, y]),
    fillRect: (...a: number[]) => void log.push(["fillRect", fill, alpha, ...a]),
    clearRect: (...a: number[]) => void log.push(["clearRect", ...a]),
    get fillStyle() {
      return fill as string;
    },
    set fillStyle(v) {
      fill = v;
    },
    get globalAlpha() {
      return alpha;
    },
    set globalAlpha(v) {
      alpha = v;
    },
    get imageSmoothingEnabled() {
      return smoothing;
    },
    set imageSmoothingEnabled(v) {
      smoothing = v;
      log.push(["smoothing", v]);
    },
  };
}

function maker() {
  const made: FakeImage[] = [];
  const contexts = new Map<FakeImage, ReturnType<typeof recorder>>();
  const make: MakeCanvas = (w, h) => {
    const image = { id: made.length, w, h };
    made.push(image);
    const ctx = recorder();
    contexts.set(image, ctx);
    return { image: image as unknown as CanvasImageSource, ctx };
  };
  return { make, made, contexts };
}

const input: SceneInput = {
  player: { x: 28, y: 72 },
  drone: { x: 36, y: 70 },
  teammates: [{ id: "k", name: "Kai", color: "#a78bfa", x: 60, y: 60 }],
  playerColor: "#22c55e",
  downed: false,
  hasLoot: false,
  gateUnlocked: true,
  clueDecoded: true,
  artifactFound: false,
  towerPowered: true,
  minutes: 23 * 60,
};
const fullScene = () =>
  buildScene(
    input,
    {
      player: { ...toArt(input.player), facing: "down", frame: 1 },
      drone: { ...toArt(input.drone), facing: "down", frame: 0 },
      teammates: { k: { ...toArt(input.teammates[0]), facing: "left", frame: 2 } },
    },
    0,
    false,
  );

function setup() {
  const { make, made, contexts } = maker();
  const sprites = createSpriteCache(make);
  const ground = createGroundCache(make, sprites);
  return { make, made, contexts, sprites, ground };
}

describe("paintScene", () => {
  it("every call resets the transform, turns smoothing off and applies s, ox, oy", () => {
    const { sprites, ground } = setup();
    const ctx = recorder();
    const world = fitWorld({ width: 668, height: 360, dpr: 2 });
    for (let i = 0; i < 2; i++) {
      ctx.log.length = 0;
      paintScene(ctx, fullScene(), world, sprites, ground);
      expect(ctx.log[0]).toEqual(["setTransform", 1, 0, 0, 1, 0, 0]);
      const smoothingAt = ctx.log.findIndex((c) => c[0] === "smoothing");
      const scaledAt = ctx.log.findIndex((c) => c[0] === "setTransform" && c[1] === 4);
      expect(ctx.log[smoothingAt]).toEqual(["smoothing", false]);
      expect(ctx.log[scaledAt]).toEqual(["setTransform", 4, 0, 0, 4, 28, 0]);
      expect(smoothingAt).toBeLessThan(scaledAt);
    }
  });

  it("draws ground, glints, flat, upright, drone, tint, light in that order", () => {
    const { sprites, ground } = setup();
    const ctx = recorder();
    const world = fitWorld({ width: 600, height: 360, dpr: 1 });
    const scene: Scene = {
      glints: [{ x: 100, y: 56, color: "#ffffff", alpha: 1 }],
      flat: [{ sprite: "plank", frame: 0, x: 147, y: 47, flip: false, rotate: false, variant: "base" }],
      upright: [{ sprite: "tower", frame: 0, x: 37, y: 1, flip: false, rotate: false, variant: "base" }],
      drone: { sprite: "drone", frame: 0, x: 94, y: 82, flip: false, rotate: false, variant: "base" },
      tint: "rgba(20,20,28,0.25)",
      light: [{ x: 45, y: 3, color: "#4ade80", alpha: 0.5 }],
    };
    paintScene(ctx, scene, world, sprites, ground);
    const steps = ctx.log
      .filter((c) => c[0] === "drawImage" || c[0] === "fillRect")
      .map((c) => {
        if (c[0] === "drawImage") {
          const img = c[1] as FakeImage;
          return img.w === 26 ? "flat" : img.w === 16 && img.h === 32 ? "upright" : img.w === 12 ? "drone" : "ground";
        }
        return c[1] === "#ffffff" ? "glint" : c[1] === scene.tint ? "tint" : "light";
      });
    expect(steps).toEqual(["ground", "glint", "flat", "upright", "drone", "tint", "light"]);
  });

  it("sprites and pixels land on whole art pixels", () => {
    const { sprites, ground } = setup();
    const ctx = recorder();
    paintScene(ctx, fullScene(), fitWorld({ width: 354, height: 360, dpr: 3 }), sprites, ground);
    const placed = ctx.log.filter((c) => c[0] === "drawImage" || (c[0] === "fillRect" && c[3] !== 0));
    expect(placed.length).toBeGreaterThan(10);
    for (const c of placed) {
      const [x, y] = c[0] === "drawImage" ? [c[2], c[3]] : [c[3], c[4]];
      expect(Number.isInteger(x) && Number.isInteger(y), JSON.stringify(c)).toBe(true);
    }
  });

  it("tint fills the whole canvas under the identity transform", () => {
    const { sprites, ground } = setup();
    const ctx = recorder();
    const world = fitWorld({ width: 354, height: 360, dpr: 3 });
    paintScene(ctx, fullScene(), world, sprites, ground);
    const at = ctx.log.findIndex((c) => c[0] === "fillRect" && c[1] === "rgba(20,20,28,0.25)");
    expect(ctx.log[at].slice(3)).toEqual([0, 0, world.backingWidth, world.backingHeight]);
    const lastTransform = ctx.log.slice(0, at).filter((c) => c[0] === "setTransform").pop();
    expect(lastTransform).toEqual(["setTransform", 1, 0, 0, 1, 0, 0]);
  });

  it("never draws arcs or gradients", () => {
    const { sprites, ground } = setup();
    expect(() => paintScene(recorder(), fullScene(), fitWorld({ width: 668, height: 360, dpr: 1 }), sprites, ground)).not.toThrow();
  });
});

describe("caches", () => {
  it("the ground cache is reused for the same key and rebuilt on a new one", () => {
    const { ground, made } = setup();
    const a = fitWorld({ width: 668, height: 360, dpr: 1 });
    const first = ground.get(a);
    const count = made.length;
    expect(ground.get(a)).toBe(first);
    expect(made.length).toBe(count);
    const second = ground.get(fitWorld({ width: 354, height: 360, dpr: 3 }));
    expect(second).not.toBe(first);
    expect(made.length).toBeGreaterThan(count);
    // It covers the visible art range: on the phone, 90 art px of scenery above and below.
    expect(second).toMatchObject({ x: -17, y: -90 });
    expect((second!.image as unknown as FakeImage).h).toBe(360);
  });

  it("the ground cache bakes only the wall tiles beyond the world, in feet-row order with the scenery", () => {
    const { ground, sprites, contexts } = setup();
    // 668 × 360 at DPR 1: s 2, the visible art runs from x −7 to 326, past both sides of the world.
    const g = ground.get(fitWorld({ width: 668, height: 360, dpr: 1 }))!;
    const wallImage = sprites.get("wall", 0, "base", false, false);
    const draws = contexts.get(g.image as unknown as FakeImage)!.log.filter((c) => c[0] === "drawImage");
    const walls = draws.filter((c) => c[1] === wallImage);
    expect(walls.map((c) => (c[2] as number) + g.x)).toEqual([-16, 320]);
    expect(walls.every((c) => (c[3] as number) + g.y === 80)).toBe(true);
    const feet = draws.map((c) => (c[3] as number) + g.y + (c[1] as FakeImage).h - 1);
    expect([...feet].sort((a, b) => a - b)).toEqual(feet);
    for (let i = 1; i < draws.length; i++)
      if (feet[i] === feet[i - 1]) expect(draws[i][1] === wallImage && draws[i - 1][1] !== wallImage, `tie at ${i}`).toBe(false);
  });

  it("builds a new colour variant lazily", () => {
    const { sprites, made } = setup();
    const before = made.length;
    const img = sprites.get("explorer-down", 0, "#f472b6", false, false);
    expect(made.length).toBe(before + 1);
    expect(sprites.get("explorer-down", 0, "#f472b6", false, false)).toBe(img);
    expect(made.length).toBe(before + 1);
    sprites.get("explorer-down", 0, "#a78bfa", false, false);
    expect(made.length).toBe(before + 2);
  });

  it("returns null when no canvas can be made", () => {
    const sprites = createSpriteCache(() => null);
    expect(sprites.get("tower", 0, "base", false, false)).toBeNull();
    expect(createGroundCache(() => null, sprites).get(fitWorld({ width: 600, height: 360, dpr: 1 }))).toBeNull();
  });
});
