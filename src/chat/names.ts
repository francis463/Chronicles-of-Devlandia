import { maskRude } from "./filter";

/** A nickname as chat compares it: trimmed, runs of spaces collapsed, lower case. */
export const nameKey = (name: string): string => name.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * What chat shows for each player, from their RAW nicknames in join order: the nickname passed through
 * `maskRude`; when several players share a nickname (compared by `nameKey`) the first keeps it and the
 * rest read `Kai (2)`, `Kai (3)`. Parentheses can't occur in nicknames, so the suffix can't be forged.
 */
export function displayNames(players: ReadonlyArray<{ id: string; name: string }>): Map<string, string> {
  const shown = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const player of players) {
    const key = nameKey(player.name);
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    const base = maskRude(player.name);
    shown.set(player.id, n === 1 ? base : `${base} (${n})`);
  }
  return shown;
}
