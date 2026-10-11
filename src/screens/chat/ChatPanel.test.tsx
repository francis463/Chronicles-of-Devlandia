import { createRef, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommandContext, CommandEffect } from "../../chat/commands";
import type { ChatFeed, ChatLine, PostResult } from "../../hooks/useChat";
import { ChatPanel } from "./ChatPanel";

const CTX: CommandContext = { where: "game", minutes: 0, badges: [], me: { id: "a", name: "Ana", zone: "peaks", x: 1, y: 2 }, roster: [], known: {}, muted: [] };
let seq = 0;
const line = (kind: ChatLine["kind"], text: string, over: Partial<ChatLine> = {}): ChatLine => ({
  seq: ++seq,
  kind,
  senderId: kind === "note" ? null : "x",
  key: null,
  name: kind === "note" ? "" : "Kai",
  color: "rgb(34, 197, 94)",
  text,
  ...over,
});

type Props = {
  where?: "solo" | "lobby" | "game";
  lines?: ChatLine[];
  post?: (text: string, c: CommandContext) => PostResult;
  onEffect?: (e: CommandEffect) => void;
  active?: boolean;
  initialDraft?: string;
  inputRef?: React.Ref<HTMLInputElement>;
};
function Harness({ where = "game", lines = [], post = () => ({ status: "sent", effect: null }), onEffect, active, initialDraft = "", inputRef }: Props) {
  const [draft, setDraft] = useState(initialDraft);
  const feed: ChatFeed = { lines, draft, setDraft, muted: [], mute: () => {}, unmute: () => {}, post };
  return <ChatPanel feed={feed} where={where} getContext={() => CTX} onEffect={onEffect} active={active} inputRef={inputRef} />;
}
const input = () => screen.getByRole("textbox", { name: "Message" }) as HTMLInputElement;
const type = (value: string) => fireEvent.change(input(), { target: { value } });

afterEach(() => void delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight);

