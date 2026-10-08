import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => vi.restoreAllMocks());

describe("Landing page backdrop", () => {
  it("draws the pixel-art world behind the main menu, hidden from screen readers", () => {
    render(<App />);
    const backdrop = screen.getByTestId("menu-backdrop");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(backdrop.className).toContain("fixed");
    expect(backdrop.className).toContain("-z-10");
    expect(backdrop.className).toContain("pointer-events-none");
    expect(backdrop.querySelector('[data-testid="map-canvas"]')).not.toBeNull();
    // a dark wash keeps the menu readable
    expect(backdrop.querySelector(".bg-\\[rgba\\(15\\,23\\,42\\,0\\.45\\)\\]")).not.toBeNull();
  });

  it("only on the landing page", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    expect(screen.queryByTestId("menu-backdrop")).toBeNull();
    expect(screen.getAllByTestId("map-canvas")).toHaveLength(1);
  });
});

describe("App", () => {
  it("shows the main menu with title, tagline and footer", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /chronicles of devlandia/i })).toBeInTheDocument();
    expect(screen.getByText(/solve the map, break the code, find the treasure/i)).toBeInTheDocument();
    expect(screen.getByText("[?] HCI Help / Tutorials")).toBeInTheDocument();
    expect(screen.getByText("v1.0 | Online Network")).toBeInTheDocument();
  });

  it("shows the browser's real connection status in the footer", () => {
    const onLine = vi.spyOn(navigator, "onLine", "get");
    render(<App />);
    onLine.mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event("offline")));
    expect(screen.getByText("v1.0 | Offline Network")).toBeInTheDocument();
    onLine.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(screen.getByText("v1.0 | Online Network")).toBeInTheDocument();
  });

  it("enables Team Lobby and keeps Settings as coming soon", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("button", { name: /settings/i })).toBeDisabled();
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /team lobby/i }));
    expect(screen.getByRole("heading", { name: "TEAM LOBBY" })).toBeInTheDocument();
  });

  it("Solo Quest opens the overworld", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    expect(screen.getByText("REGION: C++ PEAKS")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /solo quest/i })).toBeNull();
  });

  it("the main menu offers Solo Quest, Team Lobby and Settings, with no Exit Game", () => {
    render(<App />);
    const menu = within(screen.getByRole("navigation", { name: "Main menu" }));
    expect(menu.getAllByRole("button").map((b) => b.textContent)).toEqual(["Solo Quest", "Team Lobby", "SettingsComing soon"]);
    expect(screen.queryByRole("button", { name: /exit game/i })).toBeNull();
  });
});

describe("App navigation from the overworld", () => {
  it("[=] Menu returns to the main menu and Solo Quest starts a fresh game", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    await user.click(screen.getByRole("button", { name: "[X] Supply Cache" }));
    expect(screen.getByRole("button", { name: "[X] Empty Cache" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[=] Menu" }));
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    expect(screen.getByRole("button", { name: "[X] Supply Cache" })).toBeInTheDocument();
  });
});
