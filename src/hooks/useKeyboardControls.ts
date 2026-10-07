import { useEffect, useRef, type Dispatch } from "react";
import { poiInRange } from "../game/geometry";
import { isDowned, revealedPois } from "../game/reducer";
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
        if (current.terminalOpen || current.cipherOpen) {
          event.preventDefault();
          dispatch({ type: current.terminalOpen ? "closeTerminal" : "closeCipher" });
        }
        return;
      }

      if (isTextField(event.target) || current.terminalOpen || current.cipherOpen || isDowned(current)) return;

      const dir = KEY_DIRECTIONS[key];
      if (dir) {
        event.preventDefault();
        dispatch({ type: "move", dir });
        return;
      }

      if (key === "e") {
        const poi = poiInRange(current.player, revealedPois(current));
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
