import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

export function Farewell({ onBack }: { onBack: () => void }) {
  return (
    <Panel className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-16">
      <h1 className="text-center text-lg font-bold tracking-widest">Thanks for playing</h1>
      <p className="text-center text-sm text-[var(--text-muted)]">
        Your progress in Devlandia is waiting for you.
      </p>
      <Button onClick={onBack}>[ Back to Menu ]</Button>
    </Panel>
  );
}
