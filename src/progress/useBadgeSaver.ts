import { useCallback, useRef, useState } from "react";
import type { ProgressStore, SavedBadge } from "./progress";

/**
 * Saves earned badges in order. A failed save stays queued and sets `failed`; the next `save` or `flush`
 * retries it first. With no store (a guest) every call does nothing.
 */
export function useBadgeSaver(store: ProgressStore | null): { save: (b: SavedBadge) => void; flush: () => void; failed: boolean } {
  const queue = useRef<SavedBadge[]>([]);
  const running = useRef(false);
  const [failed, setFailed] = useState(false);

  const run = useCallback(async () => {
    if (!store || running.current) return;
    running.current = true;
    try {
      while (queue.current.length) {
        await store.save(queue.current[0]);
        queue.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      running.current = false;
    }
  }, [store]);

  const save = useCallback(
    (b: SavedBadge) => {
      if (!store) return;
      queue.current.push(b);
      void run();
    },
    [store, run],
  );
  const flush = useCallback(() => void run(), [run]);
  return { save, flush, failed };
}
