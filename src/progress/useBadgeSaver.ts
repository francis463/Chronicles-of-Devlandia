import { useCallback, useRef, useState } from "react";
import type { ProgressStore, SavedBadge } from "./progress";

type Queue = { store: ProgressStore; items: SavedBadge[]; running: boolean };

/**
 * Saves earned badges in order. A failed save stays queued and sets `failed`; the next `save` or `flush`
 * retries it first. With no store (a guest) every call does nothing. The queue belongs to one store:
 * when the player changes, the old player's pending badges are dropped, never saved to the new account.
 */
export function useBadgeSaver(store: ProgressStore | null): { save: (b: SavedBadge) => void; flush: () => void; failed: boolean } {
  const queue = useRef<Queue | null>(null);
  const [failed, setFailed] = useState(false);

  const current = useCallback((): Queue | null => {
    if (!store) return null;
    if (queue.current?.store !== store) {
      queue.current = { store, items: [], running: false };
      setFailed(false);
    }
    return queue.current;
  }, [store]);

  const run = useCallback(
    async (q: Queue) => {
      if (q.running) return;
      q.running = true;
      try {
        while (q.items.length) {
          await q.store.save(q.items[0]);
          q.items.shift();
        }
        if (queue.current === q) setFailed(false);
      } catch {
        if (queue.current === q) setFailed(true);
      } finally {
        q.running = false;
      }
    },
    [],
  );

  const save = useCallback(
    (b: SavedBadge) => {
      const q = current();
      if (!q) return;
      q.items.push(b);
      void run(q);
    },
    [current, run],
  );
  const flush = useCallback(() => {
    const q = current();
    if (q) void run(q);
  }, [current, run]);
  return { save, flush, failed };
}
