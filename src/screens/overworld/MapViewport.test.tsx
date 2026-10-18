import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
  lighthouseLit: false,
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
    const { rerender } = render(<MapViewport {...props({ zone: "foggaten" })} />);
    expect(screen.queryByTestId("dig-spot")).toBeNull();
    rerender(<MapViewport {...props({ zone: "foggaten", clueDecoded: true })} />);
    expect(screen.getByTestId("dig-spot")).toHaveTextContent("Dig spot");
    expect(screen.queryByTestId("artifact")).toBeNull();
    rerender(<MapViewport {...props({ zone: "foggaten", clueDecoded: true, artifactFound: true })} />);
    expect(screen.queryByTestId("dig-spot")).toBeNull();
    expect(screen.getByTestId("artifact")).toHaveTextContent("Golden Semicolon");
    rerender(<MapViewport {...props({ zone: "forest", clueDecoded: true })} />);
    expect(screen.queryByTestId("dig-spot")).toBeNull();
    rerender(<MapViewport {...props({ zone: "forest", clueDecoded: true, artifactFound: true })} />);
    expect(screen.queryByTestId("artifact")).toBeNull();
    rerender(<MapViewport {...props({ zone: "peaks", clueDecoded: true })} />);
    expect(screen.queryByTestId("dig-spot")).toBeNull();
    rerender(<MapViewport {...props({ zone: "peaks", clueDecoded: true, artifactFound: true })} />);
    expect(screen.queryByTestId("artifact")).toBeNull();
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
  it("the Peaks show the lodge and cave chests and the village the hut and windmill chests plus Terminal and Archive, each named for its landmark and spoken language", () => {
    const onInteract = vi.fn();
    const { rerender } = render(<MapViewport {...props({ onInteract })} />);
    const peaks = ["Ski Lodge, HTML chest", "Ice Cave, CSS chest"];
    for (const name of peaks) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Ski Lodge, HTML chest" })).getByText("Lodge")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Syntax Terminal" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ski Lodge, HTML chest" }));
    rerender(<MapViewport {...props({ zone: "village", onInteract })} />);
    for (const name of ["Hut, PHP chest", "Windmill, SQL chest", "Syntax Terminal", "Archive"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Syntax Terminal" })).getByText("Terminal")).toBeInTheDocument();
    for (const name of peaks) expect(screen.queryByRole("button", { name })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Syntax Terminal" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Windmill, SQL chest" }));
    expect(onInteract.mock.calls).toEqual([["chest-html"], ["terminal"], ["archive"], ["chest-sql"]]);
  });

  it("every other zone's landmark chests are buttons too: oak, pyramid, oasis, shipwreck, pier and ruins", () => {
    const zones = [["forest", ["Old Oak, JavaScript chest"]], ["desert", ["Pyramid, Java chest", "Oasis, Python 2 chest"]], ["beach", ["Pier, C++ 1 chest", "Shipwreck, C++ 2 chest"]], ["foggaten", ["Ruins, Python 1 chest"]]] as const;
    for (const [zone, names] of zones) {
      const { unmount } = render(<MapViewport {...props({ zone })} />);
      for (const name of names) expect(screen.getByRole("button", { name }), `${zone} ${name}`).toBeInTheDocument();
      unmount();
    }
  });

  it("earned chests' captions read Mill ✓, and the button is named for its landmark, earned", () => {
    render(<MapViewport {...props({ zone: "village", badges: ["chest-sql"] })} />);
    const sql = screen.getByRole("button", { name: "Windmill, SQL chest, earned" });
    expect(within(sql).getByText("Mill ✓")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hut, PHP chest" })).toBeInTheDocument();
  });

  it("the Archive caption reads Archive, then C#, then C# ✓, and the button is named Archive, then C sharp chest, then C sharp chest, earned", () => {
    const { rerender } = render(<MapViewport {...props({ zone: "village" })} />);
    expect(within(screen.getByRole("button", { name: "Archive" })).getByText("Archive")).toBeInTheDocument();
    rerender(<MapViewport {...props({ zone: "village", archiveOpen: true })} />);
    expect(within(screen.getByRole("button", { name: "C sharp chest" })).getByText("C#")).toBeInTheDocument();
    rerender(<MapViewport {...props({ zone: "village", archiveOpen: true, badges: ["chest-cs"] })} />);
    expect(within(screen.getByRole("button", { name: "C sharp chest, earned" })).getByText("C# ✓")).toBeInTheDocument();
  });

  it("a landmark chest's caption shows at 1× like any landmark's, and hides while it is in reach (the prompt takes over)", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    expect(screen.getByTestId("world-layer").style.width).toBe("320px");
    const button = screen.getByRole("button", { name: "Ski Lodge, HTML chest" });
    expect(within(button).getByText("Lodge")).not.toHaveClass("opacity-0");
    expect(within(screen.getByRole("button", { name: "[G] Gate" })).getByText("[G] Gate")).not.toHaveClass("opacity-0");
    const html = { id: "chest-html" as const, label: "Ski Lodge", x: 19.4, y: 89.4 };
    rerender(<MapViewport {...props({ player: { x: 19, y: 84 }, inRange: html, prompt: "[E] Search Ski Lodge" })} />);
    expect(within(screen.getByRole("button", { name: "Ski Lodge, HTML chest" })).getByText("Lodge")).toHaveClass("opacity-0");
  });

  it("chest buttons are disabled while downed and keep their landmark name", () => {
    render(<MapViewport {...props({ downed: true })} />);
    expect(screen.getByRole("button", { name: "Ski Lodge, HTML chest" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ski Lodge, HTML chest" })).toHaveAttribute("aria-label", "Ski Lodge, HTML chest");
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

describe("MapViewport: the Dense Forest", () => {
  it("shows its own caption and exit sign, and none of the other zones' buttons or captions", () => {
    render(<MapViewport {...props({ zone: "forest" })} />);
    expect(screen.getByText("(Dense Forest)")).toBeInTheDocument();
    expect(screen.getByText("↑ C++ Peaks")).toBeInTheDocument();
    for (const name of ["[G] Gate", "[T] Tower", "[X] Supply Cache", "[V] Ada"]) expect(screen.queryByRole("button", { name })).toBeNull();
    for (const text of ["(Snowy Peaks Biome)", "(Dev Village)", "← Dev Village", "Forest ↓"]) expect(screen.queryByText(text)).toBeNull();
  });

  it("has three place buttons that call onInteract, and only the forest has them", () => {
    const onInteract = vi.fn();
    const { rerender } = render(<MapViewport {...props({ zone: "forest", onInteract })} />);
    const names = ["[R] Ranger", "[F] Campfire", "[P] Signpost"];
    for (const name of names) fireEvent.click(screen.getByRole("button", { name }));
    expect(onInteract.mock.calls).toEqual([["ranger"], ["campfire"], ["forest-signpost"]]);
    rerender(<MapViewport {...props({ zone: "peaks" })} />);
    for (const name of ["[R] Ranger", "[F] Campfire"]) expect(screen.queryByRole("button", { name })).toBeNull();
  });

  it("the Peaks show the way south", () => {
    render(<MapViewport {...props()} />);
    expect(screen.getByText("Forest ↓")).toBeInTheDocument();
    expect(screen.getByText("(Dense Forests Biome)")).toBeInTheDocument();
  });

  it("the fog is off in the forest even with the tower unpowered, and still on in the village (Review Focus 5)", () => {
    const { rerender } = render(<MapViewport {...props({ zone: "village" })} />);
    expect(screen.getByTestId("fog").style.opacity).toBe("1");
    rerender(<MapViewport {...props({ zone: "forest" })} />);
    expect(screen.getByTestId("fog").style.opacity).toBe("0");
    rerender(<MapViewport {...props({ zone: "peaks" })} />);
    expect(screen.getByTestId("fog").style.opacity).toBe("1");
  });

  it("crossing into the forest re-keys the fade and the world layer", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    const fade = screen.getByTestId("zone-fade");
    const layer = screen.getByTestId("world-layer");
    rerender(<MapViewport {...props({ zone: "forest" })} />);
    expect(screen.getByTestId("zone-fade")).not.toBe(fade);
    expect(screen.getByTestId("world-layer")).not.toBe(layer);
  });
});

describe("MapViewport on Foggaten Island", () => {
  const island = (over: Partial<Props> = {}) => props({ zone: "foggaten", player: { x: 30, y: 70 }, drone: { x: 34, y: 68 }, ...over });
  const reduceMotion = () => {
    window.matchMedia = ((query: string) => ({ media: query, matches: true, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
  };

  it("hands the lamp's state to the canvas", () => {
    render(<MapViewport {...island({ lighthouseLit: true })} />);
    expect(drawn.at(-1)?.input.lighthouseLit).toBe(true);
  });

  it("shows the island's caption and buttons", () => {
    render(<MapViewport {...island()} />);
    expect(screen.getByText("(Foggaten Island Biome)")).toBeInTheDocument();
    for (const name of ["[B] Dock", "[L] Lighthouse", "[H] Hermit", "[F] Campfire", "Ruins, Python 1 chest"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("drifts a mist over the island only, hidden from assistive tech, and holds it still with reduced motion", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    expect(screen.queryByTestId("mist")).toBeNull();
    rerender(<MapViewport {...island()} />);
    const mist = screen.getByTestId("mist");
    expect(mist).toHaveAttribute("aria-hidden", "true");
    expect(mist.className).toContain("pointer-events-none");
    expect(mist.className).toContain("animate-[mist-drift");
    cleanup();
    reduceMotion();
    render(<MapViewport {...island()} />);
    expect(screen.getByTestId("mist").className).not.toContain("mist-drift");
  });

  it("the mist is there until the lighthouse is lit, then fades away (and stays gone)", () => {
    const { rerender } = render(<MapViewport {...island({ lighthouseLit: false })} />);
    expect(screen.getByTestId("mist").style.opacity).toBe("1");
    rerender(<MapViewport {...island({ lighthouseLit: true })} />);
    expect(screen.getByTestId("mist").style.opacity).toBe("0");
    expect(screen.getByTestId("mist").className).toContain("transition-opacity");
  });

  it("covers the map with the crossing fade only while a boat crossing is under way", () => {
    vi.useFakeTimers();
    const { rerender } = render(<MapViewport {...props()} />);
    expect(screen.getByTestId("crossing-fade").style.opacity).toBe("0");
    expect(screen.getByTestId("crossing-fade")).toHaveAttribute("aria-hidden", "true");
    rerender(<MapViewport {...island()} />);
    expect(screen.getByTestId("crossing-fade").style.opacity).toBe("1");
    act(() => void vi.advanceTimersByTime(700));
    expect(screen.getByTestId("crossing-fade").style.opacity).toBe("0");
    vi.useRealTimers();
  });
});

describe("MapViewport in the Snowy Peaks: the signpost, the weather station and the snow cave", () => {
  it("shows the signpost and the weather station, and presses go to their places", () => {
    const onInteract = vi.fn();
    render(<MapViewport {...props({ onInteract })} />);
    fireEvent.click(screen.getByRole("button", { name: "Signpost" }));
    fireEvent.click(screen.getByRole("button", { name: "Weather Station" }));
    expect(onInteract.mock.calls).toEqual([["peaks-signpost"], ["weather-station"]]);
  });

  it("the snow cave's button only exists once the tower is powered", () => {
    const { rerender } = render(<MapViewport {...props()} />);
    expect(screen.queryByRole("button", { name: "Snow Cave" })).toBeNull();
    rerender(<MapViewport {...props({ towerPowered: true })} />);
    expect(screen.getByRole("button", { name: "Snow Cave" })).toBeInTheDocument();
  });

  it("the other zones have none of them", () => {
    for (const zone of ["village", "forest", "foggaten"] as const) {
      const { unmount } = render(<MapViewport {...props({ zone, towerPowered: true })} />);
      expect(screen.queryByRole("button", { name: "Weather Station" }), zone).toBeNull();
      expect(screen.queryByRole("button", { name: "Snow Cave" }), zone).toBeNull();
      unmount();
    }
  });
});

describe("MapViewport in the Sunbaked Desert", () => {
  const desert = (over: Partial<Props> = {}) => props({ zone: "desert", player: { x: 90, y: 70 }, drone: { x: 86, y: 68 }, ...over });

  it("shows the desert's caption and four place buttons, which go to their places", () => {
    const onInteract = vi.fn();
    render(<MapViewport {...desert({ onInteract })} />);
    expect(screen.getByText("(Sunbaked Desert Biome)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "[N] Nomad" }));
    fireEvent.click(screen.getByRole("button", { name: "Oasis, Python 2 chest" }));
    fireEvent.click(screen.getByRole("button", { name: "Pyramid, Java chest" }));
    fireEvent.click(screen.getByRole("button", { name: "Signpost" }));
    expect(onInteract.mock.calls).toEqual([["nomad"], ["chest-py-2"], ["chest-java"], ["desert-signpost"]]);
  });

  it("has no fog of war and shows the way back to the forest", () => {
    render(<MapViewport {...desert()} />);
    expect(screen.getByTestId("fog").style.opacity).toBe("0");
    expect(screen.getByText("Forest →")).toBeInTheDocument();
  });
});

describe("MapViewport on the Sunny Beach", () => {
  const beach = (over: Partial<Props> = {}) => props({ zone: "beach", player: { x: 10, y: 70 }, drone: { x: 14, y: 68 }, ...over });

  it("shows the beach's caption and four place buttons, which go to their places", () => {
    const onInteract = vi.fn();
    render(<MapViewport {...beach({ onInteract })} />);
    expect(screen.getByText("(Sunny Beach Biome)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "[F] Fisher" }));
    fireEvent.click(screen.getByRole("button", { name: "Pier, C++ 1 chest" }));
    fireEvent.click(screen.getByRole("button", { name: "Shipwreck, C++ 2 chest" }));
    fireEvent.click(screen.getByRole("button", { name: "Signpost" }));
    expect(onInteract.mock.calls).toEqual([["fisher"], ["chest-cpp-1"], ["chest-cpp-2"], ["beach-signpost"]]);
  });

  it("has no fog of war and shows the way back to the forest", () => {
    render(<MapViewport {...beach()} />);
    expect(screen.getByTestId("fog").style.opacity).toBe("0");
    expect(screen.getByText("← Forest")).toBeInTheDocument();
  });
});

describe("MapViewport zoom", () => {
  const layer = () => {
    const l = screen.getByTestId("world-layer");
    return [l.style.left, l.style.top, l.style.width, l.style.height];
  };

  it("zoom 0 is the fit, and a step up scrolls with the player", () => {
    const { rerender } = render(<MapViewport {...props({ zoom: 0 })} />);
    expect(layer()).toEqual(["140px", "90px", "320px", "180px"]);
    rerender(<MapViewport {...props({ zoom: 1 })} />);
    expect(layer()).toEqual(["0px", "0px", "640px", "360px"]);
    rerender(<MapViewport {...props({ zoom: 2, player: { x: 90, y: 50 } })} />);
    expect(parseFloat(screen.getByTestId("world-layer").style.left)).toBe(600 - 960);
  });

  it("auto zoom picks the step for the view", () => {
    render(<MapViewport {...props({ zoom: "auto" })} />);
    expect(layer()).toEqual(["0px", "0px", "640px", "360px"]);
  });

  it("the zoom buttons show only when asked, name the step and stop at the ends", () => {
    const onZoom = vi.fn();
    const { rerender } = render(<MapViewport {...props({ zoom: 0 })} />);
    expect(screen.queryByRole("group", { name: "Map view" })).toBeNull();
    rerender(<MapViewport {...props({ zoom: 0, onZoom })} />);
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(onZoom).toHaveBeenCalledWith(1);
    rerender(<MapViewport {...props({ zoom: 3, onZoom })} />);
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(onZoom).toHaveBeenLastCalledWith(2);
    expect(screen.getByText("4×")).toBeInTheDocument();
  });

  it("a zoomed map keeps every landmark button over its drawing", () => {
    render(<MapViewport {...props({ zoom: 2, player: { x: 28, y: 72 } })} />);
    const gate = screen.getByRole("button", { name: "[G] Gate" });
    expect(Number.isFinite(parseFloat(gate.style.left))).toBe(true);
    expect(parseFloat(gate.style.width)).toBeGreaterThanOrEqual(44);
  });
});

describe("MapViewport in a zone bigger than one screen", () => {
  const BIG = { width: 640, height: 360 };
  const mapSize = (width: number, height: number) => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => height });
  };
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    Reflect.deleteProperty(HTMLElement.prototype, "clientHeight");
  });
  const layer = () => {
    const l = screen.getByTestId("world-layer");
    return { left: parseFloat(l.style.left), top: parseFloat(l.style.top), width: parseFloat(l.style.width), height: parseFloat(l.style.height) };
  };
  const forest = (over: Partial<Props> = {}) => props({ zone: "forest", player: { x: 50, y: 50 }, world: BIG, ...over });

  it("zoom 0 is a scrolling window at today's scale, centred on the player", () => {
    mapSize(1100, 540);
    render(<MapViewport {...forest({ zoom: 0 })} />);
    expect(layer()).toEqual({ left: Math.round(550 - 320.5 * 3), top: Math.round(270 - 180.5 * 3), width: 640 * 3, height: 360 * 3 });
  });

  it("the window stops at the world's edge", () => {
    mapSize(1100, 540);
    render(<MapViewport {...forest({ zoom: 0, player: { x: 6, y: 10 } })} />);
    expect(layer().left).toBe(0);
    expect(layer().top).toBe(0);
  });

  it("the lowest zoom shows the whole zone and says so; the zoom-out button stops there", () => {
    mapSize(1100, 540);
    const onZoom = vi.fn();
    render(<MapViewport {...forest({ zoom: -9, onZoom })} />);
    expect(layer()).toEqual({ left: 230, top: 90, width: 640, height: 360 });
    expect(screen.getByText("Whole map")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(onZoom).toHaveBeenCalledWith(-1);
  });

  it("a one-screen zone cannot zoom out below its fit", () => {
    mapSize(1100, 540);
    render(<MapViewport {...props({ zoom: -3, onZoom: vi.fn() })} />);
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    expect(layer().width).toBe(320 * 3);
  });
});
