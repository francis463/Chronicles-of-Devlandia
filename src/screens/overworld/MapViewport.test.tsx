import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POIS } from "../../game/constants";
import type { SceneInput } from "../../render/scene";
import { MapViewport } from "./MapViewport";

// The real canvas still renders (other tests query it); this only records what the viewport asks it to draw.
const drawn = vi.hoisted(() => [] as Array<{ input: SceneInput }>);
vi.mock("./MapCanvas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./MapCanvas")>();
  return {
    ...actual,
    MapCanvas: (props: Parameters<typeof actual.MapCanvas>[0]) => {
      drawn.push(props);
      return createElement(actual.MapCanvas, props);
    },
  };
});
beforeEach(() => void (drawn.length = 0));

type Props = Parameters<typeof MapViewport>[0];
const props = (over: Partial<Props> = {}): Props => ({
  zone: "peaks",
  player: { x: 28, y: 72 },
  drone: { x: 36, y: 70 },
  minutes: 19 * 60 + 29,
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
  card: null,
  prompt: "",
  badges: [],
  matcherSolved: false,
  archiveOpen: false,
  ...over,
});

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 1 });
});

describe("MapViewport per zone", () => {
  it("each zone shows its own buttons and captions", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    for (const name of ["[G] Gate", "[T] Tower", "[X] Supply Cache"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(screen.getByText("← Dev Village")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "[V] Ada" })).toBeNull();
    rerender(<MapViewport {...props({ zone: "village" })} />);
    for (const name of ["[V] Ada", "[P] Signpost"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    for (const text of ["(Dev Village)", "C++ Peaks →"]) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "[G] Gate" })).toBeNull();
    expect(screen.queryByText("(Snowy Peaks Biome)")).toBeNull();
  });

  it("the village buttons talk to Ada and read the signpost", () => {
    const onInteract = vi.fn();
    render(<MapViewport {...props({ zone: "village", onInteract })} />);
    fireEvent.click(screen.getByRole("button", { name: "[V] Ada" }));
    fireEvent.click(screen.getByRole("button", { name: "[P] Signpost" }));
    expect(onInteract.mock.calls).toEqual([["villager"], ["signpost"]]);
  });

  it("the inspection card shows the card it is given", () => {
    const { rerender } = render(
      <MapViewport {...props({ zone: "village", card: { title: "Ada", text: "Line X", y: 70 } })} />,
    );
    const card = screen.getByRole("region", { name: "POI Inspection" });
    expect(within(card).getByText("Ada")).toBeInTheDocument();
    expect(within(card).getByText("Line X")).toBeInTheDocument();
    rerender(<MapViewport {...props({ zone: "village", card: null })} />);
    expect(screen.queryByRole("region", { name: "POI Inspection" })).toBeNull();
  });

  it("the zone fade covers the map under the fog, never takes clicks, and is skipped under reduced motion", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    const fade = screen.getByTestId("zone-fade");
    expect(fade).toHaveAttribute("aria-hidden", "true");
    expect(fade.className.split(/\s+/)).toEqual(expect.arrayContaining(["pointer-events-none", "z-[5]", "motion-reduce:hidden"]));
    rerender(<MapViewport {...props({ zone: "village" })} />);
    expect(screen.getByTestId("zone-fade")).not.toBe(fade);
  });

  it("in the village the found semicolon neither shows nor moves your labels", () => {
    const here = { zone: "village" as const, player: { x: 52, y: 80 }, drone: { x: 44, y: 78 } };
    const { rerender } = render(<MapViewport {...props(here)} />);
    const style = screen.getByTestId("player").firstElementChild!.getAttribute("style");
    rerender(<MapViewport {...props({ ...here, artifactFound: true, clueDecoded: true })} />);
    expect(screen.getByTestId("player").firstElementChild!.getAttribute("style")).toBe(style);
    expect(screen.queryByTestId("artifact")).toBeNull();
    expect(screen.queryByTestId("dig-spot")).toBeNull();
  });

  it("the world layer is replaced, not moved, when the zone changes", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    const layer = screen.getByTestId("world-layer");
    rerender(<MapViewport {...props({ zone: "village" })} />);
    expect(screen.getByTestId("world-layer")).not.toBe(layer);
  });
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

  it("landmark focus and hover keep the dark outline inside the light ring", () => {
    // jsdom can't resolve Tailwind's cascade, so this pins the classes. In Tailwind 4 a bare
    // outline-none / outline-hidden sets --tw-outline-style:none on the element, and
    // focus-visible:outline-2 reads that variable, so the dark outline would never draw.
    render(<MapViewport {...props()} />);
    for (const name of ["[G] Gate", "[T] Tower", "[X] Supply Cache"]) {
      const classes = screen.getByRole("button", { name }).className.split(/\s+/);
      expect(classes).not.toContain("outline-none");
      expect(classes).not.toContain("outline-hidden");
      expect(classes).toEqual(expect.arrayContaining(["focus-visible:outline-2", "focus-visible:outline-[#0f172a]", "hover:outline-2", "hover:outline-[#0f172a]"]));
    }
  });

  it("the caption of the landmark you can use steps aside for the prompt and your explorer, and stays the button's name", () => {
    const cases = [
      { id: "gate", name: "[G] Gate" },
      { id: "chest", name: "[X] Supply Cache" },
      { id: "tower", name: "[T] Tower" },
    ] as const;
    for (const { id } of cases) {
      const poi = POIS.find((p) => p.id === id)!;
      const { unmount } = render(<MapViewport {...props({ player: { x: poi.x, y: poi.y + 6 }, inRange: poi, prompt: `[E] Inspect ${poi.label}` })} />);
      for (const other of cases) {
        const caption = within(screen.getByRole("button", { name: other.name })).getByText(other.name);
        if (other.id === id) expect(caption).toHaveClass("opacity-0");
        else expect(caption).not.toHaveClass("opacity-0");
      }
      unmount();
    }
    render(<MapViewport {...props()} />);
    for (const { name } of cases) expect(within(screen.getByRole("button", { name })).getByText(name)).not.toHaveClass("opacity-0");
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
    expect(screen.getByText("Frozen River")).toBeInTheDocument();
    rerender(<MapViewport {...props({ towerPowered: true })} />);
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
    render(<MapViewport {...props({ teammates: [{ id: "k", name: "Kai", color: "#a78bfa", x: 90, y: 50, zone: "peaks" }, { id: "m", name: "Mia", color: "#f472b6", x: 40, y: 50, zone: "peaks" }] })} />);
    expect(within(screen.getByTestId("teammate-Kai")).getByText("Kai").style.right).not.toBe("");
    expect(within(screen.getByTestId("teammate-Mia")).getByText("Mia").style.left).not.toBe("");
  });

  it("nothing crashes without a 2D context", () => {
    expect(() => render(<MapViewport {...props({ teammates: [{ id: "k", name: "Kai", color: "#a78bfa", x: 60, y: 60, zone: "peaks" }] })} />)).not.toThrow();
  });
});

