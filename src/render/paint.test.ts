import { describe, expect, it } from "vitest";
import { CLASSES } from "../game/classes";
import { createGroundCache, createSpriteCache, paintScene, visibleArt, type Ctx2D, type MakeCanvas } from "./paint";
import { buildScene, type Scene, type SceneInput } from "./scene";
import { CLASS_ITEMS } from "./sprites";
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
  zone: "peaks",
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
  archiveOpen: false,
  lighthouseLit: false,
  matcherSolved: false,
  earned: [],
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

  it("draws ground, glints, flat, upright, drone, tint, light, snow in that order", () => {
    const { sprites, ground } = setup();
    const ctx = recorder();
    const world = fitWorld({ width: 600, height: 360, dpr: 1 });
    const scene: Scene = {
      zone: "peaks",
      glints: [{ x: 100, y: 56, color: "#ffffff", alpha: 1 }],
      flat: [{ sprite: "plank", frame: 0, x: 147, y: 47, flip: false, rotate: false, variant: "base" }],
      upright: [{ sprite: "tower", frame: 0, x: 37, y: 1, flip: false, rotate: false, variant: "base" }],
      drone: { sprite: "drone", frame: 0, x: 94, y: 82, flip: false, rotate: false, variant: "base" },
      tint: "rgba(20,20,28,0.25)",
      light: [{ x: 45, y: 3, color: "#4ade80", alpha: 0.5 }],
      snow: [{ x: 10, y: 10, color: "#f1f5f9", alpha: 1 }],
    };
    paintScene(ctx, scene, world, sprites, ground);
    const steps = ctx.log
      .filter((c) => c[0] === "drawImage" || c[0] === "fillRect")
      .map((c) => {
        if (c[0] === "drawImage") {
          const img = c[1] as FakeImage;
          return img.w === 26 ? "flat" : img.w === 16 && img.h === 32 ? "upright" : img.w === 12 ? "drone" : "ground";
        }
        return c[1] === "#ffffff" ? "glint" : c[1] === "#f1f5f9" ? "snow" : c[1] === scene.tint ? "tint" : "light";
      });
    expect(steps).toEqual(["ground", "glint", "flat", "upright", "drone", "tint", "light", "snow"]);
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
    const first = ground.get(a, "village");
    const count = made.length;
    expect(ground.get(a, "village")).toBe(first);
    expect(made.length).toBe(count);
    const second = ground.get(fitWorld({ width: 354, height: 360, dpr: 3 }), "village");
    expect(second).not.toBe(first);
    expect(made.length).toBeGreaterThan(count);
    // It covers the visible art range: on the phone, 90 art px of scenery above and below.
    expect(second).toMatchObject({ x: -17, y: -90 });
    expect((second!.image as unknown as FakeImage).h).toBe(360);
  });

  it("in a zone bigger than a screen the ground is baked with a margin, so walking across it reuses it and a new scale rebuilds it", () => {
    const { ground, made } = setup();
    const at = (x: number) => fitWorld({ width: 668, height: 360, dpr: 1 }, 0, { x, y: 180 }, { width: 640, height: 360 });
    const first = ground.get(at(300), "forest");
    const count = made.length;
    for (const x of [305, 312, 330, 350, 450, 600]) expect(ground.get(at(x), "forest"), `x ${x}`).toBe(first);
    expect(made.length).toBe(count);
    expect(ground.get(fitWorld({ width: 354, height: 360, dpr: 3 }, 0, { x: 300, y: 180 }, { width: 640, height: 360 }), "forest")).not.toBe(first);
    // The baked region always covers what the view shows.
    for (const x of [300, 340, 420, 600]) {
      const g = ground.get(at(x), "forest")!;
      const view = visibleArt(at(x));
      expect(g.x <= view.x && g.y <= view.y, `x ${x} origin`).toBe(true);
      expect(g.x + (g.image as unknown as FakeImage).w >= view.x + view.w, `x ${x} right`).toBe(true);
    }
  });

  it("the ground cache bakes only the wall tiles beyond the world, in feet-row order with the scenery", () => {
    const { ground, sprites, contexts } = setup();
    // The Peaks are 640 × 360: a ground baked with its margin reaches past both sides of the world.
    const g = ground.get(fitWorld({ width: 668, height: 360, dpr: 1 }, 0, { x: 320, y: 180 }, { width: 640, height: 360 }), "peaks")!;
    const wallImage = sprites.get("wall", 0, "base", false, false);
    const draws = contexts.get(g.image as unknown as FakeImage)!.log.filter((c) => c[0] === "drawImage");
    const walls = draws.filter((c) => c[1] === wallImage);
    const xs = walls.map((c) => (c[2] as number) + g.x);
    expect(xs.some((x) => x < 0) && xs.some((x) => x >= 640)).toBe(true);
    expect(xs.every((x) => x < 0 || x >= 640)).toBe(true);
    expect(walls.every((c) => (c[3] as number) + g.y === 168)).toBe(true);
    const feet = draws.map((c) => (c[3] as number) + g.y + (c[1] as FakeImage).h - 1);
    expect([...feet].sort((a, b) => a - b)).toEqual(feet);
    for (let i = 1; i < draws.length; i++)
      if (feet[i] === feet[i - 1]) expect(draws[i][1] === wallImage && draws[i - 1][1] !== wallImage, `tie at ${i}`).toBe(false);
  });

  it("the ground cache is rebuilt when the zone changes and reused when it doesn't", () => {
    const { ground, made } = setup();
    const w = fitWorld({ width: 668, height: 360, dpr: 1 });
    const a = ground.get(w, "peaks");
    const n = made.length;
    const b = ground.get(w, "village");
    expect(b).not.toBe(a);
    expect(made.length).toBeGreaterThan(n);
    const m = made.length;
    expect(ground.get(w, "village")).toBe(b);
    expect(made.length).toBe(m);
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

  describe("class variants", () => {
    const fills = (contexts: ReturnType<typeof maker>["contexts"], img: CanvasImageSource | null) =>
      contexts.get(img as unknown as FakeImage)!.log.filter((c) => c[0] === "fillRect") as [string, string, number, number, number, number, number][];

    it("a class variant is its own cached image, distinct from the plain hood", () => {
      const { sprites, made } = setup();
      const plain = sprites.get("explorer-down", 0, "#f472b6", false, false);
      const mage = sprites.get("explorer-down", 0, "#f472b6:mage", false, false);
      expect(mage).not.toBe(plain);
      const n = made.length;
      expect(sprites.get("explorer-down", 0, "#f472b6:mage", false, false)).toBe(mage);
      expect(made.length).toBe(n);
    });

    it("no two variants, hoods, flips or rotations share a cache entry", () => {
      const { sprites } = setup();
      const images = new Set<unknown>();
      let count = 0;
      for (const variant of ["#f472b6", "#f472b6:mage", "#f472b6:tank", "#22c55e:mage"])
        for (const flip of [false, true])
          for (const rotate of [false, true]) {
            images.add(sprites.get("explorer-down", 0, variant, flip, rotate));
            count++;
          }
      expect(images.size).toBe(count);
    });

    it("paints the class cloak colour and the item colours over the explorer", () => {
      const { sprites, contexts } = setup();
      const colours = new Set(fills(contexts, sprites.get("explorer-down", 0, "#f472b6:mage", false, false)).map((c) => c[1]));
      expect(colours).toContain(CLASSES.mage.outfit);
      expect(colours).toContain("#f472b6");
      expect(colours).toContain(CLASS_ITEMS.mage.palette.i);
      expect(colours).toContain(CLASS_ITEMS.mage.palette.j);
    });

    it("an unknown class paints exactly like the plain hood", () => {
      const { sprites, contexts } = setup();
      const plain = fills(contexts, sprites.get("explorer-down", 0, "#f472b6", false, false));
      const bad = fills(contexts, sprites.get("explorer-down", 0, "#f472b6:nonsense", false, false));
      expect(bad).toEqual(plain);
    });

    it("the downed grey ignores any class", () => {
      const { sprites, contexts } = setup();
      const grey = fills(contexts, sprites.get("explorer-down", 0, "grey", false, false));
      const greyMage = fills(contexts, sprites.get("explorer-down", 0, "grey:mage", false, false));
      expect(greyMage).toEqual(grey);
    });

    it("flipping mirrors the item too", () => {
      const { sprites, contexts } = setup();
      const itemFills = (flip: boolean) =>
        fills(contexts, sprites.get("explorer-right", 0, "#22c55e:archer", flip, false)).filter((c) => c[1] === CLASS_ITEMS.archer.palette.i || c[1] === CLASS_ITEMS.archer.palette.j);
      const minX = Math.min(...itemFills(false).map((c) => c[3]));
      const maxEnd = Math.max(...itemFills(true).map((c) => c[3] + c[5] - 1));
      expect(minX).toBe(0);
      expect(maxEnd).toBe(15);
    });
  });

  it("returns null when no canvas can be made", () => {
    const sprites = createSpriteCache(() => null);
    expect(sprites.get("tower", 0, "base", false, false)).toBeNull();
    expect(createGroundCache(() => null, sprites).get(fitWorld({ width: 600, height: 360, dpr: 1 }), "peaks")).toBeNull();
  });
});
