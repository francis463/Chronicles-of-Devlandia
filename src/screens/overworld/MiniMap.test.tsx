import { cleanup, render, screen, within } from "@testing-library/react";
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
    expect(colorAt(100, 90)).toBe(MINI_COLORS.snow);
    expect(colorAt(10, 2)).toBe(MINI_COLORS.mountains);
    expect(colorAt(10, 30)).toBe(MINI_COLORS.snow);
    expect(colorAt(20, 80)).toBe(MINI_COLORS.snow);
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

  it("paints a village cell: all meadow, with no snow and no wall line", () => {
    const { ctx, fills, colorAt } = recorder();
    paintMiniTerrain(ctx, 96, 54, "village");
    expect(fills.filter((f) => f.color === "#1e293b")).toEqual([]);
    for (const [x, y] of [[10, 2], [10, 20], [10, 50], [90, 26]]) expect(colorAt(x, y)).toBe(MINI_COLORS.meadow);
    expect(fills.reduce((n, f) => n + f.w * f.h, 0)).toBe(96 * 54);
  });

  it("keeps the dots and renders aria-hidden canvases behind them, without the old dashed river", () => {
    render(<MiniMap zone="peaks" player={{ x: 28, y: 72 }} artifactFound={false} teammates={[{ id: "k", name: "Kai", color: "#a78bfa", x: 60, y: 60, zone: "peaks" }]} badges={[]} archiveOpen={false} />);
    const box = screen.getByRole("img", { name: "Mini-map" });
    const canvases = [...box.querySelectorAll("canvas")];
    expect(canvases).toHaveLength(6);
    for (const canvas of canvases) {
      expect(canvas).toHaveAttribute("aria-hidden", "true");
      expect(canvas.parentElement!.firstElementChild).toBe(canvas);
    }
    expect(within(screen.getByTestId("minimap-cell-peaks")).getByTestId("minimap-teammate-Kai")).toBeInTheDocument();
    expect(box.querySelector(".border-dashed")).toBeNull();
  });

  it("draws six cells in a row, Village, Peaks, Desert, Forest, Beach and Foggaten, each 32 × 18 and centred, and outlines yours", () => {
    render(<MiniMap zone="village" player={{ x: 50, y: 70 }} artifactFound={false} badges={[]} archiveOpen={false} />);
    const village = screen.getByTestId("minimap-cell-village");
    const peaks = screen.getByTestId("minimap-cell-peaks");
    expect(village.style.left).toBe("0px");
    expect(village).toHaveAttribute("data-current", "true");
    expect(within(village).getByTestId("minimap-current")).toBeInTheDocument();
    expect(peaks.style.left).toBe("32px");
    const forest = screen.getByTestId("minimap-cell-forest");
    expect(forest.style.left).toBe("96px");
    for (const cell of [village, peaks, forest]) {
      expect(cell.style.width).toBe("32px");
      expect(cell.style.height).toBe("18px");
      expect(cell.style.top).toBe("18px");
    }
    expect(forest).not.toHaveAttribute("data-current");
    expect(peaks).not.toHaveAttribute("data-current");
    expect(within(peaks).queryByTestId("minimap-current")).toBeNull();
  });

  it("puts each dot in its zone's cell", () => {
    const teammates = [
      { id: "k", name: "Kai", color: "#a78bfa", x: 60, y: 60, zone: "village" as const },
      { id: "m", name: "Mia", color: "#f472b6", x: 40, y: 70, zone: "peaks" as const },
      { id: "z", name: "Zed", color: "#fbbf24", x: 50, y: 50, zone: null },
    ];
    render(<MiniMap zone="peaks" player={{ x: 28, y: 72 }} artifactFound={false} teammates={teammates} badges={[]} archiveOpen={false} />);
    const village = screen.getByTestId("minimap-cell-village");
    const peaks = screen.getByTestId("minimap-cell-peaks");
    expect(within(village).getByTestId("minimap-teammate-Kai")).toBeInTheDocument();
    expect(within(peaks).getByTestId("minimap-teammate-Mia")).toBeInTheDocument();
    expect(screen.queryByTestId("minimap-teammate-Zed")).toBeNull();
    expect(within(peaks).getByTestId("minimap-player")).toBeInTheDocument();
    expect(within(village).queryByTestId("minimap-player")).toBeNull();
  });
});

