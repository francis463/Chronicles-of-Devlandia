import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Row } from "../leaderboard/leaderboard";
import { createMemoryLeaderboard } from "../leaderboard/memoryLeaderboard";
import { useHallOfFame } from "./useHallOfFame";

const rows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ rank: i + 1, name: `P${i + 1}`, badges: 11 - i }));

describe("useHallOfFame", () => {
  it("does nothing while it is not active", () => {
    const store = createMemoryLeaderboard({ rows: rows(3) });
    const { result } = renderHook(() => useHallOfFame(store, false));
    expect(result.current.phase).toBe("idle");
    expect(result.current.slots).toHaveLength(10);
    expect(result.current.slots.every((s) => s === null)).toBe(true);
  });

  it("loads ten slots in list order when it becomes active, padding with empty spots", async () => {
    const store = createMemoryLeaderboard({ rows: rows(4) });
    const { result, rerender } = renderHook(({ active }) => useHallOfFame(store, active), { initialProps: { active: false } });
    rerender({ active: true });
    expect(result.current.phase).toBe("loading");
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.slots).toHaveLength(10);
    expect(result.current.slots.slice(0, 4).map((s) => s?.name)).toEqual(["P1", "P2", "P3", "P4"]);
    expect(result.current.slots.slice(4).every((s) => s === null)).toBe(true);
  });

  it("asks for ten rows and keeps tied ranks as they come", async () => {
    const store = createMemoryLeaderboard({ rows: [{ rank: 1, name: "Alice", badges: 3 }, { rank: 1, name: "Bobby", badges: 3 }, { rank: 3, name: "Carol", badges: 1 }] });
    const asked: Array<number | undefined> = [];
    const top = store.top;
    store.top = (n) => (asked.push(n), top(n));
    const { result } = renderHook(() => useHallOfFame(store, true));
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(asked).toEqual([10]);
    expect(result.current.slots.slice(0, 3).map((s) => s?.rank)).toEqual([1, 1, 3]);
  });

  it("an empty list is ready with ten empty spots", async () => {
    const store = createMemoryLeaderboard();
    const { result } = renderHook(() => useHallOfFame(store, true));
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.slots.every((s) => s === null)).toBe(true);
  });

  it("a server that cannot be reached gives failed and ten empty spots", async () => {
    const store = createMemoryLeaderboard({ rows: rows(3) });
    store.failNext = 1;
    const { result } = renderHook(() => useHallOfFame(store, true));
    await waitFor(() => expect(result.current.phase).toBe("failed"));
    expect(result.current.slots.every((s) => s === null)).toBe(true);
  });

  it("loads again every time it becomes active", async () => {
    const store = createMemoryLeaderboard({ rows: rows(2) });
    const { result, rerender } = renderHook(({ active }) => useHallOfFame(store, active), { initialProps: { active: true } });
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    rerender({ active: false });
    expect(result.current.phase).toBe("idle");
    store.rows = rows(3);
    rerender({ active: true });
    await waitFor(() => expect(result.current.slots[2]?.name).toBe("P3"));
  });

  it("ignores a reply that arrives after you have left", async () => {
    const store = createMemoryLeaderboard({ rows: rows(3) });
    let resolve: (r: Row[]) => void = () => {};
    store.top = () => new Promise<Row[]>((ok) => (resolve = ok));
    const { result, rerender } = renderHook(({ active }) => useHallOfFame(store, active), { initialProps: { active: true } });
    expect(result.current.phase).toBe("loading");
    rerender({ active: false });
    await act(async () => resolve(rows(3)));
    expect(result.current.phase).toBe("idle");
    expect(result.current.slots.every((s) => s === null)).toBe(true);
  });

  it("drops rows that do not fit, as the leaderboard screen does", async () => {
    const store = createMemoryLeaderboard();
    store.rows = [{ rank: 1, name: 42 as never, badges: 3 }, { rank: 2, name: "Ok", badges: 1 }];
    const { result } = renderHook(() => useHallOfFame(store, true));
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.slots[0]?.name).toBe("Ok");
  });
});
