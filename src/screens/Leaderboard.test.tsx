import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMemoryLeaderboard } from "../leaderboard/memoryLeaderboard";
import type { Me, Row } from "../leaderboard/leaderboard";
import { Leaderboard } from "./Leaderboard";

const ROWS: Row[] = [
  { rank: 1, name: "Alice", badges: 3 },
  { rank: 1, name: "Bobby", badges: 3 },
  { rank: 3, name: "Carol", badges: 1 },
];

const KEY = "0b9e8f0c-7a55-4a3c-9d0e-5a1f2c3d4e5f";
const shrink = vi.fn(async () => new Blob(["jpg"], { type: "image/jpeg" }));

const setup = (over: { rows?: Row[]; me?: Me | null; signedIn?: boolean; myName?: string | null } = {}) => {
  const store = createMemoryLeaderboard({ rows: over.rows ?? ROWS, me: over.me ?? null });
  const onBack = vi.fn();
  render(<Leaderboard store={store} signedIn={over.signedIn ?? false} myName={over.myName ?? null} onBack={onBack} shrink={shrink} />);
  return { store, onBack, user: userEvent.setup({ applyAccept: false }) };
};

describe("Leaderboard", () => {
  it("shows a loading line, then the ranked list", async () => {
    setup();
    expect(screen.getByText("Loading the leaderboard…")).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: "Top players" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("1");
    expect(rows[0]).toHaveTextContent("Alice");
    expect(rows[0]).toHaveTextContent("3/11 badges");
    expect(rows[2]).toHaveTextContent("3");
    expect(rows[2]).toHaveTextContent("1/11 badges");
    expect(screen.queryByText("Loading the leaderboard…")).not.toBeInTheDocument();
  });

  it("masks a name the chat filter would mask", async () => {
    setup({ rows: [{ rank: 1, name: "Bobo", badges: 2 }] });
    const list = await screen.findByRole("list", { name: "Top players" });
    expect(list).toHaveTextContent("***");
    expect(list).not.toHaveTextContent("Bobo");
  });

  it("says so when nobody has a badge yet, and still offers Refresh and Back", async () => {
    setup({ rows: [] });
    expect(await screen.findByText("No badges yet. Be the first!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "[ Refresh ]" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "[ Back ]" })).toBeInTheDocument();
  });

  it("an unreachable server shows a message; Refresh retries and Back still works", async () => {
    const { store, user, onBack } = setup();
    store.failNext = 1;
    // The first load is already in flight; refresh until the failure has been used.
    await user.click(await screen.findByRole("button", { name: "[ Refresh ]" }));
    expect(await screen.findByText("Can't reach the leaderboard.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "[ Refresh ]" }));
    expect(await screen.findByRole("list", { name: "Top players" })).toBeInTheDocument();
    store.failNext = 1;
    await user.click(screen.getByRole("button", { name: "[ Refresh ]" }));
    await screen.findByText("Can't reach the leaderboard.");
    await user.click(screen.getByRole("button", { name: "[ Back ]" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("Back works while still loading", async () => {
    const store = createMemoryLeaderboard();
    store.top = () => new Promise(() => undefined);
    const onBack = vi.fn();
    render(<Leaderboard store={store} signedIn={false} myName={null} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: "[ Back ]" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("a signed-in player's own row is marked (you)", async () => {
    setup({ signedIn: true, myName: "bobby", me: { rank: 1, badges: 3, hidden: false } });
    const rows = within(await screen.findByRole("list", { name: "Top players" })).getAllByRole("listitem");
    expect(rows[1]).toHaveTextContent("Bobby (you)");
    expect(rows[0]).not.toHaveTextContent("(you)");
    expect(screen.queryByText(/^Your rank:/)).not.toBeInTheDocument();
  });

  it("outside the list you see your rank; with no badges you are invited to earn one", async () => {
    const first = setup({ signedIn: true, myName: "Zed", me: { rank: 37, badges: 4, hidden: false } });
    expect(await screen.findByText("Your rank: 37 · 4/11 badges")).toBeInTheDocument();
    first.store.meState = { rank: null, badges: 0, hidden: false };
    await first.user.click(screen.getByRole("button", { name: "[ Refresh ]" }));
    expect(await screen.findByText("Earn a badge to join the leaderboard.")).toBeInTheDocument();
  });

  it("a guest sees no switch and no rank line, and the server is never asked who they are", async () => {
    const { store } = setup({ signedIn: false, me: { rank: 2, badges: 3, hidden: false } });
    await screen.findByRole("list", { name: "Top players" });
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByText(/Your rank/)).not.toBeInTheDocument();
    expect(store.calls).toEqual([]);
  });

  it("the switch hides you, reloads, and says you are hidden; it snaps back if saving fails", async () => {
    const { store, user } = setup({ signedIn: true, myName: "Zed", me: { rank: 5, badges: 2, hidden: false } });
    const toggle = await screen.findByRole("switch", { name: "Hide me from the leaderboard" });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(store.calls).toEqual(["setHidden:true"]);
    expect(await screen.findByText("You're hidden. Your rank: 5 · 2/11 badges.")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeChecked();

    store.failNext = 1;
    await user.click(screen.getByRole("switch"));
    expect(await screen.findByText("Couldn't save that. Try again.")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("odd data that slips past the types does not crash the screen", async () => {
    const store = createMemoryLeaderboard();
    store.rows = [{ rank: 1, name: 42 as never, badges: 3 }, { rank: 2, name: "Ok", badges: 1 }];
    render(<Leaderboard store={store} signedIn={false} myName={null} onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByRole("list", { name: "Top players" })).toBeInTheDocument());
    expect(screen.getByRole("list", { name: "Top players" })).toHaveTextContent("Ok");
  });

  describe("photos", () => {
    it("a row with a photo shows it; a row without shows the first letter", async () => {
      setup({ rows: [{ rank: 1, name: "Alice", badges: 3, avatar: KEY }, { rank: 2, name: "Bobby", badges: 2 }] });
      const rows = within(await screen.findByRole("list", { name: "Top players" })).getAllByRole("listitem");
      const img = within(rows[0]).getByRole("img", { name: "Alice's photo" });
      expect(img).toHaveAttribute("src", expect.stringContaining(`/avatars/${KEY}.jpg`));
      expect(within(rows[1]).queryByRole("img")).not.toBeInTheDocument();
      expect(rows[1]).toHaveTextContent("B");
    });

    it("a photo that fails to load falls back to the first letter", async () => {
      setup({ rows: [{ rank: 1, name: "Alice", badges: 3, avatar: KEY }] });
      fireEvent.error(await screen.findByRole("img", { name: "Alice's photo" }));
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByRole("listitem")).toHaveTextContent("A");
    });

    it("a guest sees no photo buttons", async () => {
      setup({ signedIn: false });
      await screen.findByRole("list", { name: "Top players" });
      expect(screen.queryByRole("button", { name: "[ Change photo ]" })).not.toBeInTheDocument();
    });

    it("choosing a file shrinks it, saves it and reloads; Remove appears once you have one", async () => {
      const { store, user } = setup({ signedIn: true, myName: "Zed", me: { rank: 5, badges: 2, hidden: false } });
      expect(await screen.findByRole("button", { name: "[ Change photo ]" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "[ Remove photo ]" })).not.toBeInTheDocument();
      await user.upload(screen.getByLabelText("Choose a photo"), new File(["x"], "me.png", { type: "image/png" }));
      expect(shrink).toHaveBeenCalled();
      expect(await screen.findByRole("button", { name: "[ Remove photo ]" })).toBeInTheDocument();
      expect(store.calls).toEqual(["setAvatar:3"]);
    });

    it("Remove photo removes it", async () => {
      const { store, user } = setup({ signedIn: true, myName: "Zed", me: { rank: 5, badges: 2, hidden: false, avatar: KEY } });
      await user.click(await screen.findByRole("button", { name: "[ Remove photo ]" }));
      await waitFor(() => expect(screen.queryByRole("button", { name: "[ Remove photo ]" })).not.toBeInTheDocument());
      expect(store.calls).toEqual(["removeAvatar"]);
    });

    it("says so when a file is not a picture or will not save, and keeps what you had", async () => {
      const { store, user } = setup({ signedIn: true, myName: "Zed", me: { rank: 5, badges: 2, hidden: false } });
      await screen.findByRole("button", { name: "[ Change photo ]" });
      await user.upload(screen.getByLabelText("Choose a photo"), new File(["x"], "n.txt", { type: "text/plain" }));
      expect(await screen.findByText("Pick a picture file (JPG, PNG or WebP).")).toBeInTheDocument();
      expect(store.calls).toEqual([]);
      store.failNext = 1;
      await user.upload(screen.getByLabelText("Choose a photo"), new File(["x"], "me.png", { type: "image/png" }));
      expect(await screen.findByText("Couldn't save your photo. Try again.")).toBeInTheDocument();
    });
  });
});
