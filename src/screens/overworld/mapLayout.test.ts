import { describe, expect, it } from "vitest";
import { CHESTS } from "../../learn/chests";
import { AREAS } from "../../render/areas";
import { ARCHIVE_POINT, TERMINAL_POINT, chestPoints } from "../../render/learnPoints";
import { spriteBox } from "../../render/sprites";
import { LANDMARK_POINTS } from "../../render/terrain";
import { fitWorld, type Rect, type WorldRect } from "../../render/world";
import { labelBoxes, labelLayout } from "./labelLayout";
import {
  LANDMARK_CAPTIONS,
  MAP_CAPTIONS,
  captionRect,
  EXIT_SIGNS,
  exitSignBox,
  hitArea,
  hitAreas,
  landmarkCaptions,
  mapCaptionRect,
  promptRect,
  spriteCss,
  zoneHitAreas,
  type CssRect,
} from "./mapLayout";

const phone = fitWorld({ width: 354, height: 360, dpr: 3 }); // world 320×180 at (17, 90)
const desktop = fitWorld({ width: 668, height: 360, dpr: 1 }); // world 640×360 at (14, 0)
const mapOf = (w: WorldRect) => ({ width: w.backingWidth / (w.s / w.scale), height: w.backingHeight / (w.s / w.scale) });
type Edges = { left: number; right: number; top: number; bottom: number };
const overlapBox = (a: Edges, b: Edges) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const hit = (a: CssRect, b: CssRect) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

const P = LANDMARK_POINTS;
const LANDMARKS: Array<{ box: Rect; texts: string[] }> = [
  { box: spriteBox("gate", P.gate), texts: ["[G] Gate"] },
  { box: spriteBox("tower", P.tower), texts: ["[T] Tower", "[T] Tower ✓"] },
  { box: spriteBox("chest-closed", P.chest), texts: ["[X] Supply Cache", "[X] Empty Cache"] },
];
const MAP_TEXTS: Record<(typeof MAP_CAPTIONS)[number]["id"], string[]> = {
  peaks: ["(Snowy Peaks Biome)"],
  river: ["Frozen River", "Bridge"],
  forest: ["(Dense Forests Biome)"],
  village: ["(Dev Village)"],
  "west-exit": ["← Dev Village"],
  "east-exit": ["C++ Peaks →"],
  "south-exit": ["Forest ↓"],
  "dense-forest": ["(Dense Forest)"],
  "north-exit": ["↑ C++ Peaks"],
};
const GROUPS = {
  peaks: ["tower", "chest", "gate", "peaks", "river", "forest", "west-exit", "south-exit"],
  village: ["villager", "signpost", "terminal", "archive", "village", "east-exit"],
  forest: ["dense-forest", "north-exit"],
};
/** Chest captions show at 2× and larger; on a 1× map only on hover, focus or in reach. */
const chestGroups = (zone: "peaks" | "village" | "forest") => CHESTS.filter((c) => c.zone === zone && c.at).map((c) => c.id as string);
const inside = (inner: CssRect, outer: CssRect) =>
  inner.left >= outer.left - 1e-9 && inner.top >= outer.top - 1e-9 && inner.left + inner.width <= outer.left + outer.width + 1e-9 && inner.top + inner.height <= outer.top + outer.height + 1e-9;
/** Every drawing with a button in the zone, by its button's id. */
const drawings = (zone: "peaks" | "village" | "forest") =>
  LANDMARK_CAPTIONS.filter((l) => l.zone === zone).map((l) => ({ id: l.id as string, box: spriteBox(l.sprite, l.point) }));

