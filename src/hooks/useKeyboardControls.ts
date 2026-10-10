import { useEffect, useRef, type Dispatch } from "react";
import { placeInReach } from "../game/geometry";
import { isDowned, isModalOpen, visiblePois } from "../game/reducer";
import type { Direction, GameAction, GameState } from "../game/types";

const KEY_DIRECTIONS: Record<string, Direction> = {
  w: "up",
  arrowup: "up",
  s: "down",
  arrowdown: "down",
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
};

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function useKeyboardControls(state: GameState, dispatch: Dispatch<GameAction>): void {
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const current = stateRef.current;
      const key = event.key.toLowerCase();

      if (key === "escape") {
        if (isModalOpen(current)) {
          event.preventDefault();
          dispatch({ type: current.challenge ? "closeChallenge" : current.logicOpen ? "closeLogic" : "toggleCodex" });
        }
        return;
      }

      if (isTextField(event.target) || isModalOpen(current) || isDowned(current)) return;

      const dir = KEY_DIRECTIONS[key];
      if (dir) {
        event.preventDefault();
        dispatch({ type: "move", dir });
        return;
      }

      if (key === "e") {
        const poi = placeInReach(current.player, visiblePois(current));
        if (poi) {
          event.preventDefault();
          dispatch({ type: "interact", poi: poi.id });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);
}
