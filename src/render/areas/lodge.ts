import { zoneWorld } from "../world";
import type { Area, TerrainKind } from "./area";

/** The Ski Lodge's room: one screen of sand until the room's floor and furniture arrive. */
const terrainAt = (): TerrainKind => "sand";

export const LODGE: Area = {
  id: "lodge",
  world: zoneWorld("lodge"),
  wall: false,
  terrainAt,
  paths: [],
  mouths: [],
  corridors: [],
  gateBox: null,
  ice: null,
  props: [],
  protected: [],
};
