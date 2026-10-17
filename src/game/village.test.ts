import { describe, expect, it } from "vitest";
import { initialState } from "./reducer";
import { adaLine } from "./village";

describe("Ada", () => {
  it("adaLine gives the line of the first stage not done", () => {
    const steps: Array<[Partial<typeof initialState>, string]> = [
      [{}, "Heading north? The gate's terminal wants one CSS fix. Get the display right and the wall lets you through."],
      [{ gateUnlocked: true }, "The gate's open! The signal tower in the snowy north-west is dark. Power it and the bridge over the river comes back."],
      [{ towerPowered: true }, "The tower's beam is back and the bridge holds. Walk out onto the frozen river and survey it."],
      [{ questComplete: true }, "Explorers stash supplies in the cache in the north-east snow. Have a look inside."],
      [{ hasLoot: true }, "That scroll from the cache is scrambled. Decode it from your inventory: every letter is shifted."],
      [{ clueDecoded: true }, "Foggaten Island, you say? Take the boat from the Peaks' east dock and look for the X in the island's south-east corner."],
      [{ artifactFound: true }, "You found the Golden Semicolon! Every statement in Devlandia can finally end. Thank you, explorer."],
    ];
    let s = initialState;
    for (const [set, line] of steps) {
      s = { ...s, ...set };
      expect(adaLine(s), JSON.stringify(set)).toBe(line);
    }
  });
});
