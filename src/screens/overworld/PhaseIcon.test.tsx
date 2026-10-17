import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhaseIcon } from "./PhaseIcon";
import { TopHud } from "./TopHud";

describe("PhaseIcon", () => {
  it("is a decorative pixel icon per phase, each with its own colours and shape", () => {
    const shapes = (["Day", "Dusk", "Night"] as const).map((phase) => {
      const { container, unmount } = render(<PhaseIcon phase={phase} />);
      const svg = container.querySelector("svg")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("data-phase", phase);
      expect(svg).toHaveAttribute("shape-rendering", "crispEdges");
      const out = [...svg.querySelectorAll("rect")].map((r) => `${r.getAttribute("x")},${r.getAttribute("y")},${r.getAttribute("fill")}`).join("|");
      unmount();
      return out;
    });
    expect(new Set(shapes).size).toBe(3);
    for (const s of shapes) expect(s.length).toBeGreaterThan(20);
  });
});

describe("TopHud time", () => {
  const hud = (minutes: number) =>
    render(<TopHud hp={100} minutes={minutes} onMenu={() => {}} onCodex={() => {}} onHelp={() => {}} region="C++ Peaks" />);

  it("shows the sun by day, the sunset at dusk and the moon at night, beside the time text", () => {
    for (const [minutes, phase, text] of [[12 * 60, "Day", "Day / 12:00"], [19 * 60 + 29, "Dusk", "Dusk / 19:29"], [23 * 60, "Night", "Night / 23:00"]] as const) {
      const { container, unmount } = hud(minutes);
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(container.querySelector(`svg[data-phase="${phase}"]`)).not.toBeNull();
      expect(container.querySelectorAll("svg[data-phase]")).toHaveLength(1);
      unmount();
    }
  });
});
