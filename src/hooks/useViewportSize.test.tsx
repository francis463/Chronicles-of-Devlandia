import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useViewportSize } from "./useViewportSize";

const originalMatchMedia = window.matchMedia;
const { innerWidth, innerHeight } = window;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: innerWidth });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: innerHeight });
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 1 });
});

describe("useViewportSize", () => {
  it("reports the window's size and pixel ratio, and follows resizes", () => {
    const { result } = renderHook(() => useViewportSize());
    expect(result.current).toEqual({ width: window.innerWidth, height: window.innerHeight, dpr: 1 });
    act(() => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toEqual({ width: 390, height: 844, dpr: 1 });
  });

  it("follows a pixel-ratio change that doesn't resize the window", () => {
    const listeners = new Set<() => void>();
    window.matchMedia = ((query: string) => ({
      media: query,
      matches: false,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    })) as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useViewportSize());
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
    act(() => [...listeners].forEach((cb) => cb()));
    expect(result.current.dpr).toBe(2);
  });
});
