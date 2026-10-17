import { useState } from "react";
import { AddEmail } from "../auth/AddEmail";
import type { Result } from "../auth/authClient";
import { useOnline } from "../hooks/useOnline";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { MenuBackdrop } from "./MenuBackdrop";

function ComingSoon({ label }: { label: string }) {
  return (
    <Button disabled className="w-full">
      <span className="block">{label}</span>
      <span className="block text-[9px] font-medium normal-case tracking-normal text-[var(--text-muted)]">
        Coming soon
      </span>
    </Button>
  );
}

/** Who is playing, as the menu shows it. */
export type MenuAccount = { kind: "guest" } | { kind: "user"; name: string; hasRealEmail: boolean };

export function MainMenu({
  onSoloQuest,
  onTeamLobby,
  account,
  onLogIn,
  onLogOut,
  onAddEmail,
}: {
  onSoloQuest: () => void;
  onTeamLobby: () => void;
  account: MenuAccount;
  onLogIn: () => void;
  onLogOut: () => void;
  onAddEmail: (email: string) => Promise<Result>;
}) {
  const online = useOnline();
  const [addingEmail, setAddingEmail] = useState(false);
  return (
    <>
      <MenuBackdrop />
      <Panel className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-10 pb-4 sm:px-6">
        <h1 className="text-center text-lg font-bold tracking-widest text-[var(--text)] sm:text-xl">
          CHRONICLES OF DEVLANDIA
        </h1>
        <p className="mt-2 text-center text-sm text-[var(--primary-border)]">
          "Solve the Map, Break the Code, Find the Treasure."
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          {account.kind === "guest" ? (
            <>
              <span>Guest ·</span>
              <Button variant="ghost" onClick={onLogIn}>
                [ Log in ]
              </Button>
            </>
          ) : (
            <>
              <span>Signed in as {account.name} ·</span>
              <Button variant="ghost" onClick={onLogOut}>
                [ Log out ]
              </Button>
              {!account.hasRealEmail && !addingEmail && (
                <Button variant="ghost" onClick={() => setAddingEmail(true)}>
                  [ Add email ]
                </Button>
              )}
            </>
          )}
        </div>
        {addingEmail && <AddEmail onAdd={onAddEmail} onClose={() => setAddingEmail(false)} />}

        <nav aria-label="Main menu" className="mt-6 flex w-[200px] flex-col gap-2">
          <Button className="w-full" onClick={onSoloQuest}>
            Solo Quest
          </Button>
          <Button className="w-full" onClick={onTeamLobby}>
            Team Lobby
          </Button>
          <ComingSoon label="Leaderboards" />
        </nav>

        <footer className="mt-12 flex w-full flex-wrap justify-between gap-2 text-xs text-[var(--text-muted)]">
          <span>[?] HCI Help / Tutorials</span>
          <span>v1.0 | {online ? "Online" : "Offline"} Network</span>
        </footer>
      </Panel>
    </>
  );
}
