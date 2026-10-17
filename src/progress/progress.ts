import { CHEST_IDS, CHESTS, type Picks } from "../learn/chests";
import type { ChestId } from "../learn/types";

/** One earned badge as it is saved: which chest, the question that was answered, and the answer text. */
export type SavedBadge = { chest: ChestId; questionId: string; answer: string };

export interface ProgressStore {
  load(): Promise<SavedBadge[]>;
  save(b: SavedBadge): Promise<void>;
}

/**
 * A new game's starting badges from saved rows. The pick for each earned chest is the saved question, so the
 * Codex and the open chest show what the player really answered; a question that has left the bank keeps its
 * badge and answer and leaves the rolled pick alone. The first row for a chest wins; unknown chests are dropped.
 */
export function seedFromSaved(
  saved: readonly SavedBadge[],
  picks: Picks,
): { badges: ChestId[]; answered: Partial<Record<ChestId, string>>; picks: Picks } {
  const first = new Map<ChestId, SavedBadge>();
  for (const row of saved) if (CHEST_IDS.includes(row.chest) && !first.has(row.chest)) first.set(row.chest, row);
  const seeded: Picks = { ...picks };
  const answered: Partial<Record<ChestId, string>> = {};
  const badges = CHEST_IDS.filter((id) => first.has(id));
  for (const id of badges) {
    const row = first.get(id)!;
    answered[id] = row.answer;
    const index = CHESTS.find((c) => c.id === id)!.bank.findIndex((q) => q.id === row.questionId);
    if (index >= 0) seeded[id] = index;
  }
  return { badges, answered, picks: seeded };
}

/** An in-memory store for tests. `failNext` makes that many upcoming saves reject. */
export function createMemoryProgress(initial: SavedBadge[] = []): ProgressStore & { rows: SavedBadge[]; failNext: number } {
  const store = {
    rows: [...initial],
    failNext: 0,
    load: async () => [...store.rows],
    save: async (b: SavedBadge) => {
      if (store.failNext > 0) {
        store.failNext -= 1;
        throw new Error("save failed");
      }
      if (!store.rows.some((r) => r.chest === b.chest)) store.rows.push(b);
    },
  };
  return store;
}
