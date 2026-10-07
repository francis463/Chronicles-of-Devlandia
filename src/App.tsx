import { useState } from "react";
import { useTeamSession } from "./hooks/useTeamSession";
import { createBroadcastTransport } from "./net/broadcastTransport";
import type { TeamMode, TeamTransport } from "./net/transport";
import { Farewell } from "./screens/Farewell";
import { MainMenu } from "./screens/MainMenu";
import { Overworld } from "./screens/overworld/Overworld";
import { TeamLobby } from "./screens/TeamLobby";

type Screen = "menu" | "overworld" | "lobby" | "farewell";

const defaultTransport = (_mode: TeamMode): TeamTransport => createBroadcastTransport();

export default function App({
  makeTransport = defaultTransport,
  teamClock,
}: {
  makeTransport?: (mode: TeamMode) => TeamTransport;
  /** Test seam: a deterministic clock for join order. */
  teamClock?: () => number;
}) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameId, setGameId] = useState(0);
  const team = useTeamSession(makeTransport, teamClock);

  const startSoloQuest = () => {
    setGameId((id) => id + 1);
    setScreen("overworld");
  };
  const leaveTeam = () => {
    team.leave();
    setScreen("menu");
  };

  return (
    <main className="min-h-screen p-4 sm:p-8">
      {screen === "menu" && (
        <MainMenu onSoloQuest={startSoloQuest} onTeamLobby={() => setScreen("lobby")} onExit={() => setScreen("farewell")} />
      )}
      {screen === "overworld" && <Overworld key={gameId} onMenu={() => setScreen("menu")} />}
      {screen === "lobby" &&
        (team.phase === "playing" ? (
          <Overworld key={`team-${team.room}`} team={team} onMenu={leaveTeam} />
        ) : (
          <TeamLobby session={team} onBack={leaveTeam} />
        ))}
      {screen === "farewell" && <Farewell onBack={() => setScreen("menu")} />}
    </main>
  );
}
