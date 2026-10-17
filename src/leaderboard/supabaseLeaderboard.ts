import type { SupabaseLike } from "../net/supabaseClient";
import { parseMe, parseRows, type LeaderboardStore } from "./leaderboard";

/**
 * The leaderboard over Supabase: two read-only functions that return only names, ranks and counts, and the player's
 * own "hide me" row. A guest (no `userId`) can read the list and nothing else.
 */
export function createSupabaseLeaderboard(load: () => Promise<SupabaseLike>, userId: string | null): LeaderboardStore {
  return {
    async top() {
      const { data, error } = await (await load()).rpc("leaderboard_top", { max_rows: 20 });
      if (error) throw new Error("Can't load the leaderboard");
      return parseRows(data);
    },
    async me() {
      if (!userId) return null;
      const { data, error } = await (await load()).rpc("leaderboard_me");
      if (error) throw new Error("Can't load your rank");
      return parseMe(data);
    },
    async setHidden(hidden) {
      if (!userId) return;
      const client = await load();
      if (hidden) {
        const { error } = await client.from("leaderboard_hidden").insert({ user_id: userId });
        // 23505: already hidden, which is the state we wanted.
        if (error && error.code !== "23505") throw new Error("Can't hide you");
      } else {
        const { error } = await client.from("leaderboard_hidden").delete().eq("user_id", userId);
        if (error) throw new Error("Can't show you");
      }
    },
  };
}
