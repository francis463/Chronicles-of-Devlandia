/**
 * The quest lines. Below md they continue the bottom bar's band under the inventory row; at md they
 * are a sidebar block whose dashed right border joins the mini-map's and the log's.
 */
export function QuestList({
  questComplete,
  artifactFound,
  towerPowered,
  badges,
  team,
  className = "",
}: {
  questComplete: boolean;
  artifactFound: boolean;
  towerPowered: boolean;
  /** How many of the 11 badges you have (badges are personal, even in a team). */
  badges: number;
  team: boolean;
  className?: string;
}) {
  return (
    <section
      aria-label="Quests"
      className={`bg-[var(--bg)] px-3 pb-2 md:border-r-2 md:border-dashed md:border-[var(--panel-border)] md:bg-transparent md:p-3 ${className}`}
    >
      <div className="flex flex-col items-end gap-1 text-[10px] uppercase tracking-widest text-[var(--accent)]">
        <span className={questComplete ? "font-bold" : ""}>
          {`Quest: Survey Frozen River (${questComplete ? "1/1 Complete" : "0/1"})`}
        </span>
        <span className={artifactFound ? "font-bold" : ""}>
          {`Treasure: Golden Semicolon (${artifactFound ? "1/1 Found" : "0/1"})`}
        </span>
        <span className={towerPowered ? "font-bold" : ""}>
          {`Tower: Power the signal tower (${towerPowered ? "1/1 Online" : "0/1"})`}
        </span>
        <span className={badges === 11 ? "font-bold" : ""}>{`${team ? "Your badges" : "Badges"}: ${badges}/11`}</span>
      </div>
    </section>
  );
}
