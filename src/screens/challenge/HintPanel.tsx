import { useEffect, useRef } from "react";
import { PUZZLE_HINT_LOCKED } from "../../game/constants";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { Button } from "../../ui/Button";

/** The drone's hint: locked until used, revealed on its own at the 2nd wrong try (and scrolled into view once). */
export function HintPanel({
  hint,
  revealed,
  wrongTries,
  onReveal,
}: {
  hint: string;
  revealed: boolean;
  wrongTries: number;
  onReveal: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const scrolled = useRef(false);
  const stuck = wrongTries >= 2;

  useEffect(() => {
    if (!stuck || scrolled.current) return;
    scrolled.current = true;
    panel.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [stuck, reduced]);

  return (
    <section
      ref={panel}
      aria-label="AI drone hint"
      className="flex flex-1 flex-col gap-2 rounded-md border-2 border-[var(--primary-border)] bg-[var(--panel)] p-4"
    >
      <h3 className="text-sm text-[var(--primary-border)]">SMART AI DRONE DIAGNOSTIC HINT:</h3>
      {revealed && stuck && <p className="text-xs font-bold">Drone: stuck? Here's a tip.</p>}
      <p className="text-xs">{revealed ? hint : PUZZLE_HINT_LOCKED}</p>
      <Button variant="neutral" className="mt-auto w-full py-3" onClick={onReveal}>
        [ USE HINT ITEM ]
      </Button>
    </section>
  );
}
