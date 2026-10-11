import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePings, type ActivePing } from "./usePings";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const ping = (id: string, over: Partial<ActivePing> = {}): ActivePing => ({ id, name: id.toUpperCase(), color: "#fff", zone: "peaks", x: 50, y: 50, ...over });

describe("usePings", () => {
  it("starts empty", () => {
    expect(renderHook(() => usePings()).result.current.pings).toEqual([]);
  });

  it("keeps a ping for 5 seconds, then drops it", () => {
    const { result } = renderHook(() => usePings());
    act(() => result.current.add(ping("k")));
    expect(result.current.pings).toHaveLength(1);
    act(() => void vi.advanceTimersByTime(4999));
    expect(result.current.pings).toHaveLength(1);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.pings).toEqual([]);
  });

  it("a second ping from the same id replaces the first and restarts the 5 seconds", () => {
    const { result } = renderHook(() => usePings());
    act(() => result.current.add(ping("k", { x: 10 })));
    act(() => void vi.advanceTimersByTime(3000));
    act(() => result.current.add(ping("k", { x: 20 })));
    expect(result.current.pings).toHaveLength(1);
    expect(result.current.pings[0].x).toBe(20);
    act(() => void vi.advanceTimersByTime(3000));
    expect(result.current.pings).toHaveLength(1);
    act(() => void vi.advanceTimersByTime(2000));
    expect(result.current.pings).toEqual([]);
  });

  it("lets two ids coexist, each on its own timer", () => {
    const { result } = renderHook(() => usePings());
    act(() => result.current.add(ping("a")));
    act(() => void vi.advanceTimersByTime(2000));
    act(() => result.current.add(ping("b")));
    expect(result.current.pings.map((p) => p.id)).toEqual(["a", "b"]);
    act(() => void vi.advanceTimersByTime(3000));
    expect(result.current.pings.map((p) => p.id)).toEqual(["b"]);
  });

  it("clears its timers on unmount", () => {
    const { result, unmount } = renderHook(() => usePings());
    act(() => result.current.add(ping("a")));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
