import type { SupabaseLike } from "../net/supabaseClient";
import type { ProgressStore, SavedBadge } from "./progress";

/** One player's saved badges, in the `badges` table. Row-level rules mean they can only ever touch their own. */
export function createSupabaseProgress(load: () => Promise<SupabaseLike>, userId: string): ProgressStore {
  return {
    async load() {
      const { data, error } = await (await load()).from("badges").select("chest, question_id, answer").eq("user_id", userId);
      if (error) throw new Error("Can't load badges");
      return ((data ?? []) as Array<{ chest: SavedBadge["chest"]; question_id: string; answer: string }>).map((r) => ({
        chest: r.chest,
        questionId: r.question_id,
        answer: r.answer,
      }));
    },
    async save(b) {
      const { error } = await (await load()).from("badges").insert({ user_id: userId, chest: b.chest, question_id: b.questionId, answer: b.answer });
      // 23505: this chest is already saved, which is the state we wanted.
      if (error && error.code !== "23505") throw new Error("Can't save the badge");
    },
  };
}
