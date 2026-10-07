import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("shows the main menu with title, tagline and footer", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /chronicles of devlandia/i })).toBeInTheDocument();
    expect(screen.getByText(/solve the map, break the code, find the treasure/i)).toBeInTheDocument();
    expect(screen.getByText("[?] HCI Help / Tutorials")).toBeInTheDocument();
    expect(screen.getByText("v1.0 | Offline Network")).toBeInTheDocument();
  });

  it("disables Team Lobby and Settings as coming soon", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /team lobby/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /settings/i })).toBeDisabled();
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(2);
  });

  it("Solo Quest opens the overworld", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /solo quest/i }));
    expect(screen.getByText(/overworld/i)).toBeInTheDocument();
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
