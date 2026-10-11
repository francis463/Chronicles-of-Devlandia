import type { ZoneId } from "../../game/zones";
import type { SpriteId } from "../sprites";
import type { ArtPoint, Rect } from "../world";

export type TerrainKind = "ice" | "mountains" | "snow" | "forest" | "meadow";

/** A static upright the scene draws in an area; `variant` recolours it (an explorer's hood). */
export type Prop = { sprite: SpriteId; at: ArtPoint; variant?: string };

/**
 * One zone's art. `mouths`: the gaps in the edge hedge at its exits; `corridors`: the open ground
 * beyond each, kept clear of scenery (one per mouth, in the same order); `gateBox`: where the wall leaves room for the gate;
 * `protected`: what decorations inside the reachable area must stay clear of.
 */
export type Area = {
  id: ZoneId;
  /** Whether the north wall runs across this zone. */
  wall: boolean;
  terrainAt(x: number, y: number): TerrainKind;
  paths: Rect[];
  mouths: Rect[];
  corridors: Rect[];
  gateBox: Rect | null;
  ice: Rect | null;
  props: Prop[];
  protected: Rect[];
};

export const inRect = (x: number, y: number, r: Rect): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
