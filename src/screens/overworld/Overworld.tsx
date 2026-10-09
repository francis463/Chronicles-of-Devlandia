import { useEffect, useReducer } from "react";
import { placeInReach } from "../../game/geometry";
import { gameReducer, initialState, isDowned, isModalOpen, visiblePois } from "../../game/reducer";
import type { GameState } from "../../game/types";
import type { TeamSession } from "../../hooks/useTeamSession";
import { TICK_MS } from "../../game/constants";
import { flagsOf, teamMinutes } from "../../game/team";
import { ZONES } from "../../game/zones";
import { useNow } from "../../hooks/useNow";
import { useGameTimers } from "../../hooks/useGameTimers";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { Panel } from "../../ui/Panel";
import { CipherModal } from "../CipherModal";
import { LogicModal } from "../LogicModal";
import { TerminalModal } from "../TerminalModal";
import { BottomHud } from "./BottomHud";
import { EventLog } from "./EventLog";
import { MapViewport } from "./MapViewport";
import { MiniMap } from "./MiniMap";
import { TopHud } from "./TopHud";
import { TouchControls } from "./TouchControls";

export function Overworld({
  onMenu,
  initial,
  team,
}: {
  onMenu: () => void;
  initial?: Partial<GameState>;
  /** Team mode: shared progress, teammates on the map and the team clock. */
  team?: TeamSession;
}) {
  const [state, dispatch] = useReducer(gameReducer, { ...initialState, ...initial });
  useGameTimers(state, dispatch);
  useKeyboardControls(state, dispatch);
  const downed = isDowned(state);

  // ── Team mode ──
  const publishPosition = team?.publishPosition;
  const publishFlags = team?.publishFlags;
  const onProgress = team?.onProgress;
  const onRoster = team?.onRoster;
  const onZoneChange = team?.onZoneChange;
  const flags = flagsOf(state);
  const flagKey = JSON.stringify(flags);
  useEffect(() => publishPosition?.(state.player.x, state.player.y, state.zone), [publishPosition, state.player, state.zone]);
  useEffect(() => publishFlags?.(JSON.parse(flagKey)), [publishFlags, flagKey]);
  useEffect(() => onProgress?.((teamFlags, by) => dispatch({ type: "teamSync", flags: teamFlags, by })), [onProgress]);
  useEffect(
    () =>
      onRoster?.((joined, left) => {
        joined.forEach((name) => dispatch({ type: "note", text: `${name} joined the team.` }));
        left.forEach((name) => dispatch({ type: "note", text: `${name} left the team.` }));
      }),
    [onRoster],
  );
  useEffect(
    () => onZoneChange?.((name, zone) => dispatch({ type: "note", text: `${name} went to ${ZONES[zone].name}.` })),
    [onZoneChange],
  );
  const now = useNow(TICK_MS, team?.startedAt != null);
  const minutes = team?.startedAt != null ? teamMinutes(team.startedAt, now) : state.minutes;
  const teamLabel = team?.room ? `ROOM ${team.room} · ${team.players.length} online` : undefined;

  const inRange = downed ? null : placeInReach(state.player, visiblePois(state));

  return (
    <Panel className="mx-auto w-full max-w-5xl overflow-hidden">
      <TopHud
        hp={state.hp}
        stamina={state.stamina}
        minutes={minutes}
        onMenu={onMenu}
        teamLabel={teamLabel}
        reconnecting={team?.status === "reconnecting"}
      />
      <div className="flex flex-col md:flex-row">
        <MiniMap
          player={state.player}
          artifactFound={state.artifactFound}
          teammates={team?.teammates}
          playerColor={team?.me?.color}
        />
        <div className="flex flex-1 flex-col">
          <MapViewport
            player={state.player}
            drone={state.drone}
            minutes={minutes}
            inspected={state.inspected}
            hasLoot={state.hasLoot}
            gateUnlocked={state.gateUnlocked}
            clueDecoded={state.clueDecoded}
            artifactFound={state.artifactFound}
            towerPowered={state.towerPowered}
            teammates={team?.teammates.filter((t) => t.zone === state.zone)}
            playerColor={team?.me?.color}
            inRange={inRange}
            downed={downed}
            onInteract={(poi) => dispatch({ type: "interact", poi })}
            onCloseInspection={() => dispatch({ type: "closeInspection" })}
            onRespawn={() => dispatch({ type: "respawn" })}
          />
          <TouchControls
            disabled={downed || isModalOpen(state)}
            inRange={inRange}
            onMove={(dir) => dispatch({ type: "move", dir })}
            onInteract={(poi) => dispatch({ type: "interact", poi })}
          />
        </div>
        <EventLog logs={state.logs} logCount={state.logCount} />
      </div>
      <BottomHud
        hasLoot={state.hasLoot}
        questComplete={state.questComplete}
        clueDecoded={state.clueDecoded}
        artifactFound={state.artifactFound}
        towerPowered={state.towerPowered}
        onDecodeScroll={() => dispatch({ type: "openCipher" })}
      />
      {state.terminalOpen && (
        <TerminalModal
          error={state.puzzleError}
          hintRevealed={state.hintRevealed}
          onSubmit={(value) => dispatch({ type: "submitCode", value })}
          onClose={() => dispatch({ type: "closeTerminal" })}
          onRevealHint={() => dispatch({ type: "revealHint" })}
        />
      )}
      {state.cipherOpen && (
        <CipherModal
          error={state.cipherError}
          hintRevealed={state.cipherHintRevealed}
          onSubmit={(value) => dispatch({ type: "submitCipher", value })}
          onClose={() => dispatch({ type: "closeCipher" })}
          onRevealHint={() => dispatch({ type: "revealCipherHint" })}
        />
      )}
      {state.logicOpen && (
        <LogicModal
          error={state.logicError}
          hintRevealed={state.logicHintRevealed}
          onSubmit={(bits) => dispatch({ type: "submitLogic", bits })}
          onClose={() => dispatch({ type: "closeLogic" })}
          onRevealHint={() => dispatch({ type: "revealLogicHint" })}
        />
      )}
    </Panel>
  );
}
