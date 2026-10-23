import { useState } from "react";
import { avatarUrl } from "../leaderboard/leaderboard";

/**
 * A player's round picture, or their first letter when they have none or it will not load. `size` is the circle's
 * side in CSS px; `empty` draws a "?" for a spot nobody has earned.
 */
export function Face({ name, avatar, size = 32, empty = false }: { name: string; avatar?: string; size?: number; empty?: boolean }) {
  const [broken, setBroken] = useState(false);
  const picture = !empty && avatar && !broken;
  return (
    <span
      aria-hidden={picture ? undefined : true}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--panel-border)] bg-[var(--bg)] font-bold text-[var(--accent)] ${empty ? "opacity-60" : ""}`}
    >
      {picture ? (
        <img src={avatarUrl(avatar)} alt={`${name}'s photo`} width={size} height={size} onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : empty ? (
        "?"
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
