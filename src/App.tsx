import { useEffect, useMemo, useState } from "react";
import type { AuthClient } from "./auth/authClient";
import { createSupabaseAuth } from "./auth/supabaseAuth";
import { useAuth } from "./auth/useAuth";
import { loadSupabase } from "./net/supabaseClient";
import type { ProgressStore, SavedBadge } from "./progress/progress";
import { createSupabaseProgress } from "./progress/supabaseProgress";
import { useBadgeSaver } from "./progress/useBadgeSaver";
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
  makeProgress = (userId) => createSupabaseProgress(loadSupabase, userId),
}: {
  makeTransport?: (mode: TeamMode) => TeamTransport;
  /** Test seam: a deterministic clock for join order. */
  teamClock?: () => number;
  /** Test seam: the accounts client. */
  authClient?: AuthClient;
  /** Test seam: skip the login screen and play as a guest. */
  startAsGuest?: boolean;
  /** Test seam: the saved-badges store for a signed-in player. */
  makeProgress?: (userId: string) => ProgressStore;
}) {
  const auth = useAuth(authClient, startAsGuest ? "guest" : undefined);
  // A signed-in player's badges are loaded into every new game and saved as they are earned; guests have no store.
  const userId = auth.status === "signedIn" ? (auth.account?.userId ?? null) : null;
  const store = useMemo(() => (userId ? makeProgress(userId) : null), [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [saved, setSaved] = useState<{ userId: string; rows: SavedBadge[] } | null>(null);
  useEffect(() => {
    if (!store || !userId) return;
    let live = true;
    store.load().then(
      (rows) => live && setSaved({ userId, rows }),
      () => live && setSaved({ userId, rows: [] }),
    );
    return () => {
      live = false;
    };
  }, [store, userId]);
  const loadedRows = userId && saved?.userId === userId ? saved.rows : undefined;
  const saver = useBadgeSaver(store);
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameId, setGameId] = useState(0);
  const team = useTeamSession(makeTransport, teamClock);
  const chat = useChat(team);

  const { flush } = saver;
  useEffect(() => {
    if (screen === "menu") flush();
  }, [screen, flush]);

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
          busy={!!userId && !loadedRows}
        />
      )}
      {screen === "overworld" && <Overworld key={gameId} onMenu={() => setScreen("menu")} saved={loadedRows} onBadgeEarned={saver.save} saveFailed={saver.failed} />}
      {screen === "lobby" &&
        (team.phase === "playing" ? (
          <Overworld key={`team-${team.room}`} team={team} chat={chat} onMenu={leaveTeam} saved={loadedRows} onBadgeEarned={saver.save} saveFailed={saver.failed} />
        ) : (
          <TeamLobby session={team} onBack={leaveTeam} chat={chat} defaultNickname={userName ?? undefined} />
        ))}
    </main>
  );
}