describe("mini-map chests", () => {
  const diamonds = (cell: string) => within(screen.getByTestId(`minimap-cell-${cell}`)).queryAllByTestId(/^minimap-chest-/);

  it("mini-map: one diamond per chest in its zone's cell; earned ones solid; no C# diamond until the Archive opens", () => {
    const { rerender } = render(<MiniMap zone="peaks" player={{ x: 28, y: 72 }} artifactFound={false} badges={["chest-html"]} archiveOpen={false} />);
    expect(diamonds("peaks").map((d) => d.dataset.testid)).toEqual(["minimap-chest-chest-html", "minimap-chest-chest-css"]);
    expect(diamonds("village").map((d) => d.dataset.testid)).toEqual(["minimap-chest-chest-php", "minimap-chest-chest-sql"]);
    expect(diamonds("desert").map((d) => d.dataset.testid)).toEqual(["minimap-chest-chest-java", "minimap-chest-chest-py-2"]);
    expect(diamonds("beach").map((d) => d.dataset.testid)).toEqual(["minimap-chest-chest-cpp-1", "minimap-chest-chest-cpp-2"]);
    expect(diamonds("foggaten").map((d) => d.dataset.testid)).toEqual(["minimap-chest-chest-py-1"]);
    expect(diamonds("forest").map((d) => d.dataset.testid)).toEqual(["minimap-chest-chest-js"]);
    const html = screen.getByTestId("minimap-chest-chest-html");
    expect(html).toHaveAttribute("data-earned", "true");
    expect(html).toHaveClass("rotate-45");
    expect(html.style.background).toBe("rgb(45, 212, 191)");
    expect(screen.getByTestId("minimap-chest-chest-css")).not.toHaveAttribute("data-earned");
    expect(screen.getByTestId("minimap-chest-chest-css").style.background).toBe("rgb(15, 23, 42)");
    rerender(<MiniMap zone="peaks" player={{ x: 28, y: 72 }} artifactFound={false} badges={[]} archiveOpen />);
    const cs = within(screen.getByTestId("minimap-cell-village")).getByTestId("minimap-chest-chest-cs");
    expect(cs.style.left).toBe("55%");
    expect(cs.style.top).toBe("66%");
  });
});

describe("mini-map pings", () => {
  it("draws a ring in its zone's cell at its point, in the sender's colour", () => {
    const pings = [{ id: "k", name: "Kai", color: "#a78bfa", zone: "village" as const, x: 30, y: 70 }];
    render(<MiniMap zone="peaks" player={{ x: 28, y: 72 }} artifactFound={false} badges={[]} archiveOpen={false} pings={pings} />);
    const ring = within(screen.getByTestId("minimap-cell-village")).getByTestId("minimap-ping-k");
    expect(ring).toHaveStyle({ left: "30%", top: "70%", borderColor: "#a78bfa" });
    expect(ring.className).toContain("motion-reduce:animate-none");
    expect(within(screen.getByTestId("minimap-cell-peaks")).queryByTestId("minimap-ping-k")).toBeNull();
  });

  it("draws none by default", () => {
    render(<MiniMap zone="peaks" player={{ x: 28, y: 72 }} artifactFound={false} badges={[]} archiveOpen={false} />);
    expect(screen.queryByTestId(/^minimap-ping-/)).toBeNull();
  });
});

