import type { PresenceMeta, TeamMessage } from "../game/team";

/** "online" = Supabase Realtime; "local" = browser windows on this computer (Same computer mode). */
export type TeamMode = "online" | "local";
export type TeamStatus = "connecting" | "online" | "reconnecting";

export class TeamError extends Error {
  constructor(public kind: "unreachable") {
    super(kind);
  }
}

/**
 * One room connection. Presence lists everyone in the room including you; messages go
 * to everyone else. Implementations validate everything they receive with team.ts.
 */
export interface TeamTransport {
  join(room: string, me: PresenceMeta): Promise<void>;
  leave(): Promise<void>;
  updatePresence(meta: PresenceMeta): void;
  send(msg: TeamMessage): void;
  onPresence(cb: (metas: PresenceMeta[]) => void): () => void;
  onMessage(cb: (msg: TeamMessage) => void): () => void;
  onStatus(cb: (s: TeamStatus) => void): () => void;
}

/** Small listener set used by every transport. */
export function emitter<T>() {
  const listeners = new Set<(value: T) => void>();
  return {
    on(cb: (value: T) => void) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    emit(value: T) {
      for (const cb of [...listeners]) cb(value);
    },
  };
}

export const roomChannel = (room: string) => `devlandia-${room}`;
