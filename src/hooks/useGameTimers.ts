import { useEffect, useRef, type Dispatch } from "react";
import { DRONE_DELAY_MS, RIVER_DAMAGE_MS, TICK_MS } from "../game/constants";
import { isInRiver } from "../game/geometry";
import { isDowned, isModalOpen } from "../game/reducer";
import type { GameAction, GameState } from "../game/types";

export function useGameTimers(state: GameState, dispatch: Dispatch<GameAction>): void {
  const paused = isModalOpen(state) || isDowned(state);
  const draining = !paused && !state.towerPowered && isInRiver(state.player);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => window.clearInterval(id);
  }, [paused, dispatch]);

  useEffect(() => {
    if (!draining) return;
    const id = window.setInterval(() => dispatch({ type: "riverDamage" }), RIVER_DAMAGE_MS);
    return () => window.clearInterval(id);
  }, [draining, dispatch]);

  // Throttled, not debounced: while the player keeps moving, the drone still
  // follows every DRONE_DELAY_MS (the reducer always chases the latest position).
  const follow = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (follow.current !== undefined) return;
    follow.current = window.setTimeout(() => {
      follow.current = undefined;
      dispatch({ type: "droneFollow" });
    }, DRONE_DELAY_MS);
  }, [state.player, dispatch]);

  useEffect(
    () => () => {
      window.clearTimeout(follow.current);
      follow.current = undefined;
    },
    [],
  );
}
