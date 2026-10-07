import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => vi.restoreAllMocks());

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

  it("Exit Game shows the farewell screen and Back to Menu returns", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /exit game/i }));
    expect(screen.getByText(/thanks for playing/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /back to menu/i }));
    expect(screen.getByRole("button", { name: /solo quest/i })).toBeInTheDocument();
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
