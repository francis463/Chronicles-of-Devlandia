import { useState } from "react";
import type { AuthClient } from "./auth/authClient";
import { createSupabaseAuth } from "./auth/supabaseAuth";
import { useAuth } from "./auth/useAuth";
import { loadSupabase } from "./net/supabaseClient";
import { AuthScreen } from "./screens/AuthScreen";
import { ChooseName } from "./screens/ChooseName";
import { SetPassword } from "./screens/SetPassword";
import { useChat } from "./hooks/useChat";
import { useTeamSession } from "./hooks/useTeamSession";
import { makeTransport as defaultTransport } from "./net/makeTransport";
import type { TeamMode, TeamTransport } from "./net/transport";
import { MainMenu } from "./screens/MainMenu";
import { Overworld } from "./screens/overworld/Overworld";
import { TeamLobby } from "./screens/TeamLobby";

type Screen = "menu" | "overworld" | "lobby";

/** The accounts client the app uses unless a test hands it another. */
const defaultAuth: AuthClient = createSupabaseAuth(loadSupabase);

export default function App({
  makeTransport = defaultTransport,
  teamClock,
  authClient = defaultAuth,
  startAsGuest = false,
}: {
  makeTransport?: (mode: TeamMode) => TeamTransport;
  /** Test seam: a deterministic clock for join order. */
  teamClock?: () => number;
  /** Test seam: the accounts client. */
  authClient?: AuthClient;
  /** Test seam: skip the login screen and play as a guest. */
  startAsGuest?: boolean;
}) {
  const auth = useAuth(authClient, startAsGuest ? "guest" : undefined);
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

  // Before the menu: the login screen, a Google player's name, or a password reset.
  if (auth.status === "loading" || auth.status === "signedOut") return <AuthScreen auth={auth} />;
  if (auth.status === "needsName") return <ChooseName auth={auth} />;
  if (auth.status === "recovery") return <SetPassword auth={auth} />;
  const account = auth.account;
  const userName = auth.status === "signedIn" ? account?.name ?? null : null;

  // The overworld takes the window: slim page padding on desktop.
  const inGame = screen === "overworld" || (screen === "lobby" && team.phase === "playing");

  return (
    <main className={inGame ? "min-h-screen p-4 sm:p-8 md:p-2" : "min-h-screen p-4 sm:p-8"}>
      {screen === "menu" && (
        <MainMenu
          onSoloQuest={startSoloQuest}
          onTeamLobby={() => setScreen("lobby")}
          account={userName && account ? { kind: "user", name: userName, hasRealEmail: account.hasRealEmail } : { kind: "guest" }}
          onLogIn={auth.leaveGuest}
          onLogOut={() => void auth.logOut()}
          onAddEmail={auth.addEmail}
        />
      )}
      {screen === "overworld" && <Overworld key={gameId} onMenu={() => setScreen("menu")} />}
      {screen === "lobby" &&
        (team.phase === "playing" ? (
          <Overworld key={`team-${team.room}`} team={team} chat={chat} onMenu={leaveTeam} />
        ) : (
          <TeamLobby session={team} onBack={leaveTeam} chat={chat} defaultNickname={userName ?? undefined} />
        ))}
    </main>
  );
}
