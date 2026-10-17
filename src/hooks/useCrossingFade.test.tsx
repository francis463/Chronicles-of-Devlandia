import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ZoneId } from "../game/zones";
import { useCrossingFade } from "./useCrossingFade";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const run = (reduced = false) => renderHook(({ zone }: { zone: ZoneId }) => useCrossingFade(zone, reduced), { initialProps: { zone: "peaks" as ZoneId } });

describe("useCrossingFade", () => {
  it("is false at first and on first render, even on the island", () => {
    expect(run().result.current.fading).toBe(false);
    expect(renderHook(() => useCrossingFade("foggaten", false)).result.current.fading).toBe(false);
  });

  it.each([
    ["peaks", "foggaten"],
    ["foggaten", "peaks"],
  ] as const)("fades for 700 ms when the zone goes %s → %s", (from, to) => {
    const { result, rerender } = renderHook(({ zone }: { zone: ZoneId }) => useCrossingFade(zone, false), { initialProps: { zone: from as ZoneId } });
    rerender({ zone: to });
    expect(result.current.fading).toBe(true);
    act(() => void vi.advanceTimersByTime(699));
    expect(result.current.fading).toBe(true);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.fading).toBe(false);
  });

  it.each([
    ["peaks", "village"],
    ["village", "peaks"],
    ["forest", "peaks"],
  ] as const)("does not fade for the edge exit %s → %s", (from, to) => {
    const { result, rerender } = renderHook(({ zone }: { zone: ZoneId }) => useCrossingFade(zone, false), { initialProps: { zone: from as ZoneId } });
    rerender({ zone: to });
    expect(result.current.fading).toBe(false);
  });

  it("never fades with reduced motion", () => {
    const { result, rerender } = run(true);
    rerender({ zone: "foggaten" });
    expect(result.current.fading).toBe(false);
  });

  it("clears its timer on unmount", () => {
    const { rerender, unmount } = run();
    rerender({ zone: "foggaten" });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
