import { chestById, chestChallenge, CHESTS, type Chest } from "../learn/chests";
import { FOREST_DIRECTIONS, HIDDEN_ARTIFACT, INSPECT_COPY } from "./constants";
import type { GameState } from "./types";
import { rangerLine } from "./forest";
import { adaLine } from "./village";
import { hermitLine, ISLAND_COPY } from "./island";
import { ZONES } from "./zones";

export type Card = { title: string; text: string; y: number };

function chestText(s: GameState, chest: Chest): string {
  return s.badges.includes(chest.id)
    ? `${chest.badge} Badge earned. ${chestChallenge(s.picks, chest.id).explain}`
    : `A sealed code chest. Answer its ${chest.language} question to earn the ${chest.badge} Badge.`;
}

/** The inspection card for what you last inspected, with the place's y so the card never covers it. */
export function cardFor(s: GameState): Card | null {
  const place = [...ZONES[s.zone].places, HIDDEN_ARTIFACT].find((p) => p.id === s.inspected);
  if (!place) return null;
  const card = (title: string, text: string): Card => ({ title, text, y: place.y });

  const chest = CHESTS.find((c) => c.id === place.id) ?? (place.id === "archive" && s.archiveOpen ? chestById("chest-cs") : null);
  if (chest) return card(`${chest.badge} Chest`, chestText(s, chest));
  switch (place.id) {
    case "terminal":
      return card(
        place.label,
        s.matcherSolved
          ? `It prints the Archive's access code: ${s.accessCode}.`
          : "A village terminal running a Syntax Matcher. Solve it to print the Archive's access code.",
      );
    case "archive":
      return card(place.label, "The Archive's door is chained shut. Its keypad wants a 4-character access code.");
    case "villager":
      return card(place.label, adaLine(s));
    case "ranger":
      return card(place.label, rangerLine(s));
    case "hermit":
      return card(place.label, hermitLine(s));
    case "dock":
      return card(place.label, s.gateUnlocked ? ISLAND_COPY.dock.default : ISLAND_COPY.dock.locked);
    case "lighthouse":
      return card(place.label, s.lighthouseLit ? ISLAND_COPY.lighthouseLit : ISLAND_COPY.lighthouse);
    case "island-dock":
    case "island-fire":
    case "ruins":
      return card(place.label, ISLAND_COPY[place.id]);
    case "forest-signpost": {
      const lead = INSPECT_COPY["forest-signpost"].default;
      return card(place.label, `${lead} ${FOREST_DIRECTIONS}${s.clueDecoded ? " The scroll's clue: dig in the south-east corner." : ""}`);
    }
    case "campfire":
    case "old-oak":
    case "gate":
    case "chest":
    case "river":
    case "tower":
    case "signpost":
    case "artifact": {
      const copy = INSPECT_COPY[place.id];
      const text =
        (s.hasLoot && copy.looted) ||
        (s.gateUnlocked && copy.opened) ||
        (s.towerPowered && (copy.bridged ?? copy.powered)) ||
        copy.default;
      return card(place.label, text);
    }
    default:
      return null;
  }
}
