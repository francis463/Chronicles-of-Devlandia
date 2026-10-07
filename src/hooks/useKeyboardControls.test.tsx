import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Overworld } from "../screens/overworld/Overworld";

const noop = () => {};
const player = () => screen.getByTestId("player");

describe("useKeyboardControls: movement", () => {
  it("moves with arrow keys and WASD (case-insensitive)", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} />);
    await user.keyboard("{ArrowUp}");
    expect(player().style.top).toBe("68%");
    await user.keyboard("D");
    expect(player().style.left).toBe("32%");
    await user.keyboard("s");
    expect(player().style.top).toBe("72%");
    await user.keyboard("{ArrowLeft}");
    expect(player().style.left).toBe("28%");
  });

  it("prevents the default action only for handled keys", () => {
    render(<Overworld onMenu={noop} />);
    expect(fireEvent.keyDown(window, { key: "ArrowDown" })).toBe(false);
    expect(fireEvent.keyDown(window, { key: "q" })).toBe(true);
  });

  it("ignores keys while downed", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ hp: 0 }} />);
    await user.keyboard("{ArrowUp}");
    expect(player().style.top).toBe("72%");
  });

  it("ignores keys while the terminal is open", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ terminalOpen: true, player: { x: 50, y: 58 } }} />);
    await user.keyboard("{ArrowUp}we");
    expect(player().style.top).toBe("58%");
    expect(screen.queryByText("Gate terminal ready. Puzzle link found.")).toBeNull();
  });

  it("ignores keys typed into a text field", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="note" />
        <Overworld onMenu={noop} />
      </>,
    );
    await user.type(screen.getByRole("textbox", { name: "note" }), "wwaae");
    expect(player().style.left).toBe("28%");
    expect(player().style.top).toBe("72%");
  });
});

describe("useKeyboardControls: interact", () => {
  it("[E] does nothing out of range", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} />);
    await user.keyboard("e");
    expect(screen.queryByText(/Gate terminal ready/)).toBeNull();
    expect(screen.queryByRole("region", { name: "POI Inspection" })).toBeNull();
  });

  it("[E] interacts with the nearest point of interest in range", async () => {
    const user = userEvent.setup();
    render(<Overworld onMenu={noop} initial={{ player: { x: 80, y: 22 } }} />);
    await user.keyboard("E");
    expect(screen.getByText("Supply cache opened: +1 Repair Patch.")).toBeInTheDocument();
  });

  it.todo("[E] next to the gate opens the terminal dialog");
  it.todo("typing in the terminal input does not move the player");
  it.todo("Escape closes the terminal dialog");
});
