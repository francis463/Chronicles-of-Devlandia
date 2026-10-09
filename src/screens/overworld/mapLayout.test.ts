import { describe, expect, it } from "vitest";
import { AREAS } from "../../render/areas";
import { spriteBox } from "../../render/sprites";
import { LANDMARK_POINTS } from "../../render/terrain";
import { fitWorld, type Rect, type WorldRect } from "../../render/world";
import { labelBoxes, labelLayout } from "./labelLayout";
import { LANDMARK_CAPTIONS, MAP_CAPTIONS, captionRect, exitSignBox, hitArea, landmarkCaptions, mapCaptionRect, promptRect, spriteCss, type CssRect } from "./mapLayout";

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
};
const GROUPS = {
  peaks: ["tower", "chest", "gate", "peaks", "river", "forest", "west-exit"],
  village: ["villager", "signpost", "village", "east-exit"],
};

describe("hit areas", () => {
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
  it("at 320×180 and 640×360 worlds no caption box intersects another, a landmark sprite box or the dig spot", () => {
    for (const zone of ["peaks", "village"] as const) {
      for (const world of [phone, desktop]) {
        const map = mapOf(world);
        const captions: Array<{ group: string; rect: CssRect }> = [
          ...LANDMARK_CAPTIONS.filter((l) => l.zone === zone).flatMap((l) =>
            l.texts.map((t) => ({ group: l.id, rect: captionRect(t, hitArea(spriteBox(l.sprite, l.point), world), map, l.prefer) })),
          ),
          ...MAP_CAPTIONS.filter((c) => c.zone === zone).flatMap(({ id }) => MAP_TEXTS[id].map((t) => ({ group: id, rect: mapCaptionRect(id, t, world) }))),
        ];
        expect(new Set(captions.map((c) => c.group))).toEqual(new Set(GROUPS[zone]));
        const blockers =
          zone === "peaks"
            ? [
                ...LANDMARKS.map(({ box }) => spriteCss(box, world)),
                spriteCss(spriteBox("x-mark", P.dig), world),
                spriteCss(spriteBox("semicolon", P.dig), world),
              ]
            : AREAS.village.props.map((p) => spriteCss(spriteBox(p.sprite, p.at), world));
        for (const a of captions) {
          const where = `${zone} @${world.width}`;
          for (const b of captions) if (a.group !== b.group) expect(hit(a.rect, b.rect), `${a.group} / ${b.group} ${where}`).toBe(false);
          for (const b of blockers) expect(hit(a.rect, b), `${a.group} on ${JSON.stringify(b)} ${where}`).toBe(false);
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
      const fixed = [...landmarkCaptions(world, mapOf(world), { hasLoot: false, towerPowered: false }, "peaks"), exitSignBox(world, "peaks")];
      const player = { x: 28, y: 72 };
      const drone = { x: 36, y: 70 };
      const layout = labelLayout(player, drone, size, [], world.scale, fixed);
      const b = labelBoxes(player, drone, size, layout, world.scale);
      for (const f of fixed) {
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
