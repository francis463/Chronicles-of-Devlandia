import { useReducer } from "react";
import { gameReducer, initialState, isDowned } from "../../game/reducer";
import type { GameState } from "../../game/types";
import { useGameTimers } from "../../hooks/useGameTimers";
import { Panel } from "../../ui/Panel";
import { BottomHud } from "./BottomHud";
import { EventLog } from "./EventLog";
import { MapViewport } from "./MapViewport";
import { MiniMap } from "./MiniMap";
import { TopHud } from "./TopHud";

export function Overworld({ onMenu, initial }: { onMenu: () => void; initial?: Partial<GameState> }) {
  const [state, dispatch] = useReducer(gameReducer, { ...initialState, ...initial });
  useGameTimers(state, dispatch);

  return (
    <Panel className="mx-auto w-full max-w-5xl overflow-hidden">
      <TopHud hp={state.hp} stamina={state.stamina} minutes={state.minutes} onMenu={onMenu} />
      <div className="flex flex-col md:flex-row">
        <MiniMap player={state.player} />
        <MapViewport
          player={state.player}
          drone={state.drone}
          minutes={state.minutes}
          inspected={state.inspected}
          hasLoot={state.hasLoot}
          gateUnlocked={state.gateUnlocked}
          downed={isDowned(state)}
          onInteract={(poi) => dispatch({ type: "interact", poi })}
          onCloseInspection={() => dispatch({ type: "closeInspection" })}
          onRespawn={() => dispatch({ type: "respawn" })}
        />
        <EventLog logs={state.logs} />
      </div>
      <BottomHud hasLoot={state.hasLoot} questComplete={state.questComplete} />
    </Panel>
  );
}