describe("MapViewport chests, the Syntax Terminal and the Archive", () => {
  it("the Peaks show six chest buttons and the village three plus Terminal and Archive, named by their spoken forms", () => {
    const onInteract = vi.fn();
    const { rerender } = render(<MapViewport {...props({ onInteract })} />);
    const peaks = ["C++ 1 chest", "Java chest", "C++ 2 chest", "HTML chest", "CSS chest", "Python 1 chest"];
    for (const name of peaks) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "C++ 1 chest" })).getByText("C++ I")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Syntax Terminal" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "HTML chest" }));
    rerender(<MapViewport {...props({ zone: "village", onInteract })} />);
    for (const name of ["PHP chest", "SQL chest", "Python 2 chest", "Syntax Terminal", "Archive"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Syntax Terminal" })).getByText("Terminal")).toBeInTheDocument();
    for (const name of peaks) expect(screen.queryByRole("button", { name })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Syntax Terminal" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "SQL chest" }));
    expect(onInteract.mock.calls).toEqual([["chest-html"], ["terminal"], ["archive"], ["chest-sql"]]);
  });

  it("earned chests' captions read SQL ✓, and the button is named SQL chest, earned", () => {
    render(<MapViewport {...props({ zone: "village", badges: ["chest-sql"] })} />);
    const sql = screen.getByRole("button", { name: "SQL chest, earned" });
    expect(within(sql).getByText("SQL ✓")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PHP chest" })).toBeInTheDocument();
  });

  it("the Archive caption reads Archive, then C#, then C# ✓, and the button is named Archive, then C sharp chest, then C sharp chest, earned", () => {
    const { rerender } = render(<MapViewport {...props({ zone: "village" })} />);
    expect(within(screen.getByRole("button", { name: "Archive" })).getByText("Archive")).toBeInTheDocument();
    rerender(<MapViewport {...props({ zone: "village", archiveOpen: true })} />);
    expect(within(screen.getByRole("button", { name: "C sharp chest" })).getByText("C#")).toBeInTheDocument();
    rerender(<MapViewport {...props({ zone: "village", archiveOpen: true, badges: ["chest-cs"] })} />);
    expect(within(screen.getByRole("button", { name: "C sharp chest, earned" })).getByText("C# ✓")).toBeInTheDocument();
  });

  it("at 1× a chest caption is hidden until hovered, focused or in reach, but the button keeps its accessible name (Review Focus 5)", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    expect(screen.getByTestId("world-layer").style.width).toBe("320px");
    const button = screen.getByRole("button", { name: "HTML chest" });
    expect(button).toHaveClass("group");
    const chip = within(button).getByText("HTML");
    expect(chip).toHaveClass("opacity-0");
    expect(chip.className.split(/\s+/)).toEqual(expect.arrayContaining(["group-hover:opacity-100", "group-focus-visible:opacity-100"]));
    // The landmarks' captions still show at 1×.
    expect(within(screen.getByRole("button", { name: "[G] Gate" })).getByText("[G] Gate")).not.toHaveClass("opacity-0");
    const html = { id: "chest-html" as const, label: "HTML Chest", x: 10, y: 60 };
    rerender(<MapViewport {...props({ player: { x: 10, y: 66 }, inRange: html, prompt: "[E] Open HTML Chest" })} />);
    expect(within(screen.getByRole("button", { name: "HTML chest" })).getByText("HTML")).not.toHaveClass("opacity-0");
    expect(within(screen.getByRole("button", { name: "CSS chest" })).getByText("CSS")).toHaveClass("opacity-0");
  });

  it("a hidden caption takes no taps, a showing landmark caption sits above the other buttons, and a 1× chest caption never takes taps", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    const html = within(screen.getByRole("button", { name: "HTML chest" })).getByText("HTML");
    expect(html).toHaveClass("pointer-events-none");
    const cache = within(screen.getByRole("button", { name: "[X] Supply Cache" })).getByText("[X] Supply Cache");
    expect(cache).toHaveClass("z-10");
    expect(cache).not.toHaveClass("pointer-events-none");
    const poi = POIS.find((p) => p.id === "chest")!;
    rerender(<MapViewport {...props({ player: { x: poi.x, y: poi.y + 6 }, inRange: poi, prompt: "[E] Inspect Supply Cache" })} />);
    expect(within(screen.getByRole("button", { name: "[X] Supply Cache" })).getByText("[X] Supply Cache")).toHaveClass("pointer-events-none");
    // At 1× a chest caption is information only: shown in reach it still takes no taps, so a tap on a
    // neighbouring drawing under it reaches that place (final review).
    rerender(<MapViewport {...props({ inRange: { id: "chest-html", label: "HTML Chest", x: 10, y: 60 } })} />);
    const shown = within(screen.getByRole("button", { name: "HTML chest" })).getByText("HTML");
    expect(shown).not.toHaveClass("opacity-0");
    expect(shown).toHaveClass("pointer-events-none");
    expect(shown).not.toHaveClass("z-10");
  });

  it("chest buttons are disabled while downed, and the old landmarks keep their caption as their name", () => {
    render(<MapViewport {...props({ downed: true })} />);
    expect(screen.getByRole("button", { name: "HTML chest" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "HTML chest" })).toHaveAttribute("aria-label", "HTML chest");
  });
});

