import { DRONE_START, PLAYER_START, START_MINUTES } from "../game/constants";
import { useViewportSize } from "../hooks/useViewportSize";
import type { SceneInput } from "../render/scene";
import { backdropWorld, toArt } from "../render/world";
import { MapCanvas } from "./overworld/MapCanvas";

/** The world at the moment a quest begins: dusk, nothing solved, the explorer and drone at camp. */
const MENU_SCENE: SceneInput = {
  zone: "peaks",
  player: PLAYER_START,
  drone: DRONE_START,
  teammates: [],
  playerColor: "#22c55e",
  downed: false,
  hasLoot: false,
  gateUnlocked: false,
  clueDecoded: false,
  artifactFound: false,
  towerPowered: false,
  archiveOpen: false,
  matcherSolved: false,
  earned: [],
  minutes: START_MINUTES,
};

const CAMP = toArt(PLAYER_START);

/** The pixel-art world behind the landing page, under a dark wash so the menu stays readable. */
export function MenuBackdrop() {
  const world = backdropWorld(useViewportSize(), CAMP);
  return (
    <div aria-hidden="true" data-testid="menu-backdrop" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <MapCanvas input={MENU_SCENE} world={world} />
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.45)]" />
    </div>
  );
}
