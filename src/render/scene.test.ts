import { describe, expect, it } from "vitest";
import { PHASE_TINT, buildScene, type Poses, type SceneInput } from "./scene";
import { LIGHTS, SPRITES, spriteBox } from "./sprites";
import { BRIDGE_RECT, LANDMARK_POINTS } from "./terrain";
import { toArt } from "./world";

const DAY = 12 * 60;
const DUSK = 19 * 60;
const NIGHT = 23 * 60;

const base: SceneInput = {
  player: { x: 28, y: 72 },
  drone: { x: 36, y: 70 },
  teammates: [],
  playerColor: "#22c55e",
  downed: false,
  hasLoot: false,
  gateUnlocked: false,
  clueDecoded: false,
  artifactFound: false,
  towerPowered: false,
  minutes: DUSK,
};

const posesFor = (input: SceneInput): Poses => ({
  player: { ...toArt(input.player), facing: "down", frame: 0 },
  drone: { ...toArt(input.drone), facing: "down", frame: 0 },
  teammates: Object.fromEntries(input.teammates.map((t) => [t.id, { ...toArt(t), facing: "down" as const, frame: 0 as const }])),
});

const scene = (over: Partial<SceneInput> = {}, t = 0, reduced = false) => {
  const input = { ...base, ...over };
  return buildScene(input, posesFor(input), t, reduced);
};
const sprites = (s: ReturnType<typeof scene>, layer: "flat" | "upright") => s[layer].map((d) => d.sprite);
const near = (p: { x: number; y: number }, c: { x: number; y: number }, r: number) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) <= r;
const SEMI_CENTRE = { x: 230, y: 145 };
// Ring pixels: around the tower's base (45, 32), farther than its 3 px core and within its 28 px reach.
const aroundTower = (p: { x: number; y: number }) => { const d = Math.hypot(p.x - 45, p.y - 32); return d > 3.5 && d <= 29; };

