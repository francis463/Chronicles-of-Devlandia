import { useState } from "react";
import { useChat } from "./hooks/useChat";
import { useTeamSession } from "./hooks/useTeamSession";
import { makeTransport as defaultTransport } from "./net/makeTransport";
import type { TeamMode, TeamTransport } from "./net/transport";
import { MainMenu } from "./screens/MainMenu";
import { Overworld } from "./screens/overworld/Overworld";
import { TeamLobby } from "./screens/TeamLobby";

type Screen = "menu" | "overworld" | "lobby";

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
  const chat = useChat(team);

  const startSoloQuest = () => {
    setGameId((id) => id + 1);
    setScreen("overworld");
  };
  const leaveTeam = () => {
    team.leave();
    setScreen("menu");
  };

  // The overworld takes the window: slim page padding on desktop.
  const inGame = screen === "overworld" || (screen === "lobby" && team.phase === "playing");

  return (
    <main className={inGame ? "min-h-screen p-4 sm:p-8 md:p-2" : "min-h-screen p-4 sm:p-8"}>
      {screen === "menu" && (
        <MainMenu onSoloQuest={startSoloQuest} onTeamLobby={() => setScreen("lobby")} />
      )}
      {screen === "overworld" && <Overworld key={gameId} onMenu={() => setScreen("menu")} />}
      {screen === "lobby" &&
        (team.phase === "playing" ? (
          <Overworld key={`team-${team.room}`} team={team} chat={chat} onMenu={leaveTeam} />
        ) : (
          <TeamLobby session={team} onBack={leaveTeam} chat={chat} />
        ))}
    </main>
  );
}
