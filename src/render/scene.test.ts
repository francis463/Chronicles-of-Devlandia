import { describe, expect, it } from "vitest";
import type { ZoneId } from "../game/zones";
import { AREAS } from "./areas";
import { FOGGATEN_POINTS, LAMP_POINT } from "./areas/foggaten";
import { DESERT_WILDLIFE, camelPose, fennecPose, scorpionPose, snakePose } from "./areas/desert";
import { FOREST_WILDLIFE, deerPose, rabbitPose, squirrelPose } from "./areas/forest";
import { VILLAGE_LIFE, wandererPose } from "./areas/village";
import { PHASE_TINT, buildScene, stormStrength, type Poses, type SceneInput } from "./scene";
import { LIGHTS, SPRITES, spriteBox, type SpriteId } from "./sprites";
import { BRIDGE_RECT, decorations } from "./terrain";
import { REACHABLE_RECT, intersects, toArt } from "./world";
import { TERMINAL } from "../game/constants";

const DAY = 12 * 60;
const DUSK = 19 * 60;
const NIGHT = 23 * 60;

const base: SceneInput = {
  zone: "peaks",
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
  archiveOpen: false,
  lighthouseLit: false,
  matcherSolved: false,
  earned: [],
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
const SEMI_CENTRE = { x: 275, y: 138 };
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
    const forest = (over: Partial<SceneInput> = {}, t = 0) => scene({ zone: "foggaten", player: { x: 68, y: 20 }, ...over }, t);
    expect(sprites(forest(), "flat")).not.toContain("x-mark");
    const decoded = forest({ clueDecoded: true });
    const xBox = spriteBox("x-mark", FOGGATEN_POINTS.dig);
    expect(decoded.flat.find((d) => d.sprite === "x-mark")).toMatchObject({ x: xBox.x, y: xBox.y });
    expect(sprites(decoded, "upright")).not.toContain("semicolon");
    const found = forest({ clueDecoded: true, artifactFound: true });
    expect(sprites(found, "flat")).not.toContain("x-mark");
    const semiBox = spriteBox("semicolon", FOGGATEN_POINTS.dig);
    expect(found.upright.find((d) => d.sprite === "semicolon")).toMatchObject({ x: semiBox.x, y: semiBox.y });
  });

  it("the Peaks and the forest draw neither the X nor the semicolon", () => {
    const peaks = scene({ clueDecoded: true, artifactFound: true });
    expect([...sprites(peaks, "flat"), ...sprites(peaks, "upright")]).not.toContain("x-mark");
    expect(sprites(peaks, "upright")).not.toContain("semicolon");
    expect(AREAS.peaks.protected.some((r) => JSON.stringify(r) === JSON.stringify(spriteBox("x-mark", FOGGATEN_POINTS.dig)))).toBe(false);
    expect(AREAS.foggaten.protected).toContainEqual(spriteBox("x-mark", FOGGATEN_POINTS.dig));
    expect(AREAS.foggaten.protected).toContainEqual(spriteBox("semicolon", FOGGATEN_POINTS.dig));
    const forest = scene({ zone: "forest", clueDecoded: true, artifactFound: true });
    expect([...sprites(forest, "flat"), ...sprites(forest, "upright")]).not.toContain("x-mark");
    expect(sprites(forest, "upright")).not.toContain("semicolon");
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

  it("a class rides on the variant: playerClass for you, cls for teammates; none keeps the plain colour", () => {
    const s = scene({ playerColor: "#f472b6", playerClass: "archer", teammates: [{ id: "k", name: "Kai", color: "#a78bfa", cls: "tank", x: 60, y: 60 }] });
    const variants = s.upright.filter((d) => d.sprite.startsWith("explorer")).map((d) => d.variant).sort();
    expect(variants).toEqual(["#a78bfa:tank", "#f472b6:archer"]);
  });

  it("two teammates of the same class differ by hood colour", () => {
    const s = scene({
      playerClass: "mage",
      teammates: [
        { id: "a", name: "Ann", color: "#a78bfa", cls: "mage", x: 60, y: 60 },
        { id: "b", name: "Bob", color: "#e2e8f0", cls: "mage", x: 70, y: 60 },
      ],
    });
    const variants = s.upright.filter((d) => d.sprite.startsWith("explorer")).map((d) => d.variant);
    expect(new Set(variants).size).toBe(3);
  });

  it("a downed player with a class is still the plain grey", () => {
    const s = scene({ downed: true, playerClass: "mage" });
    expect(s.upright.find((d) => d.sprite.startsWith("explorer"))).toMatchObject({ variant: "grey", rotate: true });
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

describe("scene: zones", () => {
  const inVillage: Partial<SceneInput> = { zone: "village", player: { x: 60, y: 70 }, drone: { x: 68, y: 68 } };
  const count = (s: ReturnType<typeof scene>, id: SpriteId) => s.upright.filter((d) => d.sprite === id).length;

  it("the village draws its huts, well, fences, signpost and Ada, and none of the Peaks' landmarks", () => {
    const s = scene(inVillage);
    expect((["hut", "well", "fence", "signpost", "wall"] as const).map((id) => count(s, id))).toEqual([5, 1, 4, 1, 0]);
    expect(s.upright.filter((d) => d.sprite === "explorer-down" && d.variant === "#b45309")).toHaveLength(1);
    for (const id of ["tower", "chest-closed", "chest-open", "gate", "semicolon"]) expect(sprites(s, "upright")).not.toContain(id);
    const busy = scene({ ...inVillage, towerPowered: true, clueDecoded: true });
    expect([busy.flat, busy.glints]).toEqual([[], []]);
    expect(busy.light).toEqual(scene(inVillage).light);
  });

  it("the Peaks draw the dock on the east shore; the island draws its own five landmarks", () => {
    expect(count(scene(), "dock")).toBe(1);
    const island = scene({ zone: "foggaten", player: { x: 30, y: 70 }, drone: { x: 34, y: 68 } });
    expect((["dock", "lighthouse", "ruins", "campfire"] as const).map((id) => count(island, id))).toEqual([1, 1, 1, 1]);
    expect(island.upright.filter((d) => d.sprite === "explorer-down" && d.variant === "#6b7f6a")).toHaveLength(1);
    for (const id of ["tower", "gate", "chest-closed"]) expect(sprites(island, "upright")).not.toContain(id);
  });

  it("the Peaks draw none of the village's props", () => {
    // The Peaks have their own camp signpost; the village's huts, well and fences are not there.
    for (const id of ["hut", "well", "fence"]) expect(sprites(scene(), "upright")).not.toContain(id);
  });

  it("the village scene's interior decorations are the village's own, even after a Peaks scene", () => {
    const DECOR: string[] = ["pine", "tree", "rock", "bush", "snow-rock", "birch", "stump", "log", "mushroom", "fern", "flowers"];
    const drawn = (s: ReturnType<typeof scene>) =>
      new Set(s.upright.filter((d) => DECOR.includes(d.sprite)).map((d) => `${d.sprite}@${d.x},${d.y}`));
    const peaks = drawn(scene());
    const village = drawn(scene(inVillage));
    const own = new Set(
      decorations(REACHABLE_RECT, AREAS.village)
        .map((d) => ({ sprite: d.sprite, box: spriteBox(d.sprite, d.at) }))
        .filter((d) => intersects(d.box, REACHABLE_RECT))
        .map((d) => `${d.sprite}@${d.box.x},${d.box.y}`),
    );
    expect(own.size).toBeGreaterThan(0);
    expect(village).toEqual(own);
    expect(village).not.toEqual(peaks);
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
      scene({ towerPowered: true, minutes: DAY }, t).light.filter((p) => p.color === "#4ade80" && !near(p, LIGHTS.towerLamp, 0) && aroundTower(p));
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
      const inner = scene({ zone: "foggaten", clueDecoded: true, artifactFound: true, minutes: DAY }, t).light.filter(
        (p) => p.color === "#fbbf24" && near(p, SEMI_CENTRE, 2),
      );
      return Math.max(...inner.map((p) => p.alpha)) / 0.5;
    };
    [0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25].forEach((s, i) => expect(strength(i * 267 + 1)).toBeCloseTo(s));
  });

  it("ice glints come and go; the dig X glints", () => {
    expect(scene({}, 0).glints.filter((p) => p.color === "#ffffff").length).toBeGreaterThan(0);
    expect(scene({}, 300).glints.filter((p) => p.color === "#ffffff")).toHaveLength(0);
    const xGlint = (t: number) => scene({ zone: "foggaten", clueDecoded: true }, t).light.filter((p) => near(p, FOGGATEN_POINTS.dig, 4) && p.color === "#ffffff");
    expect(xGlint(0).length).toBeGreaterThan(0);
    expect(xGlint(300)).toHaveLength(0);
  });

  it("reduced motion: steady lamp, no ring, no glints, cursor on, semicolon glow at 1, drone still", () => {
    const at = (t: number) => scene({ clueDecoded: true, artifactFound: true }, t, true);
    const forestAt = (t: number) => scene({ zone: "foggaten", clueDecoded: true, artifactFound: true }, t, true);
    expect(lamp(at(500))?.color).toBe("#ef4444");
    const powered = scene({ towerPowered: true, minutes: DAY }, 0, true);
    expect(powered.light.filter((p) => !near(p, LIGHTS.towerLamp, 0) && aroundTower(p))).toHaveLength(0);
    expect(at(0).glints.filter((p) => p.color === "#ffffff")).toHaveLength(0);
    for (const t of [0, 530, 1060]) expect(at(t).light.some((p) => p.x === LIGHTS.gateTerminal.x && p.y === LIGHTS.gateTerminal.y && p.alpha === 1)).toBe(true);
    const semi = forestAt(0).light.filter((p) => p.color === "#fbbf24" && near(p, SEMI_CENTRE, 2));
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

describe("scene: chests, the Syntax Terminal and the Archive", () => {
  const inVillage: Partial<SceneInput> = { zone: "village", player: { x: 60, y: 70 }, drone: { x: 68, y: 68 } };
  const of = (s: ReturnType<typeof scene>, id: SpriteId) => s.upright.filter((d) => d.sprite === id);
  const at = (s: ReturnType<typeof scene>, id: SpriteId, p: { x: number; y: number }) => {
    const box = spriteBox(id, p);
    return s.upright.find((d) => d.sprite === id && d.x === box.x && d.y === box.y);
  };

  it("the village scene draws the Archive (sealed frame) and the terminal (red frame); no hut at (176,116)", () => {
    const s = scene(inVillage);
    expect(at(s, "hut", { x: 176, y: 116 })).toBeUndefined();
    expect(at(s, "archive", { x: 176, y: 116 })?.frame).toBe(0);
    expect(at(s, "syntax-terminal", toArt(TERMINAL))?.frame).toBe(0);
    expect(at(scene({ ...inVillage, matcherSolved: true }), "syntax-terminal", toArt(TERMINAL))?.frame).toBe(1);
    expect(at(scene({ ...inVillage, archiveOpen: true }), "archive", { x: 176, y: 116 })?.frame).toBe(1);
  });

  it("only the village has the Syntax Terminal, and no zone draws anything for the chests (they are inside their landmarks)", () => {
    expect(of(scene({ zone: "village" }), "syntax-terminal")).toHaveLength(1);
    expect(of(scene(), "syntax-terminal")).toHaveLength(0);
  });

});

describe("scene: your view (weather and light)", () => {
  it("a night override at daytime tints and glows as night does", () => {
    const forced = scene({ minutes: DAY, lightMode: "night" });
    const real = scene({ minutes: NIGHT });
    expect(forced.tint).toBe(PHASE_TINT.Night);
    expect(forced.light).toEqual(real.light);
  });

  it("a day override at night is clear and unlit", () => {
    const forced = scene({ minutes: NIGHT, lightMode: "day" });
    const real = scene({ minutes: DAY });
    expect(forced.tint).toBe("transparent");
    expect(forced.light).toEqual(real.light);
  });

  it("auto and no override follow the clock, in both zones", () => {
    for (const zone of ["peaks", "village"] as const) {
      const over = { zone, player: { x: 60, y: 70 }, drone: { x: 68, y: 68 } };
      expect(scene({ ...over, minutes: NIGHT, lightMode: "auto" }).tint).toBe(PHASE_TINT.Night);
      expect(scene({ ...over, minutes: DAY }).tint).toBe("transparent");
      expect(scene({ ...over, minutes: DAY, lightMode: "night" }).tint).toBe(PHASE_TINT.Night);
    }
  });

  it("snow is 60 white flakes inside the world, in both zones", () => {
    for (const zone of ["peaks", "village"] as const) {
      const flakes = scene({ zone, snow: true }, 1234).snow;
      expect(flakes).toHaveLength(60);
      for (const f of flakes) {
        expect(f.color).toBe("#ffffff");
        expect(f.x >= 0 && f.x < 320 && f.y >= 0 && f.y < 180).toBe(true);
        expect(Number.isInteger(f.x) && Number.isInteger(f.y)).toBe(true);
      }
    }
  });

  it("the Peaks snow by default; the other zones only when asked; /weather clear turns it off everywhere", () => {
    expect(scene().snow).toHaveLength(60);
    expect(scene({ snow: false }, 3000).snow).toEqual([]);
    for (const zone of ["village", "forest", "foggaten"] as const) {
      expect(scene({ zone }, 3000).snow, zone).toEqual([]);
      expect(scene({ zone, snow: true }, 3000).snow, zone).toHaveLength(60);
    }
  });

  it("sparkles twinkle on the snow, and are still with reduced motion", () => {
    const SPARKLE = "#f8fafc";
    const sparkles = (t: number, reduced = false, zone: SceneInput["zone"] = "peaks") => scene({ zone }, t, reduced).glints.filter((p) => p.color === SPARKLE);
    expect(new Set([0, 800, 1600, 2400].map((t) => sparkles(t).map((p) => `${p.x},${p.y}`).join(" "))).size).toBeGreaterThan(1);
    expect(sparkles(0, true).length).toBeGreaterThan(0);
    expect(sparkles(0, true)).toEqual(sparkles(60_000, true));
    expect(sparkles(0, false, "village")).toEqual([]);
  });

  it("snow is a fixed function of time, and moves", () => {
    expect(scene({ snow: true }, 700).snow).toEqual(scene({ snow: true }, 700).snow);
    expect(scene({ snow: true }, 0).snow).not.toEqual(scene({ snow: true }, 5000).snow);
  });

  it("each flake falls 12 art px and drifts 2 right in a second, wrapping", () => {
    const a = scene({ snow: true }, 0).snow;
    const b = scene({ snow: true }, 1000).snow;
    a.forEach((f, i) => {
      expect(b[i].y).toBe((f.y + 12) % 180);
      expect(b[i].x).toBe((f.x + 2) % 320);
    });
  });

  it("flakes start at varied places", () => {
    const flakes = scene({ snow: true }, 0).snow;
    expect(new Set(flakes.map((f) => `${f.x},${f.y}`)).size).toBeGreaterThan(50);
  });

  it("reduced motion always draws the t = 0 flakes", () => {
    expect(scene({ snow: true }, 4321, true).snow).toEqual(scene({ snow: true }, 0, true).snow);
    expect(scene({ snow: true }, 4321, true).snow).toEqual(scene({ snow: true }, 0).snow);
  });
});

describe("scene: the Dense Forest", () => {
  const forest = (over: Partial<SceneInput> = {}, t = 0, reduced = false) =>
    scene({ zone: "forest", player: { x: 68, y: 20 }, drone: { x: 60, y: 20 }, ...over }, t, reduced);
  const at = (s: ReturnType<typeof scene>, sprite: SpriteId) => s.upright.filter((d) => d.sprite === sprite);

  it("draws the oak, campfire, signpost and the ranger, with no wall and none of the Peaks' landmarks", () => {
    const s = forest();
    for (const id of ["old-oak", "campfire", "signpost"] as SpriteId[]) expect(at(s, id), id).toHaveLength(1);
    expect(s.upright.filter((d) => d.sprite === "explorer-down" && d.variant === "#be123c")).toHaveLength(1);
    for (const id of ["wall", "tower", "gate", "chest-closed", "chest-open", "hut"] as SpriteId[]) expect(at(s, id), id).toHaveLength(0);
    for (const id of ["cabin", "well", "brook", "fairy-ring", "hollow-tree"] as SpriteId[]) expect(at(s, id), id).toHaveLength(1);
    expect(s.flat).toEqual([]);
  });

  it("the ranger and the explorer are y-sorted together", () => {
    const s = forest({ player: { x: 60, y: 80 } });
    const feet = s.upright.filter((d) => d.sprite !== "owl").map((d) => d.y + SPRITES[d.sprite].h - 1);
    expect(feet).toEqual([...feet].sort((a, b) => a - b));
  });

  it("the tint is the forest's own over the phase: exact by day, deeper at night", () => {
    expect(forest({ lightMode: "day" }).tint).toBe("rgba(10,30,40,0.18)");
    const night = forest({ lightMode: "night" }).tint;
    const alpha = Number(night.match(/,([\d.]+)\)$/)?.[1]);
    expect(night).toMatch(/^rgba\(\d+,\d+,\d+,[\d.]+\)$/);
    expect(alpha).toBeGreaterThan(0.18);
    expect(alpha).toBeCloseTo(1 - (1 - 0.18) * (1 - 0.25), 2);
  });

  it("the campfire glows at night strength, not by day, and flickers every 400 ms even when reduced", () => {
    const glowAt = (over: Partial<SceneInput>, t = 0, reduced = false) =>
      forest(over, t, reduced).light.filter((p) => p.color === "#fb923c");
    expect(glowAt({ lightMode: "day" })).toEqual([]);
    expect(glowAt({ lightMode: "night" }).length).toBeGreaterThan(0);
    const peak = (px: { alpha: number }[]) => Math.max(...px.map((p) => p.alpha));
    expect(peak(glowAt({ lightMode: "night" }, 0))).toBeCloseTo(0.5);
    expect(peak(glowAt({ minutes: DUSK, lightMode: "auto" }, 0))).toBeCloseTo(0.25);
    expect(glowAt({ lightMode: "night" }, 0)).not.toEqual(glowAt({ lightMode: "night" }, 400));
    expect(glowAt({ lightMode: "night" }, 0, true).length).toBeGreaterThan(0);
    const frames = (t: number) => at(forest({}, t), "campfire")[0].frame;
    expect([frames(0), frames(400), frames(800)]).toEqual([0, 1, 0]);
    expect(at(forest({}, 400, true), "campfire")[0].frame).toBe(0);
  });
});

describe("scene: the forest's leaves and dappled light", () => {
  const LEAF_COLORS = ["#a3e635", "#d97706"];
  const DAPPLE = "#fde68a";
  const forest = (t: number, reduced = false, over: Partial<SceneInput> = {}) => scene({ zone: "forest", minutes: DAY, ...over }, t, reduced);
  const leaves = (s: ReturnType<typeof scene>) => s.light.filter((p) => LEAF_COLORS.includes(p.color));
  const dapples = (s: ReturnType<typeof scene>) => s.light.filter((p) => p.color === DAPPLE);
  const key = (ps: Array<{ x: number; y: number }>) => ps.map((p) => `${p.x},${p.y}`).join(" ");

  it("24 leaves fall inside the world, and sunlight patches lie on the floor by day", () => {
    const s = forest(1234);
    expect(leaves(s)).toHaveLength(24);
    for (const p of leaves(s)) expect(p.x >= 0 && p.x < 320 && p.y >= 0 && p.y < 180 && Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
    expect(dapples(s).length).toBeGreaterThan(0);
  });

  it("the leaves drift over time and hold still with reduced motion", () => {
    expect(key(leaves(forest(0)))).not.toBe(key(leaves(forest(5000))));
    expect(key(leaves(forest(0, true)))).toBe(key(leaves(forest(5000, true))));
    expect(key(dapples(forest(0, true)))).toBe(key(dapples(forest(5000, true))));
  });

  it("the sunlight patches fade out at night, but the leaves still fall", () => {
    const night = forest(1234, false, { minutes: NIGHT });
    expect(dapples(night)).toEqual([]);
    expect(leaves(night)).toHaveLength(24);
  });

  it("no other zone has leaves or patches", () => {
    for (const zone of ["peaks", "village", "foggaten"] as const) {
      const s = scene({ zone, minutes: DAY }, 1234);
      expect(leaves(s)).toEqual([]);
      expect(dapples(s)).toEqual([]);
    }
  });
});

describe("scene: the lit lighthouse", () => {
  const LAMP = "#fde047";
  const island = (lit: boolean, t = 0, reduced = false, over: Partial<SceneInput> = {}) => scene({ zone: "foggaten", lighthouseLit: lit, minutes: DAY, ...over }, t, reduced);
  const lamplight = (s: ReturnType<typeof scene>) => s.light.filter((p) => p.color === LAMP);
  const beam = (s: ReturnType<typeof scene>) => lamplight(s).filter((p) => p.y === LAMP_POINT.y && Math.abs(p.x - LAMP_POINT.x) > 6);
  const frameOf = (s: ReturnType<typeof scene>) => s.upright.find((d) => d.sprite === "lighthouse")!.frame;

  it("is drawn dark and gives no light until the lamp is lit, then lit with a glow", () => {
    expect(frameOf(island(false))).toBe(0);
    expect(island(false).light).toEqual([]);
    expect(frameOf(island(true))).toBe(1);
    expect(lamplight(island(true)).some((p) => Math.abs(p.x - LAMP_POINT.x) <= 6 && Math.abs(p.y - LAMP_POINT.y) <= 6)).toBe(true);
    expect(frameOf(island(false))).toBe(0);
  });

  it("the beam sweeps right, then left, every 4 seconds, with alpha between 0.05 and 0.5, inside the world", () => {
    const right = beam(island(true, 0));
    const left = beam(island(true, 2500));
    expect(right.length).toBeGreaterThan(20);
    expect(right.every((p) => p.x > LAMP_POINT.x)).toBe(true);
    expect(left.every((p) => p.x < LAMP_POINT.x)).toBe(true);
    expect(beam(island(true, 4000)).every((p) => p.x > LAMP_POINT.x)).toBe(true);
    for (const p of [...right, ...left]) {
      expect(p.alpha).toBeGreaterThanOrEqual(0.05);
      expect(p.alpha).toBeLessThanOrEqual(0.5);
      expect(p.x >= 0 && p.x < 320 && p.y >= 0 && p.y < 180).toBe(true);
    }
  });

  it("with reduced motion the beam is steady, pointing right, and the glow is by day at half strength", () => {
    for (const t of [0, 2500, 5000]) expect(beam(island(true, t, true)).every((p) => p.x > LAMP_POINT.x)).toBe(true);
    expect(JSON.stringify(island(true, 0, true).light)).toBe(JSON.stringify(island(true, 2500, true).light));
  });

  it("no other zone changes when the lamp is lit", () => {
    for (const zone of ["peaks", "village", "forest"] as const) {
      const on = scene({ zone, lighthouseLit: true, minutes: DAY }, 1234);
      const off = scene({ zone, lighthouseLit: false, minutes: DAY }, 1234);
      expect(JSON.stringify(on)).toBe(JSON.stringify(off));
    }
  });
});

describe("scene: Dev Village's smoke, windows and wanderers", () => {
  const SMOKE = "#cbd5e1";
  const GLOW = "#fde68a";
  const village = (t: number, reduced = false, minutes = DUSK) => scene({ zone: "village", minutes }, t, reduced);
  const smoke = (s: ReturnType<typeof scene>) => s.light.filter((p) => p.color === SMOKE);
  const glowOf = (s: ReturnType<typeof scene>) => s.light.filter((p) => p.color === GLOW);
  const folk = (s: ReturnType<typeof scene>) => s.upright.filter((d) => d.sprite.startsWith("explorer") && VILLAGE_LIFE.wanderers.some((w) => w.variant === d.variant));
  const key = (ps: Array<{ x: number; y: number }>) => ps.map((p) => `${p.x},${p.y}`).join(" ");

  it("each of the five huts puffs four wisps of smoke that rise and drift, fading as they climb", () => {
    expect(smoke(village(0))).toHaveLength(80);
    expect(key(smoke(village(0)))).not.toBe(key(smoke(village(1500))));
    for (const p of smoke(village(0))) expect(p.alpha > 0 && p.alpha <= 0.6).toBe(true);
    const ys = (t: number) => smoke(village(t)).map((p) => p.y);
    expect(Math.min(...ys(0)) < Math.max(...ys(0))).toBe(true);
  });

  it("with reduced motion the smoke hangs still", () => {
    expect(key(smoke(village(0, true)))).toBe(key(smoke(village(60_000, true))));
    expect(smoke(village(0, true))).toHaveLength(80);
  });

  it("the windows and the lantern glow at dusk and night, and not by day", () => {
    const strength = (m: number) => glowOf(village(0, false, m)).reduce((n, p) => n + p.alpha, 0);
    expect(strength(NIGHT)).toBeGreaterThan(strength(DUSK));
    expect(glowOf(village(0, false, DUSK)).length).toBeGreaterThan(0);
    expect(glowOf(village(0, false, DAY))).toEqual([]);
  });

  it("three wanderers walk the square, move with time and stand still with reduced motion; they are not at Ada's spot", () => {
    expect(folk(village(0))).toHaveLength(3);
    const at = (t: number, reduced = false) => folk(village(t, reduced)).map((d) => `${d.x},${d.y},${d.frame},${d.flip}`).join("|");
    expect(at(0)).not.toBe(at(7000));
    expect(at(0, true)).toBe(at(60_000, true));
    expect(wandererPose(0, false, VILLAGE_LIFE.wanderers[0])).toMatchObject({ facing: expect.any(String) });
  });

  it("a chicken pecks, and the lantern, gardens and stall are drawn", () => {
    const s = village(0);
    const hen = (t: number) => village(t).upright.find((d) => d.sprite === "chicken")!.frame;
    expect(new Set([0, 600, 1200].map(hen)).size).toBe(2);
    expect(village(0, true).upright.find((d) => d.sprite === "chicken")!.frame).toBe(0);
    for (const id of ["lantern", "garden", "stall"] as const) expect(s.upright.some((d) => d.sprite === id), id).toBe(true);
  });

  it("no other zone has the village's smoke, wanderers or chicken", () => {
    for (const zone of ["peaks", "forest", "foggaten"] as const) {
      const s = scene({ zone, minutes: DUSK }, 1234);
      // The Peaks have their own lodge smoke; the village's huts are not there.
      if (zone !== "peaks") expect(smoke(s)).toEqual([]);
      expect(folk(s)).toEqual([]);
      expect(s.upright.some((d) => d.sprite === "chicken" || d.sprite === "lantern" || d.sprite === "stall" || d.sprite === "garden")).toBe(false);
    }
  });
});

describe("scene: the village's windmill, fountain and pond", () => {
  const village = (t: number, reduced = false, minutes = DAY) => scene({ zone: "village", minutes }, t, reduced);
  const frameOf = (s: ReturnType<typeof scene>, id: string) => s.upright.find((d) => d.sprite === id)!.frame;
  const SHIMMER = "#e0f2fe";
  const shimmer = (s: ReturnType<typeof scene>) => s.light.filter((p) => p.color === SHIMMER);

  it("the windmill's sails turn and the fountain's spray dances over time", () => {
    expect(new Set([0, 700, 1400].map((t) => frameOf(village(t), "windmill"))).size).toBe(2);
    expect(new Set([0, 300, 600].map((t) => frameOf(village(t), "fountain"))).size).toBe(2);
  });

  it("with reduced motion both stand still", () => {
    for (const id of ["windmill", "fountain"]) expect(frameOf(village(0, true), id)).toBe(0);
    expect(frameOf(village(5000, true), "windmill")).toBe(0);
  });

  it("the pond glints over time, all at once and still when motion is reduced", () => {
    expect(shimmer(village(0)).length).toBeGreaterThan(0);
    expect(new Set([0, 700, 1400].map((t) => shimmer(village(t)).map((p) => `${p.x},${p.y}`).join(" "))).size).toBeGreaterThan(1);
    expect(shimmer(village(0, true)).length).toBeGreaterThan(0);
    expect(shimmer(village(0, true))).toEqual(shimmer(village(90_000, true)));
  });

  it("the new huts give smoke and glowing windows like the old ones", () => {
    const smoke = village(0, false, DUSK).light.filter((p) => p.color === "#cbd5e1");
    expect(smoke).toHaveLength(5 * 16);
  });

  it("no other zone has them", () => {
    for (const zone of ["peaks", "forest", "foggaten"] as const) {
      const s = scene({ zone, minutes: DAY }, 1234);
      expect(shimmer(s)).toEqual([]);
      // The Peaks have benches of their own at the campfire.
      for (const id of ["windmill", "fountain", "pond", "fruit-tree", ...(zone === "peaks" ? [] : ["bench"])]) expect(s.upright.some((d) => d.sprite === id), `${zone} ${id}`).toBe(false);
    }
  });
});

describe("scene: the Peaks' footprints, aurora and cold", () => {
  const PRINT = "#94a3b8";
  const GREEN = "#34d399";
  const PURPLE = "#a78bfa";
  const BREATH = "#e2e8f0";
  const GUST = "#f1f5f9";
  const poses = (prints: Array<{ x: number; y: number; t: number }>): Poses => ({
    player: { x: 90, y: 130, facing: "down", frame: 0 },
    drone: { x: 98, y: 128, facing: "down", frame: 0 },
    teammates: {},
    prints,
  });
  const build = (input: Partial<SceneInput>, prints: Array<{ x: number; y: number; t: number }>, t: number, reduced = false) =>
    buildScene({ ...base, ...input }, poses(prints), t, reduced);

  it("footprints show where you walked and fade over 6 seconds, under the sprites", () => {
    const fresh = build({}, [{ x: 100, y: 120, t: 1000 }], 1000).glints.filter((p) => p.color === PRINT);
    const old = build({}, [{ x: 100, y: 120, t: 1000 }], 5000).glints.filter((p) => p.color === PRINT);
    expect(fresh.length).toBeGreaterThan(0);
    expect(old.length).toBe(fresh.length);
    expect(Math.max(...old.map((p) => p.alpha))).toBeLessThan(Math.min(...fresh.map((p) => p.alpha)));
    expect(build({}, [{ x: 100, y: 120, t: 1000 }], 7100).glints.filter((p) => p.color === PRINT)).toEqual([]);
  });

  it("the left and right feet alternate, and there are no footprints under reduced motion or in other zones", () => {
    const two = build({}, [{ x: 100, y: 120, t: 0 }, { x: 106, y: 120, t: 0 }], 0).glints.filter((p) => p.color === PRINT);
    expect(new Set(two.map((p) => p.x - (p.x > 103 ? 106 : 100))).size).toBeGreaterThan(1);
    expect(build({}, [{ x: 100, y: 120, t: 0 }], 0, true).glints.filter((p) => p.color === PRINT)).toEqual([]);
    expect(build({ zone: "village" }, [{ x: 100, y: 120, t: 0 }], 0).glints.filter((p) => p.color === PRINT)).toEqual([]);
  });

  it("the aurora ripples across the top at night, fainter at dusk, never by day, still when reduced, only in the Peaks", () => {
    const ribbons = (s: ReturnType<typeof scene>) => s.light.filter((p) => p.color === GREEN || p.color === PURPLE);
    const night = scene({ minutes: NIGHT }, 0);
    expect(ribbons(night).some((p) => p.color === GREEN)).toBe(true);
    expect(ribbons(night).some((p) => p.color === PURPLE)).toBe(true);
    for (const p of ribbons(night)) expect(p.y >= 0 && p.y < 16 && p.x >= 0 && p.x < 320).toBe(true);
    expect(JSON.stringify(ribbons(scene({ minutes: NIGHT }, 0)))).not.toBe(JSON.stringify(ribbons(scene({ minutes: NIGHT }, 3000))));
    expect(Math.max(...ribbons(scene({ minutes: DUSK }, 0)).map((p) => p.alpha))).toBeLessThan(Math.max(...ribbons(night).map((p) => p.alpha)));
    expect(ribbons(scene({ minutes: DAY }, 0))).toEqual([]);
    expect(JSON.stringify(ribbons(scene({ minutes: NIGHT }, 0, true)))).toBe(JSON.stringify(ribbons(scene({ minutes: NIGHT }, 7000, true))));
    expect(ribbons(scene({ zone: "village", minutes: NIGHT }, 0))).toEqual([]);
  });

  it("your breath puffs now and then in the cold, and a gust of snow sweeps across every 12 seconds; neither under reduced motion nor elsewhere", () => {
    const breath = (t: number, reduced = false, zone: SceneInput["zone"] = "peaks") => scene({ zone }, t, reduced).light.filter((p) => p.color === BREATH);
    expect(breath(100).length).toBeGreaterThan(0);
    expect(breath(1500)).toEqual([]);
    expect(breath(100, true)).toEqual([]);
    expect(breath(100, false, "village")).toEqual([]);
    const gust = (t: number, reduced = false) => scene({}, t, reduced).light.filter((p) => p.color === GUST);
    expect(gust(500).length).toBeGreaterThan(0);
    expect(gust(6000)).toEqual([]);
    expect(gust(12_500).length).toBeGreaterThan(0);
    expect(gust(500, true)).toEqual([]);
    for (const p of gust(900)) expect(p.x >= 0 && p.x < 320 && p.y >= 0 && p.y < 180).toBe(true);
  });
});

describe("scene: the Peaks' camp, wildlife and start arrow", () => {
  const peaks = (over: Partial<SceneInput> = {}, t = 0, reduced = false) => scene({ minutes: DAY, ...over }, t, reduced);
  const sprites = (s: ReturnType<typeof scene>, id: string) => s.upright.filter((d) => d.sprite === id);
  const SMOKE = "#cbd5e1";
  const GLOW = "#fde68a";
  const FIRE = "#fb923c";
  const key = (ps: Array<{ x: number; y: number }>) => ps.map((p) => `${p.x},${p.y}`).join(" ");

  it("draws the lodge, campfire, benches, waterfall, caves and trail posts in the Peaks only", () => {
    const s = peaks();
    expect(["lodge", "campfire", "bench", "waterfall", "cave-mouth"].map((id) => sprites(s, id).length)).toEqual([1, 1, 2, 1, 2]);
    expect(sprites(s, "post").length).toBeGreaterThanOrEqual(8);
    for (const zone of ["village", "forest", "foggaten"] as const) {
      const o = scene({ zone, minutes: DAY }, 0);
      for (const id of ["lodge", "waterfall", "cave-mouth", "post", "fox", "goat", "bird", "arrow"]) expect(sprites(o, id), `${zone} ${id}`).toEqual([]);
    }
  });

  it("the lodge smokes and the campfire flickers; their lights come on from dusk", () => {
    expect(peaks().light.filter((p) => p.color === SMOKE)).toHaveLength(16);
    expect(key(peaks({}, 0).light.filter((p) => p.color === SMOKE))).not.toBe(key(peaks({}, 1500).light.filter((p) => p.color === SMOKE)));
    expect(key(peaks({}, 0, true).light.filter((p) => p.color === SMOKE))).toBe(key(peaks({}, 9000, true).light.filter((p) => p.color === SMOKE)));
    expect(new Set([0, 400].map((t) => sprites(peaks({ minutes: DUSK }, t), "campfire")[0].frame)).size).toBe(2);
    expect(sprites(peaks({ minutes: DUSK }, 400, true), "campfire")[0].frame).toBe(0);
    const glow = (minutes: number) => peaks({ minutes }).light.filter((p) => p.color === GLOW || p.color === FIRE).reduce((n, p) => n + p.alpha, 0);
    expect(glow(DAY)).toBe(0);
    expect(glow(NIGHT)).toBeGreaterThan(glow(DUSK));
    expect(glow(DUSK)).toBeGreaterThan(0);
  });

  it("a fox, a goat and three birds live in the sky and snow; the fox backs away from you; all rest when motion is reduced", () => {
    const s = peaks({ player: { x: 90, y: 70 }, minutes: DUSK });
    expect([sprites(s, "fox").length, sprites(s, "goat").length, sprites(s, "bird").length]).toEqual([1, 1, 3]);
    const foxX = (player: { x: number; y: number }) => sprites(peaks({ player, minutes: DUSK }), "fox")[0].x;
    expect(foxX({ x: 84, y: 52 })).toBeGreaterThan(foxX({ x: 10, y: 10 }) - 20);
    const still = (t: number) => key(["fox", "goat", "bird"].flatMap((id) => sprites(peaks({ minutes: DUSK }, t, true), id)));
    expect(still(0)).toBe(still(60_000));
    const birds = (t: number) => key(sprites(peaks({ minutes: DUSK }, t), "bird"));
    expect(birds(0)).not.toBe(birds(3000));
  });

  it("a bouncing arrow marks the ski lodge, where the HTML chest is, until you have earned any badge", () => {
    expect(sprites(peaks(), "arrow")).toHaveLength(1);
    expect(sprites(peaks({ earned: ["chest-css"] }), "arrow")).toEqual([]);
    expect(new Set([0, 400].map((t) => sprites(peaks({}, t), "arrow")[0].y)).size).toBe(2);
    expect(sprites(peaks({}, 400, true), "arrow")[0].y).toBe(sprites(peaks({}, 0, true), "arrow")[0].y);
    const arrow = sprites(peaks(), "arrow")[0];
    expect(Math.abs(arrow.x + 4 - 62)).toBeLessThanOrEqual(1);
  });
});

describe("scene: the camp signpost, the weather station and the snow cave", () => {
  const peaks = (over: Partial<SceneInput> = {}, t = 0, reduced = false) => scene({ minutes: DAY, ...over }, t, reduced);
  const sprites = (s: ReturnType<typeof scene>, id: string) => s.upright.filter((d) => d.sprite === id);

  it("the Peaks have a camp signpost and a weather station whose anemometer spins", () => {
    expect(sprites(peaks(), "signpost")).toHaveLength(1);
    expect(sprites(peaks(), "station")).toHaveLength(1);
    expect(new Set([0, 300].map((t) => sprites(peaks({}, t), "station")[0].frame)).size).toBe(2);
    expect(sprites(peaks({}, 300, true), "station")[0].frame).toBe(0);
  });

  it("the snow cave is drawn only once the tower is powered, only in the Peaks", () => {
    expect(sprites(peaks(), "snow-cave")).toEqual([]);
    expect(sprites(peaks({ towerPowered: true }), "snow-cave")).toHaveLength(1);
    for (const zone of ["village", "forest", "foggaten"] as const) expect(sprites(scene({ zone, towerPowered: true }, 0), "snow-cave"), zone).toEqual([]);
  });

  it("the village has its own signpost and no weather station", () => {
    const v = scene({ zone: "village" }, 0);
    expect(sprites(v, "signpost")).toHaveLength(1);
    expect(sprites(v, "station")).toEqual([]);
  });
});

describe("scene: the Sunbaked Desert", () => {
  const desert = (t = 0, reduced = false, over: Partial<SceneInput> = {}) => scene({ zone: "desert", player: { x: 90, y: 70 }, drone: { x: 86, y: 68 }, minutes: DAY, ...over }, t, reduced);
  const LIZARD_ROCK = AREAS.desert.props.find((p) => p.sprite === "rock")!.at;

  it("draws the pyramid, oasis, palms, signpost, nomad and the lizard's rock, with no snow, chests or fog", () => {
    const s = desert();
    for (const id of ["pyramid", "oasis", "palm", "signpost", "rock", "explorer-down", "tumbleweed", "lizard"] as const) expect(sprites(s, "upright"), id).toContain(id);
    expect(s.snow).toEqual([]);
    expect(sprites(s, "upright")).not.toContain("code-chest");
    expect(s.tint).toBe(PHASE_TINT.Day);
  });

  it("the lizard sits on top of its rock and flicks its tail", () => {
    const rock = spriteBox("rock", LIZARD_ROCK);
    const lizards = [0, 700].map((t) => desert(t).upright.find((d) => d.sprite === "lizard")!);
    for (const l of lizards) {
      expect(l.x).toBeGreaterThanOrEqual(rock.x);
      expect(l.x + SPRITES.lizard.w).toBeLessThanOrEqual(rock.x + rock.w);
      expect(l.y + SPRITES.lizard.h).toBeLessThanOrEqual(rock.y + 4);
    }
    expect(lizards[0].frame).not.toBe(lizards[1].frame);
  });

  it("the lizard is drawn after its rock", () => {
    const up = sprites(desert(), "upright");
    expect(up.indexOf("lizard")).toBeGreaterThan(up.indexOf("rock"));
  });

  it("blowing sand and heat shimmer move with time", () => {
    const a = desert(0).light;
    const b = desert(3000).light;
    expect(a.length).toBeGreaterThan(20);
    expect(a).not.toEqual(b);
    for (const p of [...a, ...b]) expect(p.x >= 0 && p.x < 320 && p.y >= 0 && p.y < 180, `${p.x},${p.y}`).toBe(true);
  });

  it("the tumbleweed rolls across the sand", () => {
    const x = (t: number) => desert(t).upright.find((d) => d.sprite === "tumbleweed")!.x;
    expect(x(4000)).not.toBe(x(0));
  });

  it("with reduced motion nothing moves: light, tumbleweed and lizard are the same at any time", () => {
    expect(desert(9000, true)).toEqual(desert(0, true));
  });

  it("the other zones have no tumbleweed, lizard or sand drift", () => {
    for (const zone of ["peaks", "village", "forest", "foggaten"] as const) {
      const s = scene({ zone }, 0);
      expect(sprites(s, "upright"), zone).not.toContain("tumbleweed");
      expect(sprites(s, "upright"), zone).not.toContain("lizard");
    }
  });
});

describe("scene: the Sunny Beach", () => {
  const beach = (t = 0, reduced = false, over: Partial<SceneInput> = {}) => scene({ zone: "beach", player: { x: 10, y: 70 }, drone: { x: 14, y: 68 }, minutes: DAY, ...over }, t, reduced);

  it("draws the pier, shipwreck, boat, umbrellas, castle, shells, gulls and the crab, with no snow or chests", () => {
    const s = beach();
    for (const id of ["pier", "shipwreck", "boat", "umbrella", "sandcastle", "shell", "bird", "crab", "palm", "signpost", "explorer-down"] as const) expect(sprites(s, "upright"), id).toContain(id);
    expect(s.snow).toEqual([]);
    expect(sprites(s, "upright")).not.toContain("code-chest");
    expect(s.tint).toBe(PHASE_TINT.Day);
  });

  it("foam and glints move with time and stay inside the world", () => {
    const a = beach(0).light;
    const b = beach(1500).light;
    expect(a.length).toBeGreaterThan(20);
    expect(a).not.toEqual(b);
    for (const p of [...a, ...b]) expect(p.x >= 0 && p.x < 320 && p.y >= 0 && p.y < 180, `${p.x},${p.y}`).toBe(true);
  });

  it("the crab scuttles along the sand and the gulls cross the sky", () => {
    const at = (t: number) => beach(t).upright.filter((d) => d.sprite === "crab" || d.sprite === "bird").map((d) => `${d.sprite}${d.x}`).join();
    expect(at(0)).not.toBe(at(3000));
  });

  it("with reduced motion nothing moves", () => {
    expect(beach(9000, true)).toEqual(beach(0, true));
  });

  it("the other zones have no crab or shells", () => {
    for (const zone of ["peaks", "village", "forest", "foggaten", "desert"] as const) {
      expect(sprites(scene({ zone }, 0), "upright"), zone).not.toContain("crab");
      expect(sprites(scene({ zone }, 0), "upright"), zone).not.toContain("shell");
    }
  });
});

describe("scene: the Dense Forest's wildlife and night life", () => {
  const forest = (t: number, reduced = false, over: Partial<SceneInput> = {}) => scene({ zone: "forest", minutes: DAY, player: { x: 60, y: 20 }, ...over }, t, reduced);
  const count = (s: ReturnType<typeof scene>, id: string) => s.upright.filter((d) => d.sprite === id).length;

  it("a deer, a rabbit and a squirrel live in the forest and nowhere else", () => {
    const s = forest(0);
    expect([count(s, "deer"), count(s, "rabbit"), count(s, "squirrel")]).toEqual([1, 1, 1]);
    for (const zone of ["village", "peaks", "desert", "beach", "foggaten"] as const) {
      const other = scene({ zone, minutes: DAY }, 0);
      expect([count(other, "deer"), count(other, "rabbit"), count(other, "squirrel"), count(other, "owl")], zone).toEqual([0, 0, 0, 0]);
    }
  });

  it("each animal stays in its zone, clear of the forest's landmarks, whoever is near, at any moment", () => {
    const boxes = AREAS.forest.props.map((p) => spriteBox(p.sprite, p.at));
    for (const [id, pose, zone] of [["deer", deerPose, FOREST_WILDLIFE.deer.zone], ["rabbit", rabbitPose, FOREST_WILDLIFE.rabbit.zone], ["squirrel", squirrelPose, FOREST_WILDLIFE.squirrel.zone]] as const) {
      for (let t = 0; t < 30_000; t += 2800) {
        for (let px = 0; px <= 320; px += 32) {
          for (let py = 0; py <= 180; py += 30) {
            const at = pose(t, false, { x: px, y: py });
            expect(at.x >= zone.x && at.x <= zone.x + zone.w && at.y >= zone.y && at.y <= zone.y + zone.h, `${id} zone`).toBe(true);
            for (const b of boxes) expect(intersects(spriteBox(id, at), b), `${id} / ${JSON.stringify(b)} t=${t} p=${px},${py}`).toBe(false);
          }
        }
      }
    }
  });

  it("they pace and flip with time, rest at home when motion is reduced, and shy away from a player who comes close", () => {
    const at = (t: number, reduced = false, player = { x: 0, y: 0 }) => deerPose(t, reduced, player);
    expect(at(0, true)).toEqual(at(9000, true));
    expect(at(0).x).not.toBe(at(3000).x);
    const far = at(0, false, { x: 0, y: 0 });
    const near = at(0, false, { x: far.x - 8, y: far.y });
    expect(near.x).toBeGreaterThan(far.x);
  });

  it("fireflies come out at dusk and night, and morning mist drifts by day", () => {
    const glow = (s: ReturnType<typeof scene>) => s.light.filter((p) => p.color === "#fde047");
    const mist = (s: ReturnType<typeof scene>) => s.light.filter((p) => p.color === "#e8f3ef");
    expect(glow(forest(0)).length).toBe(0);
    expect(mist(forest(0)).length).toBeGreaterThan(0);
    for (const minutes of [DUSK, NIGHT]) {
      expect(glow(forest(0, false, { minutes })).length, `minutes ${minutes}`).toBe(14);
      expect(mist(forest(0, false, { minutes })).length).toBe(0);
    }
  });

  it("an owl perches in the old oak's crown at dusk and night, drawn right after the oak", () => {
    expect(count(forest(0), "owl")).toBe(0);
    for (const minutes of [DUSK, NIGHT]) {
      const s = forest(0, false, { minutes });
      expect(count(s, "owl"), `minutes ${minutes}`).toBe(1);
      const names = s.upright.map((d) => d.sprite);
      expect(names.indexOf("owl")).toBe(names.indexOf("old-oak") + 1);
    }
  });
});

describe("scene: the forest's glow mushrooms and landmarks", () => {
  const forest = (over: Partial<SceneInput> = {}, t = 0, reduced = false) => scene({ zone: "forest", minutes: DAY, ...over }, t, reduced);
  const glow = (s: ReturnType<typeof scene>) => s.upright.filter((d) => d.sprite === "glow-mushroom");

  it("three glow mushrooms grow on the forest floor, each leaving once picked, and no other zone has any", () => {
    expect(glow(forest())).toHaveLength(3);
    expect(glow(forest({ mushrooms: ["mushroom-1"] }))).toHaveLength(2);
    expect(glow(forest({ mushrooms: ["mushroom-1", "mushroom-2", "mushroom-3"] }))).toHaveLength(0);
    for (const zone of ["village", "peaks", "desert", "beach", "foggaten"] as const) expect(glow(scene({ zone, minutes: DAY }, 0)), zone).toHaveLength(0);
  });

  it("they pulse between two frames, and rest on the first when motion is reduced", () => {
    expect(new Set([0, 500].map((t) => glow(forest({}, t))[0].frame)).size).toBe(2);
    expect(glow(forest({}, 500, true)).every((d) => d.frame === 0)).toBe(true);
  });
});

describe("scene: the desert's wildlife, jars and weather", () => {
  const desert = (t: number, reduced = false, over: Partial<SceneInput> = {}) => scene({ zone: "desert", minutes: DAY, player: { x: 60, y: 20 }, ...over }, t, reduced);
  const count = (s: ReturnType<typeof scene>, id: string) => s.upright.filter((d) => d.sprite === id).length;

  it("a scorpion, a camel and a snake roam the desert by day, vultures circle, and none of them live elsewhere", () => {
    const s = desert(0);
    expect(["scorpion", "camel", "snake", "vulture"].map((id) => count(s, id))).toEqual([1, 1, 1, 2]);
    for (const zone of ["village", "peaks", "forest", "beach", "foggaten"] as const) {
      const other = scene({ zone, minutes: DAY }, 0);
      for (const id of ["scorpion", "camel", "snake", "vulture", "fennec", "jar"]) expect(count(other, id), `${zone} ${id}`).toBe(0);
    }
  });

  it("the fennec fox comes out only at dusk and night", () => {
    expect(count(desert(0), "fennec")).toBe(0);
    for (const minutes of [DUSK, NIGHT]) expect(count(desert(0, false, { minutes }), "fennec"), `minutes ${minutes}`).toBe(1);
  });

  it("each animal stays in its zone, clear of the desert's landmarks, whoever is near, at any moment", () => {
    const boxes = AREAS.desert.props.map((p) => spriteBox(p.sprite, p.at));
    for (const [id, pose, zone] of [["scorpion", scorpionPose, DESERT_WILDLIFE.scorpion.zone], ["camel", camelPose, DESERT_WILDLIFE.camel.zone], ["snake", snakePose, DESERT_WILDLIFE.snake.zone], ["fennec", fennecPose, DESERT_WILDLIFE.fennec.zone]] as const) {
      for (let t = 0; t < 30_000; t += 2800) {
        for (let px = 0; px <= 320; px += 32) {
          for (let py = 0; py <= 180; py += 30) {
            const at = pose(t, false, { x: px, y: py });
            expect(at.x >= zone.x && at.x <= zone.x + zone.w && at.y >= zone.y && at.y <= zone.y + zone.h, `${id} zone`).toBe(true);
            for (const b of boxes) expect(intersects(spriteBox(id, at), b), `${id} / ${JSON.stringify(b)} t=${t} p=${px},${py}`).toBe(false);
          }
        }
      }
    }
  });

  it("three water jars stand in the dunes, each leaving once picked up", () => {
    expect(count(desert(0), "jar")).toBe(3);
    expect(count(desert(0, false, { jars: ["jar-1"] }), "jar")).toBe(2);
    expect(count(desert(0, false, { jars: ["jar-1", "jar-2", "jar-3"] }), "jar")).toBe(0);
  });

  it("a sandstorm sweeps in for 14 s every two minutes, browning the screen, and never when motion is reduced", () => {
    expect(stormStrength(0, false)).toBe(0);
    expect(stormStrength(97_000, false)).toBeGreaterThan(0.9);
    expect(stormStrength(110_000, false)).toBe(0);
    expect(stormStrength(97_000, true)).toBe(0);
    expect(desert(97_000).tint).not.toBe(PHASE_TINT.Day);
    expect(desert(97_000, true).tint).toBe(PHASE_TINT.Day);
    expect(desert(97_000).light.filter((p) => p.color === "#cda55a").length).toBeGreaterThan(100);
  });

  it("a mirage shivers by day and the sand sparkles under the moon", () => {
    const mirage = (s: ReturnType<typeof scene>) => s.light.filter((p) => p.color === "#bfe9f5");
    const sparkle = (s: ReturnType<typeof scene>) => s.light.filter((p) => p.color === "#e0f2fe");
    expect([mirage(desert(0)).length > 0, sparkle(desert(0)).length]).toEqual([true, 0]);
    const night = desert(0, false, { minutes: NIGHT });
    expect([mirage(night).length, sparkle(night).length]).toEqual([0, 28]);
  });
});

describe("scene: a Master of Devlandia's crown and the village fireworks", () => {
  const FIREWORK = ["#fbbf24", "#f87171", "#60a5fa", "#4ade80", "#c084fc"];
  const run = (zone: "village" | "peaks", over: Partial<SceneInput> = {}, t = 0, reduced = false) => scene({ zone, minutes: DAY, player: { x: 50, y: 70 }, ...over }, t, reduced);
  const crowns = (s: ReturnType<typeof scene>) => s.upright.filter((d) => d.sprite === "crown");
  const sparks = (s: ReturnType<typeof scene>) => s.light.filter((p) => FIREWORK.includes(p.color) && p.alpha > 0.1);

  it("the crown sits just above your head only when every badge is earned and you are on your feet", () => {
    for (const zone of ["village", "peaks"] as const) {
      expect(crowns(run(zone)), zone).toHaveLength(0);
      const s = run(zone, { master: true });
      expect(crowns(s), zone).toHaveLength(1);
      const you = s.upright.find((d) => d.sprite.startsWith("explorer"))!;
      expect(crowns(s)[0].y + SPRITES.crown.h).toBeLessThanOrEqual(you.y + 6);
      expect(crowns(run(zone, { master: true, downed: true })), `${zone} downed`).toHaveLength(0);
    }
  });

  it("the village lights fireworks for a Master, and has none otherwise", () => {
    expect(sparks(run("village"))).toHaveLength(0);
    const lit = sparks(run("village", { master: true }, 500));
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.length % 16).toBe(0);
    expect(sparks(run("peaks", { master: true }, 500)), "peaks").toEqual(sparks(run("peaks", {}, 500)));
  });

  it("the bursts move with time and hold still, one small burst, when motion is reduced", () => {
    const key = (s: ReturnType<typeof scene>) => JSON.stringify(sparks(s));
    expect(key(run("village", { master: true }, 500))).not.toBe(key(run("village", { master: true }, 1200)));
    expect(key(run("village", { master: true }, 500, true))).toBe(key(run("village", { master: true }, 9000, true)));
    expect(sparks(run("village", { master: true }, 500, true))).toHaveLength(16);
  });
});

describe("scene: the Sunny Beach's tide, pier and sandcastle", () => {
  const beach = (over: Partial<SceneInput> = {}, t = 0, reduced = false) => scene({ zone: "beach", player: { x: 50, y: 70 }, ...over }, t, reduced);
  const HIGH = 180;
  const LOW = 540;
  const tiles = (s: ReturnType<typeof scene>) => s.flat.filter((d) => d.sprite === "shallow");
  const up = (s: ReturnType<typeof scene>, id: string) => s.upright.filter((d) => d.sprite === id);

  it("the shallow water covers more of the shore as the tide comes in, none at low tide", () => {
    expect(tiles(beach({ minutes: LOW }))).toHaveLength(0);
    const rising = tiles(beach({ minutes: 0 })).length;
    const high = tiles(beach({ minutes: HIGH })).length;
    expect(rising).toBeGreaterThan(0);
    expect(high).toBe(rising * 2);
    for (const d of tiles(beach({ minutes: HIGH }))) expect(d.x + SPRITES.shallow.w).toBeLessThanOrEqual(303 + 1);
  });

  it("the outermost column has the foam edge, and the shallows are drawn on the beach only", () => {
    const strips = tiles(beach({ minutes: HIGH }));
    const edge = strips.filter((d) => d.frame === 1);
    expect(edge).toHaveLength(strips.length / 2);
    expect(Math.min(...edge.map((d) => d.x))).toBeLessThan(Math.min(...strips.filter((d) => d.frame === 0).map((d) => d.x)));
    for (const zone of ["village", "forest", "desert", "peaks"] as const) expect(tiles(scene({ zone, minutes: HIGH }, 0)), zone).toHaveLength(0);
  });

  it("low tide uncovers three extra shells, which the water hides again", () => {
    expect(up(beach({ minutes: LOW }), "shell").length).toBe(up(beach({ minutes: HIGH }), "shell").length + 3);
  });

  it("two lanterns stand on the pier right after it, glowing from dusk", () => {
    const s = beach({ minutes: 12 * 60 });
    const names = s.upright.map((d) => d.sprite);
    expect(up(s, "lantern")).toHaveLength(2);
    expect(names.slice(names.indexOf("pier") + 1, names.indexOf("pier") + 3)).toEqual(["lantern", "lantern"]);
    const glow = (m: number) => beach({ minutes: m }).light.filter((p) => p.color === "#fbbf24").length;
    expect(glow(12 * 60)).toBe(0);
    expect(glow(23 * 60)).toBeGreaterThan(0);
  });

  it("a rowboat rocks beside the pier, an angler's line hangs with a bobber, and all hold still when motion is reduced", () => {
    const boatY = (t: number, reduced = false) => up(beach({ minutes: DAY }, t, reduced), "rowboat")[0].y;
    expect(up(beach(), "rowboat")).toHaveLength(1);
    expect(new Set([0, 500, 1000, 1500, 2000, 2500].map((t) => boatY(t))).size).toBeGreaterThan(1);
    expect(boatY(0, true)).toBe(boatY(2000, true));
    const bobber = (t: number, reduced = false) => beach({ minutes: DAY }, t, reduced).light.filter((p) => p.color === "#dc2626").map((p) => p.y);
    expect(bobber(0)).toHaveLength(1);
    expect(bobber(0, true)).toEqual(bobber(2000, true));
    expect(beach({ minutes: DAY }).light.filter((p) => p.color === "#e2e8f0").length).toBeGreaterThanOrEqual(14);
  });

  it("the sandcastle is unfinished until its puzzle is solved, then wears its flag", () => {
    expect(up(beach(), "sandcastle")[0].frame).toBe(0);
    expect(up(beach({ sandcastleBuilt: true }), "sandcastle")[0].frame).toBe(1);
  });

  it("only the beach has a rowboat", () => {
    for (const zone of ["village", "forest", "desert", "peaks", "foggaten"] as const) expect(up(scene({ zone, minutes: DAY }, 0), "rowboat"), zone).toHaveLength(0);
  });
});

describe("scene: day and night", () => {
  const out = (zone: ZoneId, minutes: number, id: SpriteId) => scene({ zone, minutes }, 0).upright.filter((d) => d.sprite === id).length;

  it("day animals turn in at night and night animals sleep through the day", () => {
    const rows: Array<[ZoneId, SpriteId, number, number, number]> = [
      // zone, sprite, count by day, at dusk, at night
      ["forest", "squirrel", 1, 1, 0],
      ["forest", "owl", 0, 1, 1],
      ["village", "chicken", 1, 1, 0],
      ["desert", "vulture", 2, 2, 0],
      ["desert", "lizard", 1, 1, 0],
      ["desert", "camel", 1, 1, 0],
      ["desert", "fennec", 0, 1, 1],
      ["beach", "bird", 3, 3, 0],
      ["peaks", "goat", 1, 1, 0],
      ["peaks", "fox", 0, 1, 1],
      ["forest", "deer", 1, 1, 1],
      ["forest", "rabbit", 1, 1, 1],
      ["desert", "snake", 1, 1, 1],
      ["beach", "crab", 1, 1, 1],
    ];
    for (const [zone, id, day, dusk, night] of rows)
      expect([out(zone, DAY, id), out(zone, DUSK, id), out(zone, NIGHT, id)], `${zone} ${id}`).toEqual([day, dusk, night]);
  });

  it("the /light override decides the hour for the animals too", () => {
    const n = (lightMode: SceneInput["lightMode"]) => scene({ zone: "forest", minutes: DAY, lightMode }, 0).upright.filter((d) => d.sprite === "squirrel").length;
    expect([n("day"), n("night")]).toEqual([1, 0]);
  });

  it("the campfire is cold by day (the out frame, no flicker) and burns from dusk to dawn, in every place it stands", () => {
    for (const zone of ["forest", "peaks", "foggaten"] as const) {
      for (const t of [0, 400, 800]) {
        const fire = (minutes: number, reduced = false) => scene({ zone, minutes }, t, reduced).upright.filter((d) => d.sprite === "campfire");
        expect(fire(DAY).map((d) => d.frame), `${zone} day`).toEqual([2]);
        for (const m of [DUSK, NIGHT]) expect(fire(m).every((d) => d.frame < 2), `${zone} ${m}`).toBe(true);
      }
    }
  });
});
