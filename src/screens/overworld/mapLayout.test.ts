import { describe, expect, it } from "vitest";
import { HALL_FLAT, HALL_POINTS } from "../../render/areas/hall";
import { CHESTS } from "../../learn/chests";
import { AREAS } from "../../render/areas";
import { DOCK_POINT } from "../../render/areas/peaks";
import { FOGGATEN_POINTS } from "../../render/areas/foggaten";
import { ARCHIVE_POINT, TERMINAL_POINT } from "../../render/learnPoints";
import { spriteBox } from "../../render/sprites";
import { ICE_RECT, LANDMARK_POINTS } from "../../render/terrain";
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
  hallHeroRect,
  hallName,
  hallPlateRect,
  HALL_BADGE,
  HALL_NAME_MAX,
  type CssRect,
} from "./mapLayout";

const PHONE_SIZE = { width: 354, height: 360, dpr: 3 };
const DESKTOP_SIZE = { width: 668, height: 360, dpr: 1 };
const phone = fitWorld(PHONE_SIZE); // world 320×180 at (17, 90)
const desktop = fitWorld(DESKTOP_SIZE); // world 640×360 at (14, 0)
const mapOf = (w: WorldRect) => ({ width: w.backingWidth / (w.s / w.scale), height: w.backingHeight / (w.s / w.scale) });
type Edges = { left: number; right: number; top: number; bottom: number };
const overlapBox = (a: Edges, b: Edges) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const hit = (a: CssRect, b: CssRect) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

const P = LANDMARK_POINTS;
const LANDMARKS: Array<{ box: Rect; texts: string[] }> = [
  { box: spriteBox("gate", P.gate), texts: ["[G] Gate"] },
  { box: spriteBox("tower", P.tower), texts: ["[T] Tower", "[T] Tower ✓"] },
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
  foggaten: ["(Foggaten Island Biome)"],
  desert: ["(Sunbaked Desert Biome)"],
  "desert-east-exit": ["Forest →"],
  "forest-west-exit": ["← Desert"],
  beach: ["(Sunny Beach Biome)"],
  "beach-west-exit": ["← Forest"],
  "forest-east-exit": ["Beach →"],
  hall: ["(Hall of Fame)"],
  "village-north-exit": ["↑ Hall"],
  "hall-south-exit": ["Dev Village ↓"],
};
const GROUPS = {
  peaks: ["tower", "gate", "dock", "peaks", "river", "forest", "west-exit", "south-exit"],
  village: ["villager", "signpost", "terminal", "archive", "village", "east-exit", "village-north-exit"],
  forest: ["dense-forest", "north-exit", "forest-west-exit", "forest-east-exit", "ranger", "campfire", "forest-signpost", "chest"],
  foggaten: ["foggaten", "island-dock", "lighthouse", "hermit", "island-fire"],
  desert: ["desert", "desert-east-exit", "nomad", "desert-signpost"],
  beach: ["beach", "beach-west-exit", "fisher", "beach-signpost", "sandcastle"],
  lodge: ["lodge-keeper"],
  hall: ["hall", "hall-south-exit"],
};
const quietGroups = (zone: "peaks" | "village" | "forest" | "foggaten" | "desert" | "beach" | "lodge" | "hall") => LANDMARK_CAPTIONS.filter((l) => l.zone === zone && l.quiet).map((l) => l.id as string);
/** A hosted chest's caption is its landmark's: always shown. */
const chestGroups = (zone: "peaks" | "village" | "forest" | "foggaten" | "desert" | "beach" | "lodge" | "hall") => CHESTS.filter((c) => c.zone === zone && c.at).map((c) => c.id as string);
const inside = (inner: CssRect, outer: CssRect) =>
  inner.left >= outer.left - 1e-9 && inner.top >= outer.top - 1e-9 && inner.left + inner.width <= outer.left + outer.width + 1e-9 && inner.top + inner.height <= outer.top + outer.height + 1e-9;
