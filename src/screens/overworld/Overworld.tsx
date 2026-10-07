import { useReducer } from "react";
import { poiInRange } from "../../game/geometry";
import { gameReducer, initialState, isDowned } from "../../game/reducer";
import type { GameState } from "../../game/types";
import { useGameTimers } from "../../hooks/useGameTimers";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { Panel } from "../../ui/Panel";
import { TerminalModal } from "../TerminalModal";
import { BottomHud } from "./BottomHud";
import { EventLog } from "./EventLog";
import { MapViewport } from "./MapViewport";
import { MiniMap } from "./MiniMap";
import { TopHud } from "./TopHud";
import { TouchControls } from "./TouchControls";

export function Overworld({ onMenu, initial }: { onMenu: () => void; initial?: Partial<GameState> }) {
  const [state, dispatch] = useReducer(gameReducer, { ...initialState, ...initial });
  useGameTimers(state, dispatch);
  useKeyboardControls(state, dispatch);
  const downed = isDowned(state);

  return (
    <Panel className="mx-auto w-full max-w-5xl overflow-hidden">
      <TopHud hp={state.hp} stamina={state.stamina} minutes={state.minutes} onMenu={onMenu} />
      <div className="flex flex-col md:flex-row">
        <MiniMap player={state.player} />
        <div className="flex flex-1 flex-col">
          <MapViewport
            player={state.player}
            drone={state.drone}
            minutes={state.minutes}
            inspected={state.inspected}
            hasLoot={state.hasLoot}
            gateUnlocked={state.gateUnlocked}
            downed={downed}
            onInteract={(poi) => dispatch({ type: "interact", poi })}
            onCloseInspection={() => dispatch({ type: "closeInspection" })}
            onRespawn={() => dispatch({ type: "respawn" })}
          />
          <TouchControls
            disabled={downed || state.terminalOpen}
            inRange={downed ? null : poiInRange(state.player)}
            onMove={(dir) => dispatch({ type: "move", dir })}
            onInteract={(poi) => dispatch({ type: "interact", poi })}
          />
        </div>
        <EventLog logs={state.logs} logCount={state.logCount} />
      </div>
      <BottomHud hasLoot={state.hasLoot} questComplete={state.questComplete} />
      {state.terminalOpen && (
        <TerminalModal
          error={state.puzzleError}
          hintRevealed={state.hintRevealed}
          onSubmit={(value) => dispatch({ type: "submitCode", value })}
          onClose={() => dispatch({ type: "closeTerminal" })}
          onRevealHint={() => dispatch({ type: "revealHint" })}
        />
      )}
    </Panel>
  );
}
