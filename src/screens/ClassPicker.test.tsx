import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLASSES, CLASS_IDS, type ClassId } from "../game/classes";
import { ClassPicker } from "./ClassPicker";

const setup = (over: { initial?: ClassId; mode?: "solo" | "team" } = {}) => {
  const onContinue = vi.fn();
  const onBack = vi.fn();
  render(<ClassPicker initial={over.initial ?? "warrior"} mode={over.mode ?? "solo"} onContinue={onContinue} onBack={onBack} />);
  return { onContinue, onBack, user: userEvent.setup() };
};
const radio = (name: string) => screen.getByRole("radio", { name });

describe("ClassPicker", () => {
  it("offers the six classes in a radio group, with their blurbs, and checks the initial one", () => {
    setup({ initial: "tank" });
    const group = screen.getByRole("radiogroup", { name: "Choose your class" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual(CLASS_IDS.map((id) => CLASSES[id].name));
    for (const id of CLASS_IDS) expect(screen.getByText(CLASSES[id].blurb)).toBeInTheDocument();
    expect(radio("Tank")).toBeChecked();
    expect(radio("Warrior")).not.toBeChecked();
  });

  it("clicking a card selects it, and Start continues with it", async () => {
    const { user, onContinue } = setup();
    await user.click(radio("Mage"));
    expect(radio("Mage")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "[ Start ]" }));
    expect(onContinue).toHaveBeenCalledWith("mage");
  });

  it("the arrow keys move the selection and its focus, wrapping around", async () => {
    const { user } = setup({ initial: "healer" });
    radio("Healer").focus();
    await user.keyboard("{ArrowRight}");
    expect(radio("Warrior")).toBeChecked();
    expect(radio("Warrior")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(radio("Healer")).toBeChecked();
    await user.keyboard("{ArrowUp}");
    expect(radio("Tank")).toBeChecked();
    await user.keyboard("{ArrowDown}");
    expect(radio("Healer")).toBeChecked();
  });

  it("Enter on a card continues with the selected class", async () => {
    const { user, onContinue } = setup({ initial: "archer" });
    radio("Archer").focus();
    await user.keyboard("{Enter}");
    expect(onContinue).toHaveBeenCalledWith("archer");
  });

  it("the main button says Continue for a team game", () => {
    setup({ mode: "team" });
    expect(screen.getByRole("button", { name: "[ Continue ]" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "[ Start ]" })).not.toBeInTheDocument();
  });

  it("Back goes back and starts nothing", async () => {
    const { user, onBack, onContinue } = setup();
    await user.click(screen.getByRole("button", { name: "[ Back ]" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("every card has an aria-hidden preview and a touch-sized target", () => {
    setup();
    for (const id of CLASS_IDS) {
      const card = radio(CLASSES[id].name);
      expect(card.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(card.className).toContain("pointer-coarse:min-h-11");
    }
  });

  it("an initial class that is not valid falls back to the warrior", () => {
    setup({ initial: "wizard" as never });
    expect(radio("Warrior")).toBeChecked();
  });
});