describe("scene: what is drawn", () => {
  it("chest open only when looted", () => {
    expect(sprites(scene(), "upright")).toContain("chest-closed");
    expect(sprites(scene({ hasLoot: true }), "upright")).toContain("chest-open");
    expect(sprites(scene({ hasLoot: true }), "upright")).not.toContain("chest-closed");
  });

  it("bridge planks only when the tower is powered, covering BRIDGE_RECT", () => {
    expect(sprites(scene(), "flat")).not.toContain("plank");
    expect(sprites(scene({ gateUnlocked: true }), "flat")).not.toContain("plank");
    const planks = scene({ towerPowered: true }).flat.filter((d) => d.sprite === "plank");
    expect(planks).toHaveLength(9);
    expect(planks.every((p) => p.x === BRIDGE_RECT.x)).toBe(true);
    expect(planks.map((p) => p.y)).toEqual([47, 50, 53, 56, 59, 62, 65, 68, 71]);
  });

  it("X only while decoded and not found; semicolon only when found", () => {
    expect(sprites(scene(), "flat")).not.toContain("x-mark");
    const decoded = scene({ clueDecoded: true });
    const xBox = spriteBox("x-mark", LANDMARK_POINTS.dig);
    expect(decoded.flat.find((d) => d.sprite === "x-mark")).toMatchObject({ x: xBox.x, y: xBox.y });
    expect(sprites(decoded, "upright")).not.toContain("semicolon");
    const found = scene({ clueDecoded: true, artifactFound: true });
    expect(sprites(found, "flat")).not.toContain("x-mark");
    const semiBox = spriteBox("semicolon", LANDMARK_POINTS.dig);
    expect(found.upright.find((d) => d.sprite === "semicolon")).toMatchObject({ x: semiBox.x, y: semiBox.y });
  });

  it("flat overlays come before every explorer whatever their rows", () => {
    const s = scene({ towerPowered: true, player: { x: 50, y: 28 } });
    expect(sprites(s, "flat")).toContain("plank");
    const me = s.upright.find((d) => d.sprite.startsWith("explorer"))!;
    expect(me.y + 15).toBe(50);
    expect(sprites(s, "upright")).not.toContain("plank");
  });

  it("upright sprites sorted by feet row, explorers last on ties", () => {
    const s = scene({ player: { x: 50, y: 50 } });
    const feet = s.upright.map((d) => d.y + SPRITES[d.sprite].h - 1);
    expect([...feet].sort((a, b) => a - b)).toEqual(feet);
    const gate = s.upright.findIndex((d) => d.sprite === "gate");
    const me = s.upright.findIndex((d) => d.sprite.startsWith("explorer"));
    expect(me).toBeGreaterThan(gate);
  });

  it("the drone is separate and hovers 12 px up", () => {
    const s = scene();
    expect(sprites(s, "upright")).not.toContain("drone");
    expect(s.drone).toMatchObject({ sprite: "drone", ...{ x: spriteBox("drone", toArt(base.drone)).x, y: spriteBox("drone", toArt(base.drone)).y } });
  });

  it("explorers face the way their pose says, left as the mirrored right", () => {
    const input = { ...base };
    const poses = posesFor(input);
    const left = buildScene(input, { ...poses, player: { ...poses.player, facing: "left", frame: 2 } }, 0, false);
    expect(left.upright.find((d) => d.sprite.startsWith("explorer"))).toMatchObject({ sprite: "explorer-right", flip: true, frame: 2 });
  });

  it("teammates use their colour as the variant; the player uses playerColor", () => {
    const s = scene({ playerColor: "#f472b6", teammates: [{ id: "k", name: "Kai", color: "#a78bfa", x: 60, y: 60 }] });
    const variants = s.upright.filter((d) => d.sprite.startsWith("explorer")).map((d) => d.variant).sort();
    expect(variants).toEqual(["#a78bfa", "#f472b6"]);
  });

  it("downed: the player is rotated and grey; teammates never are", () => {
    const s = scene({ downed: true, teammates: [{ id: "k", name: "Kai", color: "#a78bfa", x: 60, y: 60 }] });
    const explorers = s.upright.filter((d) => d.sprite.startsWith("explorer"));
    expect(explorers.find((d) => d.variant === "grey")).toMatchObject({ rotate: true, sprite: "explorer-down", frame: 0 });
    expect(explorers.find((d) => d.variant === "#a78bfa")).toMatchObject({ rotate: false });
  });

  it("tint equals PHASE_TINT for the phase", () => {
    expect(PHASE_TINT).toEqual({ Night: "rgba(20,20,28,0.25)", Dusk: "rgba(40,40,32,0.12)", Day: "transparent" });
    expect(scene({ minutes: DAY }).tint).toBe("transparent");
    expect(scene({ minutes: DUSK }).tint).toBe(PHASE_TINT.Dusk);
    expect(scene({ minutes: NIGHT }).tint).toBe(PHASE_TINT.Night);
  });
});

