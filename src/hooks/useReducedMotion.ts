import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const media = () => (typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null);

function subscribe(onChange: () => void) {
  const query = media();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

/** Whether the device asks for reduced motion; follows changes without a reload. */
export const useReducedMotion = (): boolean => useSyncExternalStore(subscribe, () => media()?.matches ?? false);
