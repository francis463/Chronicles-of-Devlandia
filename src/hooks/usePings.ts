import { useCallback, useEffect, useRef, useState } from "react";
import type { ZoneId } from "../game/zones";

export type ActivePing = { id: string; name: string; color: string; zone: ZoneId; x: number; y: number };

export const PING_SHOWN_MS = 5000;

/** The pings on screen: each lasts 5 seconds, and a new one from the same player replaces their last. */
export function usePings(): { pings: ActivePing[]; add(ping: ActivePing): void } {
  const [pings, setPings] = useState<ActivePing[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const add = useCallback((ping: ActivePing) => {
    clearTimeout(timers.current.get(ping.id));
    setPings((all) => [...all.filter((p) => p.id !== ping.id), ping]);
    timers.current.set(
      ping.id,
      setTimeout(() => {
        timers.current.delete(ping.id);
        setPings((all) => all.filter((p) => p.id !== ping.id));
      }, PING_SHOWN_MS),
    );
  }, []);

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((t) => clearTimeout(t));
      active.clear();
    };
  }, []);

  return { pings, add };
}
