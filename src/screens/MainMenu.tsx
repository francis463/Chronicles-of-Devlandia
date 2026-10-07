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

export function MainMenu({
  onSoloQuest,
  onTeamLobby,
  onExit,
}: {
  onSoloQuest: () => void;
  onTeamLobby: () => void;
  onExit: () => void;
}) {
  const online = useOnline();
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

        <nav aria-label="Main menu" className="mt-8 flex w-[200px] flex-col gap-2">
          <Button className="w-full" onClick={onSoloQuest}>
            Solo Quest
          </Button>
          <Button className="w-full" onClick={onTeamLobby}>
            Team Lobby
          </Button>
          <ComingSoon label="Settings" />
          <Button variant="danger" className="w-full" onClick={onExit}>
            Exit Game
          </Button>
        </nav>

        <footer className="mt-12 flex w-full flex-wrap justify-between gap-2 text-xs text-[var(--text-muted)]">
          <span>[?] HCI Help / Tutorials</span>
          <span>v1.0 | {online ? "Online" : "Offline"} Network</span>
        </footer>
      </Panel>
    </>
  );
}
