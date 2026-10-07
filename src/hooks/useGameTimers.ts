import { useEffect, type Dispatch } from "react";
import { DRONE_DELAY_MS, RIVER_DAMAGE_MS, TICK_MS } from "../game/constants";
import { isInRiver } from "../game/geometry";
import { isDowned } from "../game/reducer";
import type { GameAction, GameState } from "../game/types";

export function useGameTimers(state: GameState, dispatch: Dispatch<GameAction>): void {
  const paused = state.terminalOpen || isDowned(state);
  const draining = !paused && !state.gateUnlocked && isInRiver(state.player);

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

  useEffect(() => {
    const id = window.setTimeout(() => dispatch({ type: "droneFollow" }), DRONE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [state.player, dispatch]);
}
