import { useEffect, useRef, type Dispatch } from "react";
import { placeInReach } from "../game/geometry";
import { isDowned, isModalOpen, reachPlaces } from "../game/reducer";
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

/** True when the event's target is, or sits inside, an element matching the selector. */
const inside = (target: EventTarget | null, selector: string): boolean => target instanceof Element && target.closest(selector) !== null;

/** Controls that own Enter themselves. */
const OWNS_ENTER = "button, a, input, select, textarea, summary, [role='tab'], [contenteditable]";

/**
 * `paused`: a dialog outside the game state (the leave confirmation) owns the keys, Esc included.
 * `onChatKey`: Enter (`false`) or `/` (`true`) asks for the chat input.
 */
export function useKeyboardControls(
  state: GameState,
  dispatch: Dispatch<GameAction>,
  paused = false,
  onChatKey?: (slash: boolean) => void,
): void {
  const stateRef = useRef(state);
  stateRef.current = state;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const chatKeyRef = useRef(onChatKey);
  chatKeyRef.current = onChatKey;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (pausedRef.current) return;
      const current = stateRef.current;
      const key = event.key.toLowerCase();
      // C toggles the Codex: plain presses only, never a held key's repeats.
      const codexKey = key === "c" && !event.ctrlKey && !event.metaKey && !event.altKey;
      if (codexKey && event.repeat) return;
      if (codexKey && current.codexOpen) {
        event.preventDefault();
        dispatch({ type: "toggleCodex" });
        return;
      }

      if (key === "escape") {
        if (isModalOpen(current)) {
          event.preventDefault();
          dispatch({ type: current.challenge ? "closeChallenge" : current.logicOpen ? "closeLogic" : "toggleCodex" });
        }
        return;
      }

      if (isTextField(event.target) || isModalOpen(current) || isDowned(current)) return;

      const chatKey = chatKeyRef.current;
      if (chatKey && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (key === "/" || (key === "enter" && !inside(event.target, OWNS_ENTER))) {
          event.preventDefault();
          chatKey(key === "/");
          return;
        }
      }

      // The tablist owns the arrows on its tabs.
      if (key.startsWith("arrow") && inside(event.target, "[role='tab']")) return;

      const dir = KEY_DIRECTIONS[key];
      if (dir) {
        event.preventDefault();
        dispatch({ type: "move", dir });
        return;
      }

      if (codexKey) {
        event.preventDefault();
        dispatch({ type: "toggleCodex" });
        return;
      }

      if (key === "e") {
        const poi = placeInReach(current.player, reachPlaces(current));
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
