import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PLAYER_START } from "../game/constants";
import type { SceneInput } from "../render/scene";
import { backdropWorld, toArt, type WorldRect } from "../render/world";
import { MenuBackdrop } from "./MenuBackdrop";

const drawn: Array<{ input: SceneInput; world: WorldRect }> = [];
vi.mock("./overworld/MapCanvas", () => ({
  MapCanvas: (props: { input: SceneInput; world: WorldRect }) => {
    drawn.push(props);
    return null;
  },
}));

describe("MenuBackdrop", () => {
  it("draws the world covering the window, framed on the explorer at camp", () => {
    render(<MenuBackdrop />);
    const { input, world } = drawn.at(-1)!;
    expect(input.player).toEqual(PLAYER_START);
    expect(world).toEqual(backdropWorld({ width: window.innerWidth, height: window.innerHeight, dpr: 1 }, toArt(PLAYER_START)));
  });
});