describe("mini-map: the Dense Forest cell", () => {
  it("shows a teammate and a ping in the forest, and outlines it when you are there", () => {
    const teammates = [{ id: "k", name: "Kai", color: "#a78bfa", x: 60, y: 60, zone: "forest" as const }];
    const pings = [{ id: "k", name: "Kai", color: "#a78bfa", zone: "forest" as const, x: 30, y: 70 }];
    render(<MiniMap zone="forest" player={{ x: 50, y: 20 }} artifactFound={false} badges={[]} archiveOpen={false} teammates={teammates} pings={pings} />);
    const forest = screen.getByTestId("minimap-cell-forest");
    expect(forest).toHaveAttribute("data-current", "true");
    expect(within(forest).getByTestId("minimap-player")).toBeInTheDocument();
    expect(within(forest).getByTestId("minimap-teammate-Kai")).toBeInTheDocument();
    expect(within(forest).getByTestId("minimap-ping-k")).toBeInTheDocument();
    expect(within(screen.getByTestId("minimap-cell-peaks")).queryByTestId("minimap-teammate-Kai")).toBeNull();
  });

  it("paints the forest from its area: forest floor, a meadow clearing, and no wall line", () => {
    const calls: Array<{ color: string; y: number }> = [];
    let color = "";
    const ctx = { set fillStyle(v: string) { color = v; }, fillRect: (_x: number, y: number) => void calls.push({ color, y }) } as unknown as Ctx2D;
    paintMiniTerrain(ctx, 64, 36, "forest");
    const colors = new Set(calls.map((c) => c.color));
    expect(colors).toEqual(new Set([MINI_COLORS.forest, MINI_COLORS.meadow]));
  });
});

describe("mini-map artifact", () => {
  it("the found Golden Semicolon's dot is in the Foggaten cell, not the forest's or the Peaks'", () => {
    render(<MiniMap zone="foggaten" player={{ x: 50, y: 20 }} artifactFound badges={[]} archiveOpen={false} />);
    const dot = (cell: string) => screen.getByTestId(`minimap-cell-${cell}`).querySelectorAll(".rotate-45.bg-\\[var\\(--accent\\)\\]");
    expect(dot("foggaten")).toHaveLength(1);
    expect(dot("forest")).toHaveLength(0);
    expect(dot("peaks")).toHaveLength(0);
  });
});

describe("mini-map: the Foggaten Island cell", () => {
  const base = { artifactFound: false, badges: [] as never[], archiveOpen: false };

  it("is the last cell, east of the forest, with the island's places, and the others stay put", () => {
    render(<MiniMap zone="peaks" player={{ x: 50, y: 50 }} {...base} />);
    expect(screen.getAllByTestId(/^minimap-cell-/)).toHaveLength(6);
    const island = screen.getByTestId("minimap-cell-foggaten");
    expect(island.style.left).toBe("160px");
    expect(island.style.top).toBe("18px");
    expect(island).not.toHaveAttribute("data-current");
    expect(island.querySelectorAll("div.border").length).toBe(4);
    expect(screen.getByTestId("minimap-cell-village").style.left).toBe("0px");
    expect(screen.getByTestId("minimap-cell-peaks").style.left).toBe("32px");
    expect(screen.getByTestId("minimap-cell-forest").style.left).toBe("96px");
  });

  it("shows a teammate on the island there and nowhere else, and outlines the cell when you are there", () => {
    const teammates = [{ id: "k", name: "Kai", color: "#a78bfa", x: 40, y: 60, zone: "foggaten" as const }];
    render(<MiniMap zone="foggaten" player={{ x: 20, y: 60 }} {...base} teammates={teammates} />);
    const island = screen.getByTestId("minimap-cell-foggaten");
    expect(island).toHaveAttribute("data-current", "true");
    expect(within(island).getByTestId("minimap-teammate-Kai")).toBeInTheDocument();
    expect(within(island).getByTestId("minimap-player")).toBeInTheDocument();
    expect(within(screen.getByTestId("minimap-cell-peaks")).queryByTestId("minimap-teammate-Kai")).toBeNull();
  });
});