describe("hit areas", () => {
  it("cuts two overlapping 44-px areas back at the midline between the drawings", () => {
    const a = { x: 100, y: 100, w: 16, h: 16 };
    const b = { x: 126, y: 100, w: 16, h: 16 };
    const areas = hitAreas([{ id: "a", box: a }, { id: "b", box: b }], phone);
    // The drawings end at 116 and start at 126: the midline is at 121 art px.
    expect(areas.a.left + areas.a.width).toBeCloseTo(phone.left + 121);
    expect(areas.b.left).toBeCloseTo(phone.left + 121);
    expect([areas.a.height, areas.b.height]).toEqual([44, 44]);
    expect(areas.a.left).toBeCloseTo(hitArea(a, phone).left);
    // Apart, nothing is cut.
    expect(hitAreas([{ id: "a", box: a }, { id: "c", box: { ...b, x: 200 } }], phone)).toEqual({ a: hitArea(a, phone), c: hitArea({ ...b, x: 200 }, phone) });
  });

  it("no two hit areas intersect after the midline cut, and the centre of every drawing lies in its own hit area", () => {
    for (const zone of ["peaks", "village", "forest"] as const) {
      for (const world of [phone, desktop]) {
        const hits = zoneHitAreas(world, zone);
        const ids = Object.keys(hits);
        expect(ids.sort()).toEqual(drawings(zone).map((d) => d.id).sort());
        for (const a of ids) for (const b of ids) if (a < b) expect(hit(hits[a], hits[b]), `${a} / ${b} ${zone} @${world.width}`).toBe(false);
        for (const { id, box } of drawings(zone)) {
          const d = spriteCss(box, world);
          const centre = { left: d.left + d.width / 2, top: d.top + d.height / 2, width: 0, height: 0 };
          expect(inside(centre, hits[id]), `${id} ${zone} @${world.width}`).toBe(true);
        }
      }
    }
  });

  it("hit areas never shrink below their drawing", () => {
    for (const zone of ["peaks", "village", "forest"] as const) {
      for (const world of [phone, desktop]) {
        const hits = zoneHitAreas(world, zone);
        for (const { id, box } of drawings(zone)) expect(inside(spriteCss(box, world), hits[id]), `${id} ${zone} @${world.width}`).toBe(true);
      }
    }
  });

  it("are at least 44 px and centred on the drawing", () => {
    for (const world of [phone, desktop]) {
      for (const { box } of LANDMARKS) {
        const area = hitArea(box, world);
        const drawn = spriteCss(box, world);
        expect(area.width).toBeGreaterThanOrEqual(44);
        expect(area.height).toBeGreaterThanOrEqual(44);
        expect(area.width).toBeGreaterThanOrEqual(drawn.width);
        expect(area.left + area.width / 2).toBeCloseTo(drawn.left + drawn.width / 2);
        expect(area.top + area.height / 2).toBeCloseTo(drawn.top + drawn.height / 2);
      }
    }
  });
});

