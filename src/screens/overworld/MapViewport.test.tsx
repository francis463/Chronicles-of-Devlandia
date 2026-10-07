import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapViewport } from "./MapViewport";

type Props = Parameters<typeof MapViewport>[0];
const props = (over: Partial<Props> = {}): Props => ({
  player: { x: 28, y: 72 },
  drone: { x: 36, y: 70 },
  minutes: 19 * 60 + 29,
  inspected: null,
  hasLoot: false,
  gateUnlocked: false,
  clueDecoded: false,
  artifactFound: false,
  towerPowered: false,
  inRange: null,
  downed: false,
  onInteract: vi.fn(),
  onCloseInspection: vi.fn(),
  onRespawn: vi.fn(),
  ...over,
});

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 1 });
});

describe("MapViewport on the canvas", () => {
  it("places the world layer at the world rect", () => {
    render(<MapViewport {...props()} />);
    const layer = screen.getByTestId("world-layer");
    expect([layer.style.left, layer.style.top, layer.style.width, layer.style.height]).toEqual(["140px", "90px", "320px", "180px"]);
  });

  it("landmark buttons keep their names, are ≥ 44 px, and contain their caption", () => {
    render(<MapViewport {...props()} />);
    for (const name of ["[G] Gate", "[T] Tower", "[X] Supply Cache"]) {
      const button = screen.getByRole("button", { name });
      expect(parseFloat(button.style.width)).toBeGreaterThanOrEqual(44);
      expect(parseFloat(button.style.height)).toBeGreaterThanOrEqual(44);
      expect(within(button).getByText(name)).toBeInTheDocument();
      expect(button).not.toHaveAttribute("aria-label");
    }
  });

  it("disables the landmark buttons while downed", () => {
    render(<MapViewport {...props({ downed: true })} />);
    expect(screen.getByRole("button", { name: "[G] Gate" })).toBeDisabled();
  });

  it("the canvas is aria-hidden", () => {
    render(<MapViewport {...props()} />);
    expect(screen.getByTestId("map-canvas")).toHaveAttribute("aria-hidden", "true");
  });

  it("fog: gradient centred on the player in px, opacity 1, then 0 when powered, with a 1 s opacity transition", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    const fog = screen.getByTestId("fog");
    // player (28, 72) → art (90, 130); the middle of the sprite is 8 art px above its feet
    expect(fog.style.background).toContain("radial-gradient");
    expect(fog.style.background).toContain("230px 212px");
    expect(fog.style.opacity).toBe("1");
    expect(fog.className).toContain("transition-opacity");
    expect(fog.className).toContain("duration-1000");
    expect(fog.className).toContain("motion-reduce:transition-none");
    rerender(<MapViewport {...props({ towerPowered: true })} />);
    expect(screen.getByTestId("fog").style.opacity).toBe("0");
  });

  it("dig-spot anchor only while the clue is decoded and not found; artifact anchor when found", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    expect(screen.queryByTestId("dig-spot")).toBeNull();
    rerender(<MapViewport {...props({ clueDecoded: true })} />);
    expect(screen.getByTestId("dig-spot")).toHaveTextContent("Dig spot");
    expect(screen.queryByTestId("artifact")).toBeNull();
    rerender(<MapViewport {...props({ clueDecoded: true, artifactFound: true })} />);
    expect(screen.queryByTestId("dig-spot")).toBeNull();
    expect(screen.getByTestId("artifact")).toHaveTextContent("Golden Semicolon");
  });

  it("keeps the map captions, without dashed boxes", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    for (const text of ["(Snowy Peaks Biome)", "Frozen River", "(Dense Forests Biome)"]) {
      const caption = screen.getByText(text);
      expect(caption.className).not.toContain("border-dashed");
      expect(caption.className).toContain("pointer-events-none");
    }
    rerender(<MapViewport {...props({ gateUnlocked: true })} />);
    expect(screen.getByText("Bridge")).toBeInTheDocument();
  });

  it("re-fits when the device pixel ratio changes with the size unchanged", () => {
    const listeners = new Set<() => void>();
    window.matchMedia = ((query: string) => ({
      media: query,
      matches: false,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    })) as unknown as typeof window.matchMedia;
    render(<MapViewport {...props()} />);
    expect((screen.getByTestId("map-canvas") as HTMLCanvasElement).width).toBe(600);
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
    act(() => [...listeners].forEach((cb) => cb()));
    // 600×360 at DPR 2: s = floor(1.875 × 2) = 3, so 1.5 CSS px per art px
    const layer = screen.getByTestId("world-layer");
    expect([layer.style.width, layer.style.height]).toEqual(["480px", "270px"]);
    const canvas = screen.getByTestId("map-canvas") as HTMLCanvasElement;
    expect([canvas.width, canvas.height]).toEqual([1200, 720]);
    expect(canvas.style.width).toBe("600px");
  });

  it("puts teammates' names on the left near the right edge", () => {
    render(<MapViewport {...props({ teammates: [{ id: "k", name: "Kai", color: "#a78bfa", x: 90, y: 50 }, { id: "m", name: "Mia", color: "#f472b6", x: 40, y: 50 }] })} />);
    expect(within(screen.getByTestId("teammate-Kai")).getByText("Kai").style.right).not.toBe("");
    expect(within(screen.getByTestId("teammate-Mia")).getByText("Mia").style.left).not.toBe("");
  });

  it("nothing crashes without a 2D context", () => {
    expect(() => render(<MapViewport {...props({ teammates: [{ id: "k", name: "Kai", color: "#a78bfa", x: 60, y: 60 }] })} />)).not.toThrow();
  });
});
