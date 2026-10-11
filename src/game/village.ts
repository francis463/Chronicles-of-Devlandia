import type { GameState } from "./types";

type Progress = Pick<GameState, "gateUnlocked" | "towerPowered" | "questComplete" | "hasLoot" | "clueDecoded" | "artifactFound">;

/** Ada's hints, in quest order: she speaks to the first stage you haven't done. */
const STAGES: Array<[keyof Progress, string]> = [
  ["gateUnlocked", "Heading north? The gate's terminal wants one CSS fix. Get the display right and the wall lets you through."],
  ["towerPowered", "The gate's open! The signal tower in the snowy north-west is dark. Power it and the bridge over the river comes back."],
  ["questComplete", "The tower's beam is back and the bridge holds. Walk out onto the frozen river and survey it."],
  ["hasLoot", "Explorers stash supplies in the cache in the north-east snow. Have a look inside."],
  ["clueDecoded", "That scroll from the cache is scrambled. Decode it from your inventory: every letter is shifted."],
  ["artifactFound", "The Dense Forest, you say? Take the path south from the Peaks and look for the X in its south-east corner."],
];
const DONE = "You found the Golden Semicolon! Every statement in Devlandia can finally end. Thank you, explorer.";

export function adaLine(s: Progress): string {
  return STAGES.find(([flag]) => !s[flag])?.[1] ?? DONE;
}
