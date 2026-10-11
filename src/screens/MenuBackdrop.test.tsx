import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MenuBackdrop } from "./MenuBackdrop";

describe("MenuBackdrop", () => {
  it("shows the pixel-art mountain scene covering the window, kept crisp, with a wash for readability", () => {
    render(<MenuBackdrop />);
    const backdrop = screen.getByTestId("menu-backdrop");
    const art = screen.getByTestId("menu-backdrop-art");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(art.style.backgroundImage).toMatch(/menu-backdrop.*\.gif/);
    expect(art.style.backgroundSize).toBe("cover");
    expect(art.style.imageRendering).toBe("pixelated");
    expect(backdrop.querySelector(".bg-\\[rgba\\(15\\,23\\,42\\,0\\.45\\)\\]")).not.toBeNull();
  });
});
