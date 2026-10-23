import { useSyncExternalStore } from "react";

/** Whether a CSS media query matches right now; follows changes (turning the phone) without a reload. False where matchMedia does not exist. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
      list?.addEventListener("change", onChange);
      return () => list?.removeEventListener("change", onChange);
    },
    () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false),
  );
}

/** A phone held sideways: wide, but with so little height that the usual stacked layout would push the map off screen. */
export const LANDSCAPE_PHONE = "(orientation: landscape) and (max-height: 500px)";
