import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMemoryProgress } from "./progress";
import { useBadgeSaver } from "./useBadgeSaver";

const sql = { chest: "chest-sql", questionId: "q1", answer: "FROM" } as const;
const css = { chest: "chest-css", questionId: "q2", answer: "color" } as const;

describe("useBadgeSaver", () => {
  it("saves a badge once and stays healthy", async () => {
    const store = createMemoryProgress();
    const { result } = renderHook(() => useBadgeSaver(store));
    act(() => result.current.save(sql));
    await waitFor(() => expect(store.rows).toEqual([sql]));
    expect(result.current.failed).toBe(false);
  });

  it("flags a failed save, then retries it first on the next save", async () => {
    const store = createMemoryProgress();
    store.failNext = 1;
    const { result } = renderHook(() => useBadgeSaver(store));
    act(() => result.current.save(sql));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(store.rows).toEqual([]);
    act(() => result.current.save(css));
    await waitFor(() => expect(result.current.failed).toBe(false));
    expect(store.rows).toEqual([sql, css]);
  });

  it("flush retries pending saves", async () => {
    const store = createMemoryProgress();
    store.failNext = 1;
    const { result } = renderHook(() => useBadgeSaver(store));
    act(() => result.current.save(sql));
    await waitFor(() => expect(result.current.failed).toBe(true));
    act(() => result.current.flush());
    await waitFor(() => expect(result.current.failed).toBe(false));
    expect(store.rows).toEqual([sql]);
  });

  it("does nothing, and never throws, for a guest (no store)", () => {
    const { result } = renderHook(() => useBadgeSaver(null));
    expect(() => act(() => result.current.save(sql))).not.toThrow();
    expect(result.current.failed).toBe(false);
  });

  it("never saves one player's queued badge into the next player's store", async () => {
    const a = createMemoryProgress();
    const b = createMemoryProgress();
    a.failNext = 5;
    const { result, rerender } = renderHook(({ store }) => useBadgeSaver(store), { initialProps: { store: a } });
    act(() => result.current.save(sql));
    await waitFor(() => expect(result.current.failed).toBe(true));
    rerender({ store: b });
    act(() => result.current.flush());
    await waitFor(() => expect(result.current.failed).toBe(false));
    expect(b.rows).toEqual([]);
    expect(a.rows).toEqual([]);
  });
});
