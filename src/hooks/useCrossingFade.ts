import { useEffect, useRef, useState } from "react";
import type { ZoneId } from "../game/zones";

const FADE_MS = 700;
const isCrossing = (a: ZoneId, b: ZoneId) => (a === "peaks" && b === "foggaten") || (a === "foggaten" && b === "peaks");

/** True for 700 ms after the zone changes between the Peaks and Foggaten Island (a boat crossing, not an edge exit). */
export function useCrossingFade(zone: ZoneId, reduced: boolean): { fading: boolean } {
  const [fading, setFading] = useState(false);
  const last = useRef(zone);
  useEffect(() => {
    const from = last.current;
    last.current = zone;
    if (reduced || !isCrossing(from, zone)) {
      setFading(false);
      return;
    }
    setFading(true);
    const id = setTimeout(() => setFading(false), FADE_MS);
    return () => clearTimeout(id);
  }, [zone, reduced]);
  return { fading: fading && !reduced };
}