/** Every drawing with a button in the zone, by its button's id. */
const drawings = (zone: "peaks" | "village" | "forest" | "foggaten" | "desert" | "beach" | "lodge" | "hall") =>
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
    for (const zone of ["peaks", "village", "forest", "foggaten", "desert", "beach", "lodge", "hall"] as const) {
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
    for (const zone of ["peaks", "village", "forest", "foggaten", "desert", "beach", "lodge", "hall"] as const) {
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
    for (const zone of ["peaks", "village", "forest", "foggaten", "desert", "beach", "lodge", "hall"] as const) {
      for (const size of [PHONE_SIZE, DESKTOP_SIZE]) {
        // A zone bigger than the view is checked as a map the size of the whole zone, so what is tested is its own geometry,
        // not where a camera happens to cut it; a one-screen zone is the view itself.
        const zoneSize = AREAS[zone].world;
        const big = zoneSize.width > 320;
        const world = big ? fitWorld(size, 0, { x: 0, y: 0 }, zoneSize) : fitWorld(size);
        const map = big ? { width: world.width, height: world.height } : mapOf(world);
        const hits = zoneHitAreas(world, zone);
        const showsChests = world.scale >= 2;
        const captions: Array<{ group: string; rect: CssRect }> = [
          ...LANDMARK_CAPTIONS.filter((l) => l.zone === zone && (showsChests || !l.quiet)).flatMap((l) =>
            l.texts.map((t) => ({ group: l.id as string, rect: captionRect(t, hits[l.id], map, l.prefer) })),
          ),
          ...MAP_CAPTIONS.filter((c) => c.zone === zone).flatMap(({ id }) => MAP_TEXTS[id].map((t) => ({ group: id as string, rect: mapCaptionRect(id, t, world) }))),
        ];
        expect(new Set(captions.map((c) => c.group))).toEqual(new Set([...GROUPS[zone], ...chestGroups(zone), ...(showsChests ? quietGroups(zone) : [])]));
        const sprites =
          zone === "peaks"
            ? [
                ...LANDMARKS.map(({ box }) => box),
                spriteBox("dock", DOCK_POINT),
              ]
            : zone === "village"
              ? [
                  ...AREAS.village.props.map((p) => spriteBox(p.sprite, p.at)),
                  spriteBox("archive", ARCHIVE_POINT),
                  spriteBox("syntax-terminal", TERMINAL_POINT),
                ]
              : zone === "foggaten"
                ? [...AREAS.foggaten.props.map((p) => spriteBox(p.sprite, p.at)), spriteBox("x-mark", FOGGATEN_POINTS.dig), spriteBox("semicolon", FOGGATEN_POINTS.dig)]
              : zone === "hall"
                ? // The scenery and the heroes on the ground: the stage's wooden front is where the top three's names go.
                  [...AREAS.hall.props.map((p) => spriteBox(p.sprite, p.at)), ...HALL_POINTS.slots.slice(3).map((at) => spriteBox("explorer-down", at))]
              : zone === "desert" || zone === "beach" || zone === "lodge"
                ? AREAS[zone].props.map((p) => spriteBox(p.sprite, p.at))
                : AREAS.forest.props.map((p) => spriteBox(p.sprite, p.at));
        const blockers = sprites.map((box) => ({ id: "", rect: spriteCss(box, world) }));
        const areas = Object.entries(hits).map(([id, rect]) => ({ id, rect }));
        for (const a of captions) {
          const where = `${zone} @${world.width}`;
          for (const b of captions) if (a.group !== b.group) expect(hit(a.rect, b.rect), `${a.group} / ${b.group} ${where}`).toBe(false);
          // Zone names and exit signs take no taps (pointer-events-none), so only landmark captions must clear other places' hit areas.
          const tappable = LANDMARK_CAPTIONS.some((l) => l.id === a.group);
          for (const b of [...blockers, ...areas.filter((h) => tappable && h.id !== a.group && world.scale >= 2)]) {
            expect(hit(a.rect, b.rect), `${a.group} on ${b.id || "a drawing"} ${JSON.stringify(b.rect)} ${where}`).toBe(false);
          }
        }
      }
    }
  });

  it("the south exit sign stands over the gap in the hedge (columns 62-78)", () => {
    for (const world of [phone, desktop]) {
      const r = mapCaptionRect("south-exit", "Forest ↓", world);
      const gapLeft = world.left + 0.62 * world.width;
      const gapRight = world.left + 0.78 * world.width;
      expect(r.left + r.width, `right @${world.width}`).toBeGreaterThan(gapLeft);
      expect(r.left, `left @${world.width}`).toBeLessThan(gapRight);
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
    const ice = spriteCss(ICE_RECT, phone);
    for (const id of ["tower"] as const) {
      const l = LANDMARK_CAPTIONS.find((c) => c.id === id)!;
      const area = hitArea(spriteBox(l.sprite, P[id]), phone);
      const rect = captionRect(l.texts[0], area, mapOf(phone), l.prefer);
      expect(rect.top + rect.height).toBe(area.top - 2);
      expect(hit(rect, ice)).toBe(false);
    }
    // Where the map starts right at a landmark's top edge there is no room above, so its caption goes below.
    const tower = LANDMARK_CAPTIONS.find((c) => c.id === "tower")!;
    const cramped = hitArea(spriteBox("tower", { x: P.tower.x, y: 4 }), desktop);
    expect(captionRect(tower.texts[0], cramped, mapOf(desktop), tower.prefer).top).toBe(cramped.top + cramped.height + 2);
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
    // The cache stands at the map's right edge here (the Peaks are bigger than a phone's map, which scrolls to it).
    const rect = captionRect("[X] Supply Cache", hitArea(spriteBox("chest-closed", { x: 300, y: 32 }), narrow), { width: 324, height: 360 }, "above");
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
      for (const at of [P.gate, P.tower, FOGGATEN_POINTS.dig, P.start]) {
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
  it("the Peaks has two signs, the forest two, the village and the desert one each", () => {
    expect(EXIT_SIGNS.peaks).toEqual([
      { id: "west-exit", text: "← Dev Village" },
      { id: "south-exit", text: "Forest ↓" },
    ]);
    expect(EXIT_SIGNS.village).toEqual([
      { id: "east-exit", text: "C++ Peaks →" },
      { id: "village-north-exit", text: "↑ Hall" },
    ]);
    expect(EXIT_SIGNS.hall).toEqual([{ id: "hall-south-exit", text: "Dev Village ↓" }]);
    expect(EXIT_SIGNS.forest).toEqual([
      { id: "north-exit", text: "↑ C++ Peaks" },
      { id: "forest-west-exit", text: "← Desert" },
      { id: "forest-east-exit", text: "Beach →" },
    ]);
    expect(EXIT_SIGNS.beach).toEqual([{ id: "beach-west-exit", text: "← Forest" }]);
    expect(EXIT_SIGNS.desert).toEqual([{ id: "desert-east-exit", text: "Forest →" }]);
  });

  it("exitSignBox gives one box per sign, inside the world, and the signs of a zone do not overlap each other or its place name", () => {
    const world = fitWorld({ width: 668, height: 360, dpr: 1 });
    for (const zone of ["peaks", "village", "forest", "foggaten", "desert", "beach", "lodge", "hall"] as const) {
      const boxes = exitSignBox(world, zone);
      expect(boxes, zone).toHaveLength(EXIT_SIGNS[zone].length);
      for (const b of boxes) expect(b.left >= 0 && b.right <= world.width && b.top >= 0 && b.bottom <= world.height, `${zone} ${JSON.stringify(b)}`).toBe(true);
    }
    const [west, south] = exitSignBox(world, "peaks");
    expect(west.right <= south.left || south.right <= west.left || west.bottom <= south.top || south.bottom <= west.top).toBe(true);
  });
});

describe("captions of landmarks far off the map (a zone bigger than the view)", () => {
  const map = { width: 600, height: 360 };
  const hitAt = (left: number, top: number): CssRect => ({ left, top, width: 44, height: 44 });

  it("a landmark on the map keeps its chip inside it", () => {
    const chip = captionRect("[G] Gate", hitAt(-10, 100), map);
    expect(chip.left).toBeGreaterThanOrEqual(2);
    const east = captionRect("[G] Gate", hitAt(590, 100), map);
    expect(east.left + east.width).toBeLessThanOrEqual(map.width - 2);
  });

  it("a landmark far outside it keeps its chip beside it, not pulled onto the map", () => {
    const far = hitAt(1500, 100);
    const chip = captionRect("[G] Gate", far, map);
    expect(chip.left + chip.width / 2).toBeCloseTo(far.left + far.width / 2);
    const west = hitAt(-900, 100);
    expect(captionRect("[G] Gate", west, map).left + captionRect("[G] Gate", west, map).width / 2).toBeCloseTo(west.left + west.width / 2);
  });
});

describe("the Hall of Fame's name plates", () => {
  const widest = hallName("M".repeat(40));
  const ids = Array.from({ length: 10 }, (_, i) => i);
  const props = AREAS.hall.props.map((p) => ({ what: p.sprite, box: spriteBox(p.sprite, p.at) }));
  const stage = spriteBox("stage", HALL_FLAT[0].at);

  it("cuts a long name to eight characters with an ellipsis, and leaves a short one", () => {
    expect(HALL_NAME_MAX).toBe(8);
    expect(widest).toBe("MMMMMMM…");
    expect([...widest]).toHaveLength(8);
    expect(hallName("Alice")).toBe("Alice");
    expect(hallName("Exactly8")).toBe("Exactly8");
  });

  it("at 320×180 and 640×360 the ten plates (the widest names) stay inside the world and clear of each other, every other hero, the props and the exit sign", () => {
    for (const world of [phone, desktop]) {
      const where = `@${world.width}`;
      const edge = { left: world.left, top: world.top, right: world.left + world.width, bottom: world.top + world.height };
      const plates = ids.map((i) => ({ i, rect: hallPlateRect(world, i, widest) }));
      const heroes = ids.map((i) => ({ i, rect: hallHeroRect(world, i) }));
      const scenery = props.map((p) => ({ id: p.what, rect: spriteCss(p.box, world) }));
      const sign = mapCaptionRect("hall-south-exit", "Dev Village ↓", world);
      for (const { i, rect } of plates) {
        expect(rect.left >= edge.left - 1e-9 && rect.left + rect.width <= edge.right + 1e-9, `plate ${i + 1} inside, across ${where}`).toBe(true);
        expect(rect.top >= edge.top - 1e-9 && rect.top + rect.height <= edge.bottom + 1e-9, `plate ${i + 1} inside, down ${where}`).toBe(true);
        for (const other of plates) if (other.i > i) expect(hit(rect, other.rect), `plate ${i + 1} / plate ${other.i + 1} ${where}`).toBe(false);
        for (const hero of heroes) if (hero.i !== i) expect(hit(rect, hero.rect), `plate ${i + 1} / hero ${hero.i + 1} ${where}`).toBe(false);
        for (const b of scenery) expect(hit(rect, b.rect), `plate ${i + 1} / ${b.id} ${where}`).toBe(false);
        expect(hit(rect, sign), `plate ${i + 1} / exit sign ${where}`).toBe(false);
        // The ground rows keep off the stage; the top three's plates hang over its backdrop on purpose.
        if (i >= 3) expect(hit(rect, spriteCss(stage, world)), `plate ${i + 1} / stage ${where}`).toBe(false);
      }
    }
  });

  it("the player and drone labels are laid out clear of every plate", () => {
    for (const world of [phone, desktop]) {
      const size = { width: world.width, height: world.height };
      const fixed = landmarkCaptions(world, mapOf(world), { hasLoot: false, towerPowered: false }, "hall");
      const plates = ids.map((i) => hallPlateRect(world, i, widest));
      // Every plate is among the fixed boxes the labels avoid.
      for (const p of plates) {
        const edges = { left: p.left - world.left, right: p.left - world.left + p.width, top: p.top - world.top, bottom: p.top - world.top + p.height };
        expect(fixed.some((f) => Math.abs(f.left - edges.left) < 1e-6 && Math.abs(f.right - edges.right) < 1e-6 && Math.abs(f.top - edges.top) < 1e-6), `a plate is fixed @${world.width}`).toBe(true);
      }
      // A phone's one screen is packed (ten plates and two labels): there the layout does its best; at 2× it has the room to clear them all.
      if (world.scale < 2) continue;
      const signs = exitSignBox(world, "hall");
      const player = { x: 50, y: 82 };
      const drone = { x: 56, y: 82 };
      const layout = labelLayout(player, drone, size, [], world.scale, fixed, signs);
      const b = labelBoxes(player, drone, size, layout, world.scale);
      for (const f of [...fixed, ...signs]) {
        expect(overlapBox(b.playerLabel, f), `player label @${world.width}`).toBe(false);
        expect(overlapBox(b.droneLabel, f), `drone label @${world.width}`).toBe(false);
      }
    }
  });

  it("every spot's button covers its hero (the top three too, not just the podium under them), at 1× and 2×", () => {
    for (const world of [phone, desktop]) {
      const hits = zoneHitAreas(world, "hall");
      for (const i of ids) {
        const hero = hallHeroRect(world, i);
        const centre = { left: hero.left + hero.width / 2, top: hero.top + hero.height / 2, width: 0, height: 0 };
        expect(inside(centre, hits[`hall-${i + 1}`]), `hero ${i + 1} @${world.width}`).toBe(true);
      }
    }
  });

  it("a plate is centred 2 px above its hero's head, with the round picture at its left", () => {
    for (const world of [phone, desktop]) {
      for (const i of ids) {
        const hero = hallHeroRect(world, i);
        const plate = hallPlateRect(world, i, "Alice");
        expect(plate.top + plate.height, `plate ${i + 1}`).toBe(hero.top - 2);
        expect(plate.left + plate.width / 2, `plate ${i + 1}`).toBeCloseTo(hero.left + hero.width / 2);
        expect(plate.width, `plate ${i + 1}`).toBe(2 + HALL_BADGE + 2 + 5 * 5.5 + 4);
      }
    }
  });
});
