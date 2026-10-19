import type { SupabaseLike } from "../net/supabaseClient";
import { isAvatarKey, parseMe, parseRows, type LeaderboardStore } from "./leaderboard";

/**
 * The leaderboard over Supabase: two read-only functions that return only names, ranks and counts, and the player's
 * own "hide me" row and photo. A guest (no `userId`) can read the list and nothing else.
 */
export function createSupabaseLeaderboard(load: () => Promise<SupabaseLike>, userId: string | null): LeaderboardStore {
  return {
    async top(rows = 20) {
      const { data, error } = await (await load()).rpc("leaderboard_top", { max_rows: rows });
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
    async setAvatar(photo) {
      if (!userId) return;
      const client = await load();
      const started = await client.rpc("avatar_start");
      const row = Array.isArray(started.data) ? (started.data[0] as { new_key?: unknown; old_key?: unknown } | undefined) : undefined;
      if (started.error || !isAvatarKey(row?.new_key)) throw new Error("Can't save your photo");
      const { error } = await client.storage.from("avatars").upload(`${row.new_key}.jpg`, photo, { contentType: "image/jpeg" });
      if (error) {
        await client.rpc("avatar_clear"); // never leave a photo that points at nothing
        throw new Error("Can't save your photo");
      }
      if (isAvatarKey(row.old_key)) await client.storage.from("avatars").remove([`${row.old_key}.jpg`]);
    },
    async removeAvatar() {
      if (!userId) return;
      const client = await load();
      const { data, error } = await client.rpc("avatar_clear");
      if (error) throw new Error("Can't remove your photo");
      const old = Array.isArray(data) ? (data[0] as { old_key?: unknown } | undefined)?.old_key : undefined;
      if (isAvatarKey(old)) await client.storage.from("avatars").remove([`${old}.jpg`]);
    },
  };
}
