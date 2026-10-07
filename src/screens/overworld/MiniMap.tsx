import { HIDDEN_ARTIFACT, POIS } from "../../game/constants";
import type { Point } from "../../game/types";

export function MiniMap({ player, artifactFound }: { player: Point; artifactFound: boolean }) {
  return (
    <div className="flex gap-3 border-b-2 border-dashed border-[var(--panel-border)] p-3 md:w-36 md:flex-shrink-0 md:flex-col md:border-r-2 md:border-b-0">
      <div
        aria-label="Mini-map"
        role="img"
        className="relative h-24 w-28 flex-shrink-0 overflow-hidden rounded border border-[var(--panel-border)] bg-[var(--bg)]"
      >
        <div className="absolute top-1/3 right-1/4 left-1/4 border-t-2 border-dashed border-[var(--primary)]" />
        {POIS.map((poi) => (
          <div
            key={poi.id}
            className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 border border-[var(--accent)]"
            style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
          />
        ))}
        {artifactFound && (
          <div
            className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[var(--accent)]"
            style={{ left: `${HIDDEN_ARTIFACT.x}%`, top: `${HIDDEN_ARTIFACT.y}%` }}
          />
        )}
        <div
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--success)] transition-all duration-150"
          style={{ left: `${player.x}%`, top: `${player.y}%` }}
        />
      </div>
      <div className="flex flex-col justify-center gap-1 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        <span className="font-bold text-[var(--text)]">Controls</span>
        <span className="pointer-coarse:hidden">Move: WASD / Arrows</span>
        <span className="pointer-coarse:hidden">Interact: [E]</span>
        <span className="hidden pointer-coarse:inline">Move: D-pad</span>
        <span className="hidden pointer-coarse:inline">Interact: [E] button</span>
      </div>
    </div>
  );
}
