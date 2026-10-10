import { useEffect, useReducer, useRef, useState } from "react";
import { cardFor } from "../../game/cards";
import { challengeOf, challengeView } from "../../game/challenges";
import { rollGame } from "../../game/roll";
import { interactLabel, placeInReach, promptText } from "../../game/geometry";
import { gameReducer, initialState, isDowned, isModalOpen, reachPlaces } from "../../game/reducer";
import type { GameState } from "../../game/types";
import type { TeamSession } from "../../hooks/useTeamSession";
import { LOG, TICK_MS } from "../../game/constants";
import { flagsOf, teamMinutes } from "../../game/team";
import { ZONES } from "../../game/zones";
import { chestById } from "../../learn/chests";
import type { BlankMode, ChestId } from "../../learn/types";
import { useNow } from "../../hooks/useNow";
import { useGameTimers } from "../../hooks/useGameTimers";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { Panel } from "../../ui/Panel";
import { ChallengeTerminal } from "../ChallengeTerminal";
import { Codex } from "../Codex";
import { LeaveConfirm } from "./LeaveConfirm";
import { LogicModal } from "../LogicModal";
import { BottomHud } from "./BottomHud";
import { EventLog } from "./EventLog";
import { MapViewport } from "./MapViewport";
import { MiniMap } from "./MiniMap";
import { QuestList } from "./QuestList";
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
  // Each game rolls its questions, shuffle seed, Matcher round and access code once, at mount; a team shares the code.
  const [state, dispatch] = useReducer(gameReducer, undefined, () => ({
    ...initialState,
    ...rollGame(Math.random, team?.startedAt ?? undefined),
    ...initial,
  }));
  // Type or Blocks: kept while terminals open and close, reset by a new game (which remounts this).
  const [mode, setMode] = useState<BlankMode>("type");
  // [=] Menu with progress asks first; while it asks, play pauses and it owns the keys.
  const [leaving, setLeaving] = useState(false);
  const hasProgress = state.badges.length > 0 || state.matcherSolved || Object.values(flagsOf(state)).some(Boolean);
  useGameTimers(state, dispatch, leaving);
  useKeyboardControls(state, dispatch, leaving);
  const downed = isDowned(state);

  // ── Team mode ──
  const publishPosition = team?.publishPosition;
  const publishFlags = team?.publishFlags;
  const onProgress = team?.onProgress;
  const onRoster = team?.onRoster;
  const onZoneChange = team?.onZoneChange;
  const publishBadge = team?.publishBadge;
  const onBadge = team?.onBadge;
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
  // Badges are personal: each new one goes out once, and teammates' badges are news for the log.
  const published = useRef(new Set<ChestId>());
  useEffect(() => {
    for (const chest of state.badges) {
      if (published.current.has(chest) || !publishBadge) continue;
      published.current.add(chest);
      publishBadge(chest);
    }
  }, [publishBadge, state.badges]);
  const heardBadge = useRef(false);
  useEffect(
    () =>
      onBadge?.((name, chest) => {
        dispatch({ type: "note", text: LOG.teammateBadge(name, chestById(chest).badge) });
        if (!heardBadge.current) dispatch({ type: "note", text: LOG.badgesPersonal });
        heardBadge.current = true;
      }),
    [onBadge],
  );
  const now = useNow(TICK_MS, team?.startedAt != null);
  const minutes = team?.startedAt != null ? teamMinutes(team.startedAt, now) : state.minutes;
  const teamLabel = team?.room ? `ROOM ${team.room} · ${team.players.length} online` : undefined;

  const inRange = downed ? null : placeInReach(state.player, reachPlaces(state));

  return (
    <Panel className="mx-auto w-full max-w-screen-2xl overflow-hidden md:grid md:min-h-[calc(100dvh-1rem)] md:grid-cols-[14rem_minmax(0,1fr)] md:grid-rows-[auto_auto_auto_1fr_auto]">
      {/* DOM order is the phone order; at md the grid places the sidebar (mini-map, quests, log) beside the map. */}
      <TopHud
        className="md:col-span-2"
        hp={state.hp}
        stamina={state.stamina}
        minutes={minutes}
        onMenu={() => (hasProgress ? setLeaving(true) : onMenu())}
        onCodex={() => dispatch({ type: "toggleCodex" })}
        teamLabel={teamLabel}
        reconnecting={team?.status === "reconnecting"}
        region={ZONES[state.zone].name}
      />
      <MiniMap
        className="md:col-start-1 md:row-start-2"
        zone={state.zone}
        player={state.player}
        artifactFound={state.artifactFound}
        badges={state.badges}
        archiveOpen={state.archiveOpen}
        teammates={team?.teammates}
        playerColor={team?.me?.color}
      />
      <div className="flex min-w-0 flex-col md:col-start-2 md:row-start-2 md:row-span-3">
        <MapViewport
          zone={state.zone}
          player={state.player}
          drone={state.drone}
          minutes={minutes}
          hasLoot={state.hasLoot}
          gateUnlocked={state.gateUnlocked}
          clueDecoded={state.clueDecoded}
          artifactFound={state.artifactFound}
          towerPowered={state.towerPowered}
          badges={state.badges}
          matcherSolved={state.matcherSolved}
          archiveOpen={state.archiveOpen}
          teammates={team?.teammates.filter((t) => t.zone === state.zone)}
          playerColor={team?.me?.color}
          inRange={inRange}
          downed={downed}
          onInteract={(poi) => dispatch({ type: "interact", poi })}
          onCloseInspection={() => dispatch({ type: "closeInspection" })}
          onRespawn={() => dispatch({ type: "respawn" })}
          prompt={inRange ? promptText(state, inRange) : ""}
          card={cardFor(state)}
        />
        <TouchControls
          disabled={downed || leaving || isModalOpen(state)}
          inRange={inRange}
          label={inRange ? interactLabel(state, inRange) : null}
          onMove={(dir) => dispatch({ type: "move", dir })}
          onInteract={(poi) => dispatch({ type: "interact", poi })}
        />
      </div>
      <EventLog className="md:col-start-1 md:row-start-4" logs={state.logs} logCount={state.logCount} />
      <BottomHud
        className="md:col-span-2 md:row-start-5"
        hasLoot={state.hasLoot}
        clueDecoded={state.clueDecoded}
        artifactFound={state.artifactFound}
        onDecodeScroll={() => dispatch({ type: "openCipher" })}
      />
      <QuestList
        className="md:col-start-1 md:row-start-3"
        questComplete={state.questComplete}
        artifactFound={state.artifactFound}
        towerPowered={state.towerPowered}
        badges={state.badges.length}
        team={team !== undefined}
      />
      {state.codexOpen && (
        <Codex
          badges={state.badges}
          answered={state.answered}
          picks={state.picks}
          team={team !== undefined}
          onClose={() => dispatch({ type: "toggleCodex" })}
        />
      )}
      {leaving && <LeaveConfirm onStay={() => setLeaving(false)} onLeave={onMenu} />}
      {state.challenge && (
        <ChallengeTerminal
          key={state.challenge.target}
          challenge={challengeOf(state, state.challenge.target)}
          view={challengeView(state)!}
          mode={mode}
          onModeChange={setMode}
          onSubmit={(value) => dispatch({ type: "submitChallenge", value })}
          onRevealHint={() => dispatch({ type: "revealChallengeHint" })}
          onClose={() => dispatch({ type: "closeChallenge" })}
        />
      )}
      {state.logicOpen && (
        <LogicModal
          error={state.logicError}
          hintRevealed={state.logicHintRevealed}
          onSubmit={(bits) => dispatch({ type: "submitLogic", bits })}
          onClose={() => dispatch({ type: "closeLogic" })}
          onRevealHint={() => dispatch({ type: "revealLogicHint" })}
          onReset={() => dispatch({ type: "resetLogic" })}
        />
      )}
    </Panel>
  );
}
