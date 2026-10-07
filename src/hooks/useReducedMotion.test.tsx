import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useReducedMotion } from "./useReducedMotion";

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

/** A matchMedia whose "(prefers-reduced-motion: reduce)" answer the test can flip. */
function fakeMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return matches;
    },
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  })) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

describe("useReducedMotion", () => {
  it("is false without matchMedia", () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });

  it("reads the current preference", () => {
    fakeMedia(true);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });

  it("useReducedMotion follows the media query's change event", () => {
    const media = fakeMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => media.set(true));
    expect(result.current).toBe(true);
    act(() => media.set(false));
    expect(result.current).toBe(false);
  });
});
