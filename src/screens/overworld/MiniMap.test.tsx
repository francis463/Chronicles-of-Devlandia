import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Ctx2D } from "../../render/paint";
import { MINI_COLORS, MiniMap, paintMiniTerrain } from "./MiniMap";

function recorder() {
  const fills: Array<{ color: string; x: number; y: number; w: number; h: number }> = [];
  let fill = "";
  const ctx = {
    setTransform: () => {},
    drawImage: () => {},
    clearRect: () => {},
    fillRect: (x: number, y: number, w: number, h: number) => void fills.push({ color: fill, x, y, w, h }),
    get fillStyle() {
      return fill;
    },
    set fillStyle(v: string) {
      fill = v;
    },
    globalAlpha: 1,
    imageSmoothingEnabled: false,
  } as unknown as Ctx2D;
  const colorAt = (x: number, y: number) => fills.find((f) => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h)?.color;
  return { ctx, fills, colorAt };
}

describe("mini-map terrain", () => {
  it("paints flat terrain colours stretched to the box", () => {
    const { ctx, fills, colorAt } = recorder();
    paintMiniTerrain(ctx, 112, 96);
    expect(colorAt(56, 30)).toBe(MINI_COLORS.ice);
    expect(colorAt(100, 90)).toBe(MINI_COLORS.forest);
    expect(colorAt(10, 2)).toBe(MINI_COLORS.mountains);
    expect(colorAt(10, 30)).toBe(MINI_COLORS.snow);
    expect(colorAt(20, 80)).toBe(MINI_COLORS.meadow);
    // one rect per same-colour run, covering every pixel once
    expect(fills.reduce((n, f) => n + f.w * f.h, 0)).toBe(112 * 96);
    expect(fills.length).toBeLessThan(112 * 96 / 4);
  });

  it("paints the wall as a dark line with a gap at the gate", () => {
    const { ctx, fills } = recorder();
    paintMiniTerrain(ctx, 112, 96);
    expect(fills.filter((f) => f.color === "#1e293b")).toEqual([
      { color: "#1e293b", x: 0, y: 47, w: 51, h: 1 },
      { color: "#1e293b", x: 62, y: 47, w: 50, h: 1 },
    ]);
    const big = recorder();
    paintMiniTerrain(big.ctx, 336, 288);
    expect([...new Set(big.fills.filter((f) => f.color === "#1e293b").map((f) => f.y))]).toEqual([141, 142, 143]);
  });

  it("keeps the dots and renders an aria-hidden canvas behind them, without the old dashed river", () => {
    render(<MiniMap player={{ x: 28, y: 72 }} artifactFound={false} teammates={[{ id: "k", name: "Kai", color: "#a78bfa", x: 60, y: 60 }]} />);
    const box = screen.getByRole("img", { name: "Mini-map" });
    const canvas = box.querySelector("canvas")!;
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(box.firstElementChild).toBe(canvas);
    expect(screen.getByTestId("minimap-teammate-Kai")).toBeInTheDocument();
    expect(box.querySelector(".border-dashed")).toBeNull();
  });
});