describe("captions", () => {
  // At 1× the 44-px hit areas dwarf the 16-px drawings (the Snowy Peaks caption already crosses the tower's), so
  // other places' hit areas are checked where every caption shows; at 1× a hidden caption takes no taps, and a
  // showing one sits above the other buttons (MapViewport).
  it("at 320×180 (without chest captions) and 640×360 (with them) no caption box intersects another, a landmark or chest drawing, the dig spot or an exit sign, nor at 640×360 another place's hit area", () => {
    for (const zone of ["peaks", "village", "forest"] as const) {
      for (const world of [phone, desktop]) {
        const map = mapOf(world);
        const hits = zoneHitAreas(world, zone);
        const showsChests = world.scale >= 2;
        const captions: Array<{ group: string; rect: CssRect }> = [
          ...LANDMARK_CAPTIONS.filter((l) => l.zone === zone && (showsChests || !l.chest)).flatMap((l) =>
            l.texts.map((t) => ({ group: l.id as string, rect: captionRect(t, hits[l.id], map, l.prefer) })),
          ),
          ...MAP_CAPTIONS.filter((c) => c.zone === zone).flatMap(({ id }) => MAP_TEXTS[id].map((t) => ({ group: id as string, rect: mapCaptionRect(id, t, world) }))),
        ];
        expect(new Set(captions.map((c) => c.group))).toEqual(new Set([...GROUPS[zone], ...(showsChests ? chestGroups(zone) : [])]));
        const sprites =
          zone === "peaks"
            ? [
                ...LANDMARKS.map(({ box }) => box),
                spriteBox("x-mark", P.dig),
                spriteBox("semicolon", P.dig),
                ...chestPoints("peaks").map((c) => spriteBox("code-chest", c.at)),
              ]
            : zone === "village"
              ? [
                  ...AREAS.village.props.map((p) => spriteBox(p.sprite, p.at)),
                  spriteBox("archive", ARCHIVE_POINT),
                  spriteBox("syntax-terminal", TERMINAL_POINT),
                  ...chestPoints("village").map((c) => spriteBox("code-chest", c.at)),
                ]
              : [...AREAS.forest.props.map((p) => spriteBox(p.sprite, p.at)), ...chestPoints("forest").map((c) => spriteBox("code-chest", c.at))];
        const blockers = sprites.map((box) => ({ id: "", rect: spriteCss(box, world) }));
        const areas = Object.entries(hits).map(([id, rect]) => ({ id, rect }));
        for (const a of captions) {
          const where = `${zone} @${world.width}`;
          for (const b of captions) if (a.group !== b.group) expect(hit(a.rect, b.rect), `${a.group} / ${b.group} ${where}`).toBe(false);
          for (const b of [...blockers, ...areas.filter((h) => h.id !== a.group && world.scale >= 2)]) {
            expect(hit(a.rect, b.rect), `${a.group} on ${b.id || "a drawing"} ${JSON.stringify(b.rect)} ${where}`).toBe(false);
          }
        }
      }
    }
  });

  it("exit signs: left-centre and right-centre at y 88", () => {
    const west = mapCaptionRect("west-exit", "← Dev Village", desktop);
    const east = mapCaptionRect("east-exit", "C++ Peaks →", desktop);
    expect(west.left).toBeCloseTo(desktop.left + 0.01 * desktop.width);
    expect(east.left + east.width).toBeCloseTo(desktop.left + 0.99 * desktop.width);
    for (const r of [west, east]) expect(r.top + r.height / 2).toBeCloseTo(desktop.top + 0.88 * desktop.height);
  });

  it("tower and cache captions go above their landmark when there is room, and stay off the ice", () => {
    const ice = spriteCss({ x: 77, y: 50, w: 167, h: 21 }, phone);
    for (const id of ["tower", "chest"] as const) {
      const l = LANDMARK_CAPTIONS.find((c) => c.id === id)!;
      const area = hitArea(spriteBox(l.sprite, P[id]), phone);
      const rect = captionRect(l.texts[0], area, mapOf(phone), l.prefer);
      expect(rect.top + rect.height).toBe(area.top - 2);
      expect(hit(rect, ice)).toBe(false);
    }
    // On desktop the world starts at the map's top edge: no room above the tower, so its caption goes below.
    const tower = LANDMARK_CAPTIONS.find((c) => c.id === "tower")!;
    const area = hitArea(spriteBox("tower", P.tower), desktop);
    expect(captionRect(tower.texts[0], area, mapOf(desktop), tower.prefer).top).toBe(area.top + area.height + 2);
  });

  it("at the start the player and drone labels clear the landmark captions and drawings", () => {
    for (const world of [phone, desktop]) {
      const size = { width: world.width, height: world.height };
      const fixed = landmarkCaptions(world, mapOf(world), { hasLoot: false, towerPowered: false }, "peaks");
      const signs = exitSignBox(world, "peaks");
      const player = { x: 28, y: 72 };
      const drone = { x: 36, y: 70 };
      const layout = labelLayout(player, drone, size, [], world.scale, fixed, signs);
      const b = labelBoxes(player, drone, size, layout, world.scale);
      for (const f of [...fixed, ...signs]) {
        expect(overlapBox(b.playerLabel, f), `player label @${world.width}`).toBe(false);
        expect(overlapBox(b.droneLabel, f), `drone label @${world.width}`).toBe(false);
      }
    }
  });

  it("the cache caption stays ≥ 2 px inside a 324-px map", () => {
    const narrow = fitWorld({ width: 324, height: 360, dpr: 3 });
    const rect = captionRect("[X] Supply Cache", hitArea(spriteBox("chest-closed", P.chest), narrow), { width: 324, height: 360 }, "above");
    expect(rect.left).toBeGreaterThanOrEqual(2);
    expect(rect.left + rect.width).toBeLessThanOrEqual(322);
  });

  it("the gate's caption sits 2 px under its hit area", () => {
    const area = hitArea(spriteBox("gate", P.gate), phone);
    expect(captionRect("[G] Gate", area, mapOf(phone), "below").top).toBe(area.top + area.height + 2);
  });
});

