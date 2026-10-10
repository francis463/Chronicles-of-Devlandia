import { useCallback, useState } from "react";

const MAX_STEPS = 20;
const RUN_MS = 1000;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type History<T> = { past: T[]; value: T; typingAt: number | null };

/**
 * A value with Undo and Reset. Each change is a step (at most 20 kept); a run of typing is one step
 * until a 1-second pause or `breakRun()`. Reset is itself a step, so Undo after Reset restores everything.
 */
export function useUndo<T>(start: T, now: () => number = () => performance.now()) {
  const [h, setH] = useState<History<T>>({ past: [], value: start, typingAt: null });

  const set = useCallback(
    (next: T, opts?: { typing?: boolean }) =>
      setH((s) => {
        if (equal(next, s.value)) return s;
        const t = now();
        const typing = opts?.typing ?? false;
        if (typing && s.typingAt !== null && t - s.typingAt < RUN_MS) return { ...s, value: next, typingAt: t };
        return { past: [...s.past, s.value].slice(-MAX_STEPS), value: next, typingAt: typing ? t : null };
      }),
    [now],
  );
  const breakRun = useCallback(() => setH((s) => (s.typingAt === null ? s : { ...s, typingAt: null })), []);
  const undo = useCallback(
    () => setH((s) => (s.past.length === 0 ? s : { past: s.past.slice(0, -1), value: s.past[s.past.length - 1], typingAt: null })),
    [],
  );
  const reset = useCallback(
    () =>
      setH((s) => (equal(s.value, start) ? s : { past: [...s.past, s.value].slice(-MAX_STEPS), value: start, typingAt: null })),
    [start],
  );

  return { value: h.value, set, breakRun, undo, reset, canUndo: h.past.length > 0, canReset: !equal(h.value, start) };
}
