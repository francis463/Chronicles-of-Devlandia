import { useLayoutEffect, useState } from "react";
import type { ViewSize } from "../render/world";

const read = (): ViewSize => ({ width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 });

/** The window's CSS size and device pixel ratio; follows resizes and pixel-ratio changes (zoom, another screen). */
export function useViewportSize(): ViewSize {
  const [size, setSize] = useState(read);
  useLayoutEffect(() => {
    const update = () =>
      setSize((prev) => {
        const next = read();
        return next.width === prev.width && next.height === prev.height && next.dpr === prev.dpr ? prev : next;
      });
    window.addEventListener("resize", update);
    // A pixel-ratio change alone fires no resize: watch the current resolution and re-arm.
    let query: MediaQueryList | null = null;
    const onDpr = () => {
      update();
      arm();
    };
    const arm = () => {
      query?.removeEventListener("change", onDpr);
      query = typeof window.matchMedia === "function" ? window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`) : null;
      query?.addEventListener("change", onDpr);
    };
    arm();
    update();
    return () => {
      window.removeEventListener("resize", update);
      query?.removeEventListener("change", onDpr);
    };
  }, []);
  return size;
}
