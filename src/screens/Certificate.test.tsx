import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHEST_IDS } from "../learn/chests";
import { Certificate } from "./Certificate";

const base = { name: "Ada", badges: [...CHEST_IDS], played: "3 h 20 min", hard: false, date: "October 17, 2026", onBack: () => {} };
const fakeContext = { fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(), fillStyle: "", strokeStyle: "", lineWidth: 0, font: "", textAlign: "" };
const original = HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  fakeContext.fillText.mockClear();
  HTMLCanvasElement.prototype.getContext = (() => fakeContext) as never;
  HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AAAA";
});
afterEach(() => {
  HTMLCanvasElement.prototype.getContext = original;
  vi.restoreAllMocks();
});

describe("Certificate", () => {
  it("is a dialog with the name box filled in, and the picture says who it is for", () => {
    render(<Certificate {...base} />);
    expect(screen.getByRole("dialog", { name: /certificate/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Name on the certificate")).toHaveValue("Ada");
    expect(screen.getByRole("img", { name: /Ada is a Devlandia Graduate with 11 language badges/ })).toBeInTheDocument();
    expect(fakeContext.fillText).toHaveBeenCalledWith("Ada", expect.any(Number), expect.any(Number));
  });

  it("a guest types their name and the certificate follows, falling back to Explorer when it is empty", async () => {
    const user = userEvent.setup();
    render(<Certificate {...base} name="" />);
    expect(screen.getByRole("img", { name: /Explorer is a Devlandia Graduate/ })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Name on the certificate"), "Kai");
    expect(screen.getByRole("img", { name: /Kai is a Devlandia Graduate/ })).toBeInTheDocument();
    expect(fakeContext.fillText).toHaveBeenCalledWith("Kai", expect.any(Number), expect.any(Number));
  });

  it("[ Download PNG ] saves the picture under a name made from theirs", async () => {
    const user = userEvent.setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    let saved: HTMLAnchorElement | null = null;
    const create = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = create(tag);
      if (tag === "a") saved = el as HTMLAnchorElement;
      return el;
    });
    render(<Certificate {...base} />);
    await user.click(screen.getByRole("button", { name: "[ Download PNG ]" }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(saved!.download).toBe("devlandia-certificate-ada.png");
    expect(saved!.href).toContain("data:image/png");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("[ Download PNG ] says so when the browser can't draw", async () => {
    const user = userEvent.setup();
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
    render(<Certificate {...base} />);
    await user.click(screen.getByRole("button", { name: "[ Download PNG ]" }));
    expect(screen.getByRole("status")).toHaveTextContent(/use Print instead/i);
  });

  it("[ Print ] writes the certificate page into a new window and prints it; a blocked window is explained", async () => {
    const user = userEvent.setup();
    const page = { document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(page as never);
    render(<Certificate {...base} />);
    await user.click(screen.getByRole("button", { name: "[ Print ]" }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(page.document.write.mock.calls[0][0]).toContain("Ada");
    expect(page.print).toHaveBeenCalledTimes(1);
    open.mockReturnValue(null);
    await user.click(screen.getByRole("button", { name: "[ Print ]" }));
    expect(screen.getByRole("status")).toHaveTextContent(/blocked/i);
  });

  it("[ Back ] returns", async () => {
    const onBack = vi.fn();
    render(<Certificate {...base} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: "[ Back ]" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