describe("MapViewport pings", () => {
  const ping = (over = {}) => ({ id: "k", name: "Kai", color: "#a78bfa", zone: "peaks" as const, x: 60, y: 40, ...over });

  it("draws a ring and the sender's name at the point, never taking clicks", () => {
    render(<MapViewport {...props({ pings: [ping()] })} />);
    const marker = screen.getByTestId("ping-k");
    expect(marker).toHaveAttribute("aria-hidden", "true");
    expect(marker.className).toContain("pointer-events-none");
    expect(marker).toHaveStyle({ left: "60%", top: "40%" });
    expect(within(marker).getByText("Kai")).toHaveStyle({ color: "#a78bfa" });
  });

  it("makes the ring grow once a second and stand still under reduced motion", () => {
    render(<MapViewport {...props({ pings: [ping()] })} />);
    const ring = screen.getByTestId("ping-k").querySelector(".rounded-full")!;
    expect(ring.className).toContain("border-2");
    expect(ring.className).toContain("animate-[ping-ring_1s_ease-out_infinite]");
    expect(ring.className).toContain("motion-reduce:animate-none");
    expect(ring).toHaveStyle({ borderColor: "#a78bfa" });
  });

  it("draws only pings in the zone you are in", () => {
    const { rerender } = render(<MapViewport {...props({ pings: [ping({ zone: "village" })] })} />);
    expect(screen.queryByTestId("ping-k")).toBeNull();
    rerender(<MapViewport {...props({ zone: "village", pings: [ping({ zone: "village" })] })} />);
    expect(screen.getByTestId("ping-k")).toBeInTheDocument();
  });

  it("draws no pings by default", () => {
    render(<MapViewport {...props()} />);
    expect(screen.queryByTestId(/^ping-/)).toBeNull();
  });
});

describe("MapViewport: your view", () => {
  it("passes the weather and the light override to the scene", () => {
    render(<MapViewport {...props({ snow: true, lightMode: "night" })} />);
    expect(drawn.at(-1)!.input.snow).toBe(true);
    expect(drawn.at(-1)!.input.lightMode).toBe("night");
  });

  it("leaves both unset by default", () => {
    render(<MapViewport {...props()} />);
    expect(drawn.at(-1)!.input.snow).toBeFalsy();
    expect(drawn.at(-1)!.input.lightMode ?? "auto").toBe("auto");
  });
});
