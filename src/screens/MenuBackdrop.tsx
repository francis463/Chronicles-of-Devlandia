import { DEFAULT_CLASS } from "../game/classes";
import { START_MINUTES } from "../game/constants";
import { useViewportSize } from "../hooks/useViewportSize";
import type { SceneInput } from "../render/scene";
import { backdropWorld, zoneToArt } from "../render/world";
import { MapCanvas } from "./overworld/MapCanvas";

/** Where the explorer and drone stand in the forest, which the camera centres on. */
const CAMP = { x: 50, y: 55 };

/** The forest at the moment a quest begins: dusk, nothing solved, the explorer and drone among the trees. */
const MENU_SCENE: SceneInput = {
  zone: "forest",
  player: { x: CAMP.x + 4, y: CAMP.y + 6 },
  drone: { x: CAMP.x + 2, y: CAMP.y + 8 },
  teammates: [],
  playerColor: "#22c55e",
  playerClass: DEFAULT_CLASS,
  downed: false,
  hasLoot: false,
  gateUnlocked: false,
  clueDecoded: false,
  artifactFound: false,
  towerPowered: false,
  archiveOpen: false,
  lighthouseLit: false,
  matcherSolved: false,
  earned: [],
  minutes: START_MINUTES,
};

/** The pixel-art forest behind the landing page, under a dark wash so the menu stays readable. */
export function MenuBackdrop() {
  const world = backdropWorld(useViewportSize(), zoneToArt(CAMP, "forest"));
  return (
    <div aria-hidden="true" data-testid="menu-backdrop" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <MapCanvas input={MENU_SCENE} world={world} />
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.45)]" />
    </div>
  );
}
