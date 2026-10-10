import { useCallback, useEffect, useState } from "react";
import { checkBlank } from "../../learn/check";
import type { BlankChallenge, BlankMode, CheckResult } from "../../learn/types";

export const LIVE_DELAY_MS = 500;

const same = (a: CheckResult | "pristine", b: CheckResult) =>
  a !== "pristine" && a.ok === b.ok && (a.ok || (!b.ok && a.reason === b.reason));

/**
 * The live syntax check for a blank: "pristine" until the first edit, then the result once typing
 * pauses for 500 ms (at once in Blocks mode). `flush` checks now (on blur and on a submit attempt).
 * An unchanged result keeps the same state, so the polite region never re-announces it.
 */
export function useLiveCheck(c: BlankChallenge, value: string, mode: BlankMode, edited: boolean) {
  const [result, setResult] = useState<CheckResult | "pristine">("pristine");
  const settle = useCallback((next: CheckResult) => setResult((prev) => (same(prev, next) ? prev : next)), []);

  useEffect(() => {
    if (!edited) return;
    if (mode === "blocks") return settle(checkBlank(c, value, mode));
    const id = setTimeout(() => settle(checkBlank(c, value, mode)), LIVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [c, value, mode, edited, settle]);

  const flush = useCallback((): CheckResult => {
    const now = checkBlank(c, value, mode);
    settle(now);
    return now;
  }, [c, value, mode, settle]);

  return { result, flush };
}
