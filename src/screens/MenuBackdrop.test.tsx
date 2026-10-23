import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CLASS } from "../game/classes";
import type { SceneInput } from "../render/scene";
import { backdropWorld, zoneToArt, type WorldRect } from "../render/world";
import { MenuBackdrop } from "./MenuBackdrop";

const FOREST_CAMP = { x: 50, y: 55 };

const drawn: Array<{ input: SceneInput; world: WorldRect }> = [];
vi.mock("./overworld/MapCanvas", () => ({
  MapCanvas: (props: { input: SceneInput; world: WorldRect }) => {
    drawn.push(props);
    return null;
  },
}));

describe("MenuBackdrop", () => {
  it("draws the forest covering the window, framed on the explorer", () => {
    render(<MenuBackdrop />);
    const { input, world } = drawn.at(-1)!;
    expect(input.zone).toBe("forest");
    expect(input.player).toEqual({ x: FOREST_CAMP.x + 4, y: FOREST_CAMP.y + 6 });
    expect(input.playerClass).toBe(DEFAULT_CLASS);
    expect(world).toEqual(backdropWorld({ width: window.innerWidth, height: window.innerHeight, dpr: 1 }, zoneToArt(FOREST_CAMP, "forest")));
  });
});