describe("the [E] prompt", () => {
  it("never covers your sprite", () => {
    const texts = ["[E] Inspect Gate", "[E] Inspect Signal Tower", "[E] Inspect Supply Cache", "[E] Dig here"];
    for (const world of [phone, desktop]) {
      for (const at of [P.gate, P.tower, P.chest, P.dig, P.start]) {
        for (const text of texts) {
          const rect = promptRect(text, at, world, mapOf(world));
          expect(hit(rect, spriteCss(spriteBox("explorer-down", at), world)), `${text} at ${JSON.stringify(at)}`).toBe(false);
        }
      }
    }
  });

  it("sits 4 px above your head, and goes 4 px below your feet when there is no room above", () => {
    const above = promptRect("[E] Inspect Gate", P.gate, desktop, mapOf(desktop));
    const head = spriteCss(spriteBox("explorer-down", P.gate), desktop).top;
    expect(above.below).toBe(false);
    expect(above.top + above.height).toBe(head - 4);
    const top = { x: 45, y: 18 };
    const below = promptRect("[E] Inspect Signal Tower", top, desktop, mapOf(desktop));
    expect(below.below).toBe(true);
    expect(below.top).toBe(desktop.top + top.y * desktop.scale + 4);
  });

  it("keeps today's 104 px horizontal clamp", () => {
    const rect = promptRect("[E] Inspect Signal Tower", { x: 20, y: 100 }, desktop, mapOf(desktop));
    expect(rect.left + rect.width / 2).toBe(104);
  });
});

describe("exit signs per zone", () => {
  it("the Peaks has two signs, the village and the forest one each", () => {
    expect(EXIT_SIGNS.peaks).toEqual([
      { id: "west-exit", text: "← Dev Village" },
      { id: "south-exit", text: "Forest ↓" },
    ]);
    expect(EXIT_SIGNS.village).toEqual([{ id: "east-exit", text: "C++ Peaks →" }]);
    expect(EXIT_SIGNS.forest).toEqual([{ id: "north-exit", text: "↑ C++ Peaks" }]);
  });

  it("exitSignBox gives one box per sign, inside the world, and the signs of a zone do not overlap each other or its place name", () => {
    const world = fitWorld({ width: 668, height: 360, dpr: 1 });
    for (const zone of ["peaks", "village", "forest"] as const) {
      const boxes = exitSignBox(world, zone);
      expect(boxes, zone).toHaveLength(EXIT_SIGNS[zone].length);
      for (const b of boxes) expect(b.left >= 0 && b.right <= world.width && b.top >= 0 && b.bottom <= world.height, `${zone} ${JSON.stringify(b)}`).toBe(true);
    }
    const [west, south] = exitSignBox(world, "peaks");
    expect(west.right <= south.left || south.right <= west.left || west.bottom <= south.top || south.bottom <= west.top).toBe(true);
  });
});