describe("scene: light", () => {
  const lamp = (s: ReturnType<typeof scene>) => s.light.find((p) => p.x === LIGHTS.towerLamp.x && p.y === LIGHTS.towerLamp.y && p.alpha === 1);

  it("tower lamp blinks red every 500 ms when unpowered, steady green when powered", () => {
    expect(lamp(scene({}, 0))?.color).toBe("#ef4444");
    expect(lamp(scene({}, 500))).toBeUndefined();
    expect(lamp(scene({}, 1000))?.color).toBe("#ef4444");
    expect(lamp(scene({ towerPowered: true }, 0))?.color).toBe("#4ade80");
    expect(lamp(scene({ towerPowered: true }, 500))?.color).toBe("#4ade80");
  });

  it("ring radius and alpha", () => {
    const ring = (t: number) =>
      scene({ towerPowered: true, minutes: DAY }, t).light.filter((p) => !near(p, LIGHTS.towerLamp, 0) && aroundTower(p));
    const r0 = ring(0);
    expect(r0.length).toBeGreaterThan(0);
    expect(r0.every((p) => Math.abs(Math.hypot(p.x - 45, p.y - 32) - 4) < 1 && p.alpha === 1)).toBe(true);
    const r500 = ring(500);
    expect(r500.every((p) => Math.abs(Math.hypot(p.x - 45, p.y - 32) - 16) < 1 && p.alpha === 0.5)).toBe(true);
    expect(ring(1500)).toHaveLength(0);
  });

  it("glow strength by phase", () => {
    const glowAlphas = (minutes: number) =>
      [...new Set(scene({ minutes }, 0).light.filter((p) => near(p, LIGHTS.gateTerminal, 6) && p.alpha < 1).map((p) => p.alpha))].sort();
    expect(glowAlphas(DAY)).toEqual([]);
    const dusk = glowAlphas(DUSK);
    expect(dusk).toHaveLength(3);
    [0.075, 0.15, 0.25].forEach((a, i) => expect(dusk[i]).toBeCloseTo(a));
    const night = glowAlphas(NIGHT);
    [0.15, 0.3, 0.5].forEach((a, i) => expect(night[i]).toBeCloseTo(a));
  });

  it("semicolon glow steps 0.25, 0.5, 0.75, 1, 0.75, 0.5 every 267 ms", () => {
    const strength = (t: number) => {
      const inner = scene({ clueDecoded: true, artifactFound: true, minutes: DAY }, t).light.filter(
        (p) => p.color === "#fbbf24" && near(p, SEMI_CENTRE, 2),
      );
      return Math.max(...inner.map((p) => p.alpha)) / 0.5;
    };
    [0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25].forEach((s, i) => expect(strength(i * 267 + 1)).toBeCloseTo(s));
  });

  it("ice glints come and go; the dig X glints", () => {
    expect(scene({}, 0).glints.length).toBeGreaterThan(0);
    expect(scene({}, 300).glints).toHaveLength(0);
    const xGlint = (t: number) => scene({ clueDecoded: true }, t).light.filter((p) => near(p, LANDMARK_POINTS.dig, 4) && p.color === "#ffffff");
    expect(xGlint(0).length).toBeGreaterThan(0);
    expect(xGlint(300)).toHaveLength(0);
  });

  it("reduced motion: steady lamp, no ring, no glints, cursor on, semicolon glow at 1, drone still", () => {
    const at = (t: number) => scene({ clueDecoded: true, artifactFound: true }, t, true);
    expect(lamp(at(500))?.color).toBe("#ef4444");
    const powered = scene({ towerPowered: true, minutes: DAY }, 0, true);
    expect(powered.light.filter((p) => !near(p, LIGHTS.towerLamp, 0) && aroundTower(p))).toHaveLength(0);
    expect(at(0).glints).toHaveLength(0);
    for (const t of [0, 530, 1060]) expect(at(t).light.some((p) => p.x === LIGHTS.gateTerminal.x && p.y === LIGHTS.gateTerminal.y && p.alpha === 1)).toBe(true);
    const semi = at(0).light.filter((p) => p.color === "#fbbf24" && near(p, SEMI_CENTRE, 2));
    expect(Math.max(...semi.map((p) => p.alpha))).toBeCloseTo(0.5);
    expect([at(0).drone.y, at(0).drone.frame]).toEqual([at(400).drone.y, at(400).drone.frame]);
    expect(at(0).drone.frame).toBe(at(125).drone.frame);
  });

  it("without reduced motion the drone bobs and spins", () => {
    expect(scene({}, 400).drone.y).toBe(scene({}, 0).drone.y - 1);
    expect(scene({}, 125).drone.frame).not.toBe(scene({}, 0).drone.frame);
  });
});

describe("scene: the north wall", () => {
  const walls = (s: ReturnType<typeof scene>) => s.upright.flatMap((d, i) => (d.sprite === "wall" ? [i] : []));
  const me = (s: ReturnType<typeof scene>) => s.upright.findIndex((d) => d.sprite.startsWith("explorer"));
  const gateAt = (s: ReturnType<typeof scene>) => s.upright.findIndex((d) => d.sprite === "gate");

  it("the wall stands across the world; north of it is behind, south in front, including at the edges", () => {
    expect(walls(scene())).toHaveLength(18);
    for (const x of [30, 6, 94]) {
      const north = scene({ player: { x, y: 48 } });
      expect(me(north), `x ${x}`).toBeLessThan(Math.min(...walls(north)));
    }
    const south = scene({ player: { x: 30, y: 52 } });
    expect(me(south)).toBeGreaterThan(Math.max(...walls(south)));
  });

  it("an explorer in the gate opening sorts around the gate", () => {
    const inFront = scene({ player: { x: 50, y: 50 } });
    expect(me(inFront)).toBeGreaterThan(gateAt(inFront));
    const behind = scene({ player: { x: 50, y: 46 } });
    expect(me(behind)).toBeLessThan(gateAt(behind));
  });

  it("the gate is barred while locked and open once solved", () => {
    const frame = (s: ReturnType<typeof scene>) => s.upright[gateAt(s)].frame;
    expect(frame(scene())).toBe(1);
    expect(frame(scene({ gateUnlocked: true }))).toBe(0);
  });
});
