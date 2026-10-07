export type Point = { x: number; y: number };

export type PoiId = "gate" | "chest" | "river";

export type Poi = { id: PoiId; label: string } & Point;

export type Direction = "up" | "down" | "left" | "right";

export type Phase = "Day" | "Dusk" | "Night";
