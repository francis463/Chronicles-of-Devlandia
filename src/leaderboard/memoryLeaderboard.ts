import type { LeaderboardStore, Me, Row } from "./leaderboard";

export type MemoryLeaderboard = LeaderboardStore & {
  rows: Row[];
  meState: Me | null;
  /** The next this many calls reject, then it recovers. */
  failNext: number;
  calls: string[];
};
const KEY = "33333333-3333-4333-8333-333333333333";

/** An in-memory leaderboard for tests. */
export function createMemoryLeaderboard(init: { rows?: Row[]; me?: Me | null } = {}): MemoryLeaderboard {
  const fail = () => {
    if (store.failNext > 0) {
      store.failNext--;
      return Promise.reject(new Error("leaderboard unreachable"));
    }
    return null;
  };
  const store: MemoryLeaderboard = {
    rows: init.rows ?? [],
    meState: init.me ?? null,
    failNext: 0,
    calls: [],
    top: () => fail() ?? Promise.resolve([...store.rows]),
    me: () => fail() ?? Promise.resolve(store.meState ? { ...store.meState } : null),
    setHidden: (hidden) => {
      const failed = fail();
      if (failed) return failed;
      store.calls.push(`setHidden:${hidden}`);
      if (store.meState) store.meState = { ...store.meState, hidden };
      return Promise.resolve();
    },
    setAvatar: (photo) => {
      const failed = fail();
      if (failed) return failed;
      store.calls.push(`setAvatar:${photo.size}`);
      if (store.meState) store.meState = { ...store.meState, avatar: KEY };
      return Promise.resolve();
    },
    removeAvatar: () => {
      const failed = fail();
      if (failed) return failed;
      store.calls.push("removeAvatar");
      if (store.meState) store.meState = { rank: store.meState.rank, badges: store.meState.badges, hidden: store.meState.hidden };
      return Promise.resolve();
    },
  };
  return store;
}
