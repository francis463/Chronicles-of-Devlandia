import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Scene, SceneInput } from "../../render/scene";
import { spriteBox } from "../../render/sprites";
import { fitWorld, toArt } from "../../render/world";
import { MapCanvas } from "./MapCanvas";

const input: SceneInput = {
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
  minutes: 19 * 60,
};
const world = fitWorld({ width: 600, height: 360, dpr: 1 });

const nullContext = HTMLCanvasElement.prototype.getContext;
/** Gives every canvas (the map and its sprite canvases) a recording 2D context. */
function fakeContexts() {
  const calls: string[] = [];
  const ctx = {
    setTransform: () => calls.push("setTransform"),
    drawImage: () => calls.push("drawImage"),
    fillRect: () => calls.push("fillRect"),
    clearRect: () => calls.push("clearRect"),
    fillStyle: "",
    globalAlpha: 1,
    imageSmoothingEnabled: true,
  };
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
  return calls;
}

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "requestAnimationFrame", "cancelAnimationFrame", "performance"] }));
afterEach(() => {
  vi.useRealTimers();
  HTMLCanvasElement.prototype.getContext = nullContext;
});

const frame = () => act(() => void vi.advanceTimersByTime(20));
const explorers = (s: Scene) => s.upright.filter((d) => d.sprite.startsWith("explorer"));

describe("MapCanvas", () => {
  it("renders an aria-hidden canvas sized from the world rect and paints nothing without a context", () => {
    render(<MapCanvas input={input} world={world} />);
    const canvas = screen.getByTestId("map-canvas") as HTMLCanvasElement;
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect([canvas.width, canvas.height]).toEqual([600, 360]);
    expect([canvas.style.width, canvas.style.height]).toEqual(["600px", "360px"]);
    expect(canvas.style.imageRendering).toBe("pixelated");
    expect(() => frame()).not.toThrow();
  });

  it("with a fake context, paints on animation frames", () => {
    const calls = fakeContexts();
    render(<MapCanvas input={input} world={world} />);
    expect(calls).not.toContain("setTransform");
    frame();
    expect(calls).toContain("setTransform");
    expect(calls).toContain("drawImage");
  });

  it("assigns canvas.width/height only when the backing size changes", () => {
    fakeContexts();
    const { rerender } = render(<MapCanvas input={input} world={world} />);
    const canvas = screen.getByTestId("map-canvas") as HTMLCanvasElement;
    const writes: number[] = [];
    let width = canvas.width;
    Object.defineProperty(canvas, "width", {
      configurable: true,
      get: () => width,
      set: (v: number) => {
        writes.push(v);
        width = v;
      },
    });
    rerender(<MapCanvas input={{ ...input }} world={fitWorld({ width: 600, height: 360, dpr: 1 })} />);
    frame();
    frame();
    expect(writes).toEqual([]);
    rerender(<MapCanvas input={input} world={fitWorld({ width: 354, height: 360, dpr: 3 })} />);
    frame();
    expect(writes).toEqual([1062]);
  });

  it("drops motions of teammates who left", () => {
    fakeContexts();
    const scenes: Scene[] = [];
    const kai = { id: "k", name: "Kai", color: "#a78bfa", x: 60, y: 60 };
    const { rerender } = render(<MapCanvas input={{ ...input, teammates: [kai] }} world={world} onScene={(s) => scenes.push(s)} />);
    frame();
    expect(explorers(scenes.at(-1)!)).toHaveLength(2);
    rerender(<MapCanvas input={input} world={world} onScene={(s) => scenes.push(s)} />);
    frame();
    expect(explorers(scenes.at(-1)!)).toHaveLength(1);
    // Coming back elsewhere, Kai appears there at once instead of gliding from where he left.
    const back = { ...kai, x: 80, y: 80 };
    rerender(<MapCanvas input={{ ...input, teammates: [back] }} world={world} onScene={(s) => scenes.push(s)} />);
    frame();
    frame();
    const kaiNow = explorers(scenes.at(-1)!).find((d) => d.variant === kai.color)!;
    expect(kaiNow.x).toBe(spriteBox("explorer-down", toArt(back)).x);
  });

  it("snaps the player and drone when downed turns false", () => {
    fakeContexts();
    const scenes: Scene[] = [];
    const river = { x: 50, y: 33 };
    const { rerender } = render(<MapCanvas input={{ ...input, player: river, downed: true }} world={world} onScene={(s) => scenes.push(s)} />);
    frame();
    rerender(<MapCanvas input={{ ...input, downed: false }} world={world} onScene={(s) => scenes.push(s)} />);
    frame();
    const me = explorers(scenes.at(-1)!)[0];
    expect(me.x).toBe(spriteBox("explorer-down", toArt(input.player)).x);
    expect(me.y).toBe(spriteBox("explorer-down", toArt(input.player)).y);
  });

  it("glides the player between positions while alive", () => {
    fakeContexts();
    const scenes: Scene[] = [];
    const { rerender } = render(<MapCanvas input={input} world={world} onScene={(s) => scenes.push(s)} />);
    frame();
    rerender(<MapCanvas input={{ ...input, player: { x: 40, y: 72 } }} world={world} onScene={(s) => scenes.push(s)} />);
    frame(); // the glide starts in the frame that first sees the new position
    frame();
    const start = spriteBox("explorer-down", toArt(input.player)).x;
    const end = spriteBox("explorer-down", toArt({ x: 40, y: 72 })).x;
    const x = explorers(scenes.at(-1)!)[0].x;
    expect(x).toBeGreaterThan(start);
    expect(x).toBeLessThan(end);
  });
});