describe("lines", () => {
  it("is a plain list named Team chat, not a live region", () => {
    render(<Harness />);
    const list = screen.getByRole("list", { name: "Team chat" });
    expect(list).not.toHaveAttribute("aria-live");
    expect(screen.queryByRole("log")).toBeNull();
  });

  it("shows a teammate line as name, colon and text in a bdi", () => {
    render(<Harness lines={[line("teammate", "meet at the gate")]} />);
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("Kai: meet at the gate");
    expect(within(item).getByText("Kai")).toHaveStyle({ color: "rgb(34, 197, 94)" });
    expect(screen.getByText("meet at the gate").tagName).toBe("BDI");
    expect(item.className).toContain("overflow-hidden");
  });

  it("shows your own line the same way", () => {
    render(<Harness lines={[line("mine", "hi", { name: "Ana" })]} />);
    expect(screen.getByRole("listitem")).toHaveTextContent("Ana: hi");
  });

  it("renders markup as text", () => {
    const { container } = render(<Harness lines={[line("teammate", "<b>hi</b>")]} />);
    expect(screen.getByText("<b>hi</b>")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
  });

  it("never rewrites a teammate's text but speaks badge names in notes and pings", () => {
    render(
      <Harness lines={[line("teammate", "the C# Chest"), line("note", "Ping sent: the C# Chest."), line("ping", "Kai pinged the C# Chest.")]} />,
    );
    const [mate, note, ping] = screen.getAllByRole("listitem");
    expect(mate.querySelector(".sr-only")).toBeNull();
    expect(note.querySelector(".sr-only")).toHaveTextContent("C sharp");
    expect(ping.querySelector(".sr-only")).toHaveTextContent("C sharp");
  });

  it("starts a note with an aria-hidden glyph", () => {
    render(<Harness lines={[line("note", "Dusk, 19:34.")]} />);
    const item = screen.getByRole("listitem");
    expect(item.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(item.firstElementChild).toHaveTextContent(">");
  });
});

describe("the input", () => {
  it("is a labelled text box with the right attributes", () => {
    render(<Harness />);
    expect(input()).toHaveAttribute("type", "text");
    expect(input()).toHaveAttribute("autocomplete", "off");
    expect(input()).toHaveAttribute("enterkeyhint", "send");
    expect(input()).toHaveAttribute("maxlength", "120");
    expect(input().className).toContain("pointer-coarse:text-base");
  });

  it("has a placeholder per place", () => {
    const { rerender } = render(<Harness where="game" />);
    expect(input()).toHaveAttribute("placeholder", "Chat, or /help");
    rerender(<Harness where="lobby" />);
    expect(input()).toHaveAttribute("placeholder", "Chat, or /help");
    rerender(<Harness where="solo" />);
    expect(input()).toHaveAttribute("placeholder", "Command, or /help");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Harness inputRef={ref} />);
    expect(ref.current).toBe(input());
  });

  it("shows a counter from 101 characters, as the description", () => {
    render(<Harness />);
    type("a".repeat(100));
    expect(screen.queryByText("100/120")).toBeNull();
    expect(input()).not.toHaveAccessibleDescription();
    type("a".repeat(101));
    expect(screen.getByText("101/120")).toBeInTheDocument();
    expect(input()).toHaveAccessibleDescription("101/120");
  });

  it("says how many characters are left at 110 and at the limit, and nothing else", () => {
    render(<Harness />);
    const status = screen.getByRole("status", { name: "Message length" });
    type("a".repeat(109));
    expect(status).toHaveTextContent("");
    type("a".repeat(110));
    expect(status).toHaveTextContent("10 characters left");
    type("a".repeat(120));
    expect(status).toHaveTextContent("Limit reached: 120 characters");
  });

  it("puts the touch sizes on the controls", () => {
    render(<Harness />);
    for (const el of [input(), screen.getByRole("button", { name: "[ SEND ]" }), screen.getByRole("button", { name: "[ Quick replies ]" }), screen.getByRole("button", { name: "On my way" })]) {
      expect(el.className).toContain("pointer-coarse:min-h-11");
    }
  });
});

describe("quick replies", () => {
  it("holds the game set in the game", () => {
    render(<Harness where="game" />);
    const group = screen.getByRole("group", { name: "Quick replies" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["On my way", "Need help", "Meet at the gate", "Found it!", "Wait for me", "Good job!"]);
  });

  it("holds the lobby set in the lobby, always shown", () => {
    render(<Harness where="lobby" />);
    const group = screen.getByRole("group", { name: "Quick replies" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["Ready!", "Wait for me", "Hi!"]);
    expect(group.className).not.toContain("md:hidden");
    expect(screen.queryByRole("button", { name: "[ Quick replies ]" })).toBeNull();
  });

  it("has none in solo", () => {
    render(<Harness where="solo" />);
    expect(screen.queryByRole("group", { name: "Quick replies" })).toBeNull();
    expect(screen.queryByRole("button", { name: "[ Quick replies ]" })).toBeNull();
  });

  it("opens behind a toggle at md and stays open after a tap", async () => {
    const user = userEvent.setup();
    render(<Harness where="game" />);
    const toggle = screen.getByRole("button", { name: "[ Quick replies ]" });
    const group = screen.getByRole("group", { name: "Quick replies" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle.className).toContain("hidden md:inline-flex");
    expect(group.className).toContain("md:hidden");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(group.className).not.toContain("md:hidden");
    await user.click(screen.getByRole("button", { name: "Need help" }));
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(group.className).not.toContain("md:hidden");
  });

  it("posts the phrase as a message", async () => {
    const post = vi.fn(() => ({ status: "sent", effect: null }) as PostResult);
    render(<Harness where="game" post={post} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Need help" }));
    expect(post).toHaveBeenCalledWith("Need help", CTX);
  });
});

describe("layout", () => {
  it("bounds the lobby list at every width", () => {
    render(<Harness where="lobby" />);
    const cls = screen.getByRole("list", { name: "Team chat" }).className;
    expect(cls).toContain("max-h-36");
    expect(cls).toContain("md:max-h-64");
    expect(cls).not.toContain("md:max-h-none");
  });

  it("lets the game list fill the panel at md", () => {
    render(<Harness where="game" />);
    const cls = screen.getByRole("list", { name: "Team chat" }).className;
    for (const c of ["flex-1", "min-h-0", "overflow-y-auto", "max-h-36", "md:max-h-none"]) expect(cls).toContain(c);
  });
});

describe("layout in a solo game", () => {
  it("fills the panel like the game does, without quick replies", () => {
    render(<Harness where="solo" />);
    const cls = screen.getByRole("list", { name: "Team chat" }).className;
    for (const c of ["flex-1", "min-h-0", "md:max-h-none"]) expect(cls).toContain(c);
    expect(screen.queryByRole("group", { name: "Quick replies" })).toBeNull();
  });
});

describe("focus", () => {
  it("a quick-reply click posts, keeps focus in the input and leaves the draft", async () => {
    const user = userEvent.setup();
    const post = vi.fn(() => ({ status: "sent", effect: null }) as PostResult);
    render(<Harness where="lobby" post={post} />);
    await user.type(input(), "abc");
    await user.click(screen.getByRole("button", { name: "Hi!" }));
    expect(post).toHaveBeenCalledWith("Hi!", CTX);
    expect(input()).toHaveFocus();
    expect(input()).toHaveValue("abc");
  });

  it("with nothing focused a quick-reply click leaves the page active", async () => {
    render(<Harness where="lobby" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Hi!" }));
    expect(document.body).toHaveFocus();
  });

  it("keyboard activation keeps focus on the quick reply", async () => {
    const user = userEvent.setup();
    render(<Harness where="lobby" />);
    const hi = screen.getByRole("button", { name: "Hi!" });
    hi.focus();
    await user.keyboard("{Enter}");
    expect(hi).toHaveFocus();
  });

  it("keeps focus in the input after Enter and after [ SEND ]", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "hello{Enter}");
    expect(input()).toHaveFocus();
    await user.type(input(), "again");
    await user.click(screen.getByRole("button", { name: "[ SEND ]" }));
    expect(input()).toHaveFocus();
  });

  it("[ SEND ] ignores the mousedown focus change", () => {
    render(<Harness />);
    expect(fireEvent.mouseDown(screen.getByRole("button", { name: "[ SEND ]" }))).toBe(false);
    expect(fireEvent.mouseDown(screen.getByRole("button", { name: "On my way" }))).toBe(false);
  });

  it("Esc blurs the input and keeps the draft", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "abc{Escape}");
    expect(input()).not.toHaveFocus();
    expect(input()).toHaveValue("abc");
  });
});

describe("sending", () => {
  it("posts the draft, clears it and hands the effect to the game", async () => {
    const effect: CommandEffect = { kind: "weather", snow: true };
    const post = vi.fn(() => ({ status: "command", effect }) as PostResult);
    const onEffect = vi.fn();
    const user = userEvent.setup();
    render(<Harness post={post} onEffect={onEffect} />);
    await user.type(input(), "/weather snow{Enter}");
    expect(post).toHaveBeenCalledWith("/weather snow", CTX);
    expect(onEffect).toHaveBeenCalledWith(effect);
    expect(input()).toHaveValue("");
  });

  it("posts nothing for a blank box", async () => {
    const post = vi.fn(() => ({ status: "sent", effect: null }) as PostResult);
    const user = userEvent.setup();
    render(<Harness post={post} />);
    await user.click(screen.getByRole("button", { name: "[ SEND ]" }));
    await user.type(input(), "   {Enter}");
    expect(post).not.toHaveBeenCalled();
  });

  it("keeps the draft when the send was refused", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness post={() => ({ status: "refused", effect: null })} />);
    await user.type(input(), "hello{Enter}");
    expect(input()).toHaveValue("hello");
    rerender(<Harness post={() => ({ status: "sent", effect: null })} />);
    await user.keyboard("{Enter}");
    expect(input()).toHaveValue("");
  });
});

describe("scrolling", () => {
  const height = (n: number) => Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => n });
  const list = () => screen.getByRole("list", { name: "Team chat" });

  it("follows new lines while you are at the bottom and not once you scroll up", () => {
    height(500);
    const a = line("teammate", "a");
    const b = line("teammate", "b");
    const c = line("teammate", "c");
    const { rerender } = render(<Harness lines={[a]} />);
    expect(list().scrollTop).toBe(500);
    list().scrollTop = 0;
    rerender(<Harness lines={[a, b]} />);
    expect(list().scrollTop).toBe(0);
    list().scrollTop = 500;
    height(600);
    rerender(<Harness lines={[a, b, c]} />);
    expect(list().scrollTop).toBe(600);
  });

  it("scrolls to the bottom when its tab becomes active", () => {
    height(500);
    const a = line("teammate", "a");
    const { rerender } = render(<Harness lines={[a]} active={false} />);
    list().scrollTop = 40;
    rerender(<Harness lines={[a]} active />);
    expect(list().scrollTop).toBe(500);
  });
});