describe("mini-map: the Sunbaked Desert cell", () => {
  const base = { artifactFound: false, badges: [] as never[], archiveOpen: false };

  it("sits between the Peaks and the forest, inside the 194 px box, with the desert's places", () => {
    render(<MiniMap zone="peaks" player={{ x: 50, y: 50 }} {...base} />);
    const desert = screen.getByTestId("minimap-cell-desert");
    expect(desert.style.left).toBe("64px");
    expect(desert.style.width).toBe("32px");
    expect(Math.max(...screen.getAllByTestId(/^minimap-cell-/).map((c) => parseInt(c.style.left) + parseInt(c.style.width)))).toBeLessThanOrEqual(194);
    expect(desert.querySelectorAll("div.border").length).toBe(2);
  });

  it("shows a teammate in the desert there and nowhere else, and outlines the cell when you are there", () => {
    const teammates = [{ id: "k", name: "Kai", color: "#a78bfa", x: 40, y: 60, zone: "desert" as const }];
    render(<MiniMap zone="desert" player={{ x: 20, y: 60 }} {...base} teammates={teammates} />);
    const desert = screen.getByTestId("minimap-cell-desert");
    expect(desert).toHaveAttribute("data-current", "true");
    expect(within(desert).getByTestId("minimap-teammate-Kai")).toBeInTheDocument();
    expect(within(desert).getByTestId("minimap-player")).toBeInTheDocument();
    expect(within(screen.getByTestId("minimap-cell-forest")).queryByTestId("minimap-teammate-Kai")).toBeNull();
  });

  it("paints the dunes golden", () => {
    const { ctx, colorAt } = recorder();
    paintMiniTerrain(ctx, 38, 22, "desert");
    expect(colorAt(10, 10)).toBe(MINI_COLORS.dune);
  });
});

describe("mini-map: the Sunny Beach cell", () => {
  const base = { artifactFound: false, badges: [] as never[], archiveOpen: false };

  it("sits between the forest and Foggaten with the beach's places", () => {
    render(<MiniMap zone="peaks" player={{ x: 50, y: 50 }} {...base} />);
    const beach = screen.getByTestId("minimap-cell-beach");
    expect(beach.style.left).toBe("128px");
    expect(beach.querySelectorAll("div.border").length).toBe(2);
  });

  it("shows a teammate on the beach there and outlines the cell when you are there", () => {
    const teammates = [{ id: "k", name: "Kai", color: "#a78bfa", x: 40, y: 60, zone: "beach" as const }];
    render(<MiniMap zone="beach" player={{ x: 20, y: 60 }} {...base} teammates={teammates} />);
    const beach = screen.getByTestId("minimap-cell-beach");
    expect(beach).toHaveAttribute("data-current", "true");
    expect(within(beach).getByTestId("minimap-teammate-Kai")).toBeInTheDocument();
    expect(within(screen.getByTestId("minimap-cell-forest")).queryByTestId("minimap-teammate-Kai")).toBeNull();
  });

  it("paints the sand pale", () => {
    const { ctx, colorAt } = recorder();
    paintMiniTerrain(ctx, 32, 18, "beach");
    expect(colorAt(10, 9)).toBe(MINI_COLORS.beach);
    expect(colorAt(31, 9)).toBe(MINI_COLORS.sea);
  });
});

describe("mini-map view window", () => {
  const draw = (view?: { x: number; y: number; w: number; h: number } | null) => render(<MiniMap zone="forest" player={{ x: 50, y: 50 }} artifactFound={false} badges={[]} archiveOpen={false} view={view} />);

  it("draws no outline when the map shows the whole zone, or when nothing is reported", () => {
    draw({ x: 0, y: 0, w: 1, h: 1 });
    expect(screen.queryByTestId("minimap-view")).toBeNull();
    cleanup();
    draw(null);
    expect(screen.queryByTestId("minimap-view")).toBeNull();
  });

  it("outlines the part of the current zone the main map shows, as fractions of its cell", () => {
    draw({ x: 0.25, y: 0.5, w: 0.5, h: 0.5 });
    const box = within(screen.getByTestId("minimap-cell-forest")).getByTestId("minimap-view");
    expect([box.style.left, box.style.top, box.style.width, box.style.height]).toEqual(["25%", "50%", "50%", "50%"]);
    expect(box).toHaveAttribute("aria-hidden", "true");
  });
});
