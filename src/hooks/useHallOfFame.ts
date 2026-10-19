import { useEffect, useRef, useState } from "react";
import { HALL_SLOT_COUNT } from "../game/hall";
import { parseRows, type LeaderboardStore, type Row } from "../leaderboard/leaderboard";

export type HallPhase = "idle" | "loading" | "ready" | "failed";

const EMPTY: (Row | null)[] = Array.from({ length: HALL_SLOT_COUNT }, () => null);

/**
 * The top ten for the Hall of Fame: fetched every time `active` becomes true (you walk in) and dropped when it turns
 * false (you walk out). `slots` always has ten places in rank order, with `null` for a spot nobody has earned. Only the
 * newest request may change anything, so a late reply from an earlier visit is ignored.
 */
export function useHallOfFame(store: LeaderboardStore, active: boolean): { phase: HallPhase; slots: (Row | null)[] } {
  const [state, setState] = useState<{ phase: HallPhase; slots: (Row | null)[] }>({ phase: "idle", slots: EMPTY });
  const latest = useRef(0);

  useEffect(() => {
    const mine = ++latest.current;
    if (!active) {
      setState({ phase: "idle", slots: EMPTY });
      return;
    }
    setState({ phase: "loading", slots: EMPTY });
    store.top(HALL_SLOT_COUNT).then(
      (data) => {
        if (mine !== latest.current) return;
        const rows = parseRows(data).slice(0, HALL_SLOT_COUNT);
        setState({ phase: "ready", slots: [...rows, ...EMPTY.slice(rows.length)] });
      },
      () => {
        if (mine === latest.current) setState({ phase: "failed", slots: EMPTY });
      },
    );
    return () => void latest.current++;
  }, [store, active]);

  return state;
}
