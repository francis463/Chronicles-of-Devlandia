import { chestById, chestChallenge, CHESTS, type Chest } from "../learn/chests";
import { FOREST_DIRECTIONS, HIDDEN_ARTIFACT, INSPECT_COPY, SNOW_CAVE } from "./constants";
import type { GameState } from "./types";
import { BEACH_COPY, CASTLE_COPY, FISHER_LINE } from "./beach";
import { DESERT_COPY, nomadSays } from "./desert";
import { DESERT_LORE, JAR_CARD } from "./desertLore";
import { REMEDIES } from "./remedies";
import { LODGE_CARDS, keeperSays } from "./lodge";
import { SECRETS, SECRET_CARD } from "./secrets";
import { rangerSays } from "./forest";
import { FOREST_LORE, MUSHROOM_CARD } from "./forestLore";
import { adaLine } from "./village";
import { CAVE_TEXT, signpostText, stationText } from "./camp";
import { hermitLine, ISLAND_COPY } from "./island";
import { ZONES } from "./zones";

export type Card = { title: string; text: string; y: number };

function chestText(s: GameState, chest: Chest): string {
  return s.badges.includes(chest.id)
    ? `${chest.badge} Badge earned. ${chestChallenge(s.picks, chest.id).explain}`
    : `A sealed code chest${chest.host ? ` is hidden in the ${chest.host.toLowerCase()}` : ""}. Answer its ${chest.language} question to earn the ${chest.badge} Badge.`;
}

/** The inspection card for what you last inspected, with the place's y so the card never covers it. */
export function cardFor(s: GameState): Card | null {
  const place = [...ZONES[s.zone].places, HIDDEN_ARTIFACT, SNOW_CAVE].find((p) => p.id === s.inspected);
  if (!place) return null;
  const card = (title: string, text: string): Card => ({ title, text, y: place.y });

  const chest = CHESTS.find((c) => c.id === place.id) ?? (place.id === "archive" && s.archiveOpen ? chestById("chest-cs") : null);
  if (chest) return card(chest.host ? place.label : `${chest.badge} Chest`, chestText(s, chest));
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
      return card(place.label, rangerSays(s));
    case "hunter-cabin":
    case "forest-well":
    case "forest-brook":
    case "fairy-ring":
    case "hollow-tree":
      return card(place.label, FOREST_LORE.find((l) => l.id === place.id)!.text);
    case "mushroom-1":
    case "mushroom-2":
    case "mushroom-3":
      return card(place.label, s.mushrooms.includes(place.id) ? MUSHROOM_CARD.picked : MUSHROOM_CARD.far);
    case "caravan-camp":
    case "desert-well":
    case "temple-door":
    case "dry-riverbed":
    case "obelisk":
      return card(place.label, DESERT_LORE.find((l) => l.id === place.id)!.text);
    case "jar-1":
    case "jar-2":
    case "jar-3":
      return card(place.label, s.jars.includes(place.id) ? JAR_CARD.picked : JAR_CARD.far);
    case "remedy-herb":
    case "remedy-fruit":
    case "remedy-drink": {
      const remedy = REMEDIES.find((r) => r.id === place.id)!;
      return card(place.label, s.remedies.includes(place.id) ? remedy.picked : remedy.far);
    }
    case "secret-moss":
    case "secret-den":
    case "secret-cave":
    case "secret-ridge":
    case "secret-pool":
    case "secret-bottle": {
      const secret = SECRETS.find((x) => x.id === place.id)!;
      return card(place.label, s.secrets.includes(place.id) ? `${secret.text} ${SECRET_CARD.found}` : secret.text);
    }
    case "lodge-book":
      return card(place.label, LODGE_CARDS.book);
    case "lodge-keeper":
      return card(place.label, keeperSays(s));
    case "lodge-door":
      return card(place.label, LODGE_CARDS.door);
    case "lodge-fireplace":
      return card(place.label, LODGE_CARDS.fireplace);
    case "sandcastle":
      return card(place.label, s.sandcastleBuilt ? CASTLE_COPY.built : CASTLE_COPY.unbuilt);
    case "fisher":
      return card(place.label, FISHER_LINE);
    case "beach-signpost":
      return card(place.label, BEACH_COPY[place.id]);
    case "nomad":
      return card(place.label, nomadSays(s));
    case "desert-signpost":
      return card(place.label, DESERT_COPY[place.id]);
    case "hermit":
      return card(place.label, hermitLine(s));
    case "dock":
      return card(place.label, s.gateUnlocked ? ISLAND_COPY.dock.default : ISLAND_COPY.dock.locked);
    case "lighthouse":
      return card(place.label, s.lighthouseLit ? ISLAND_COPY.lighthouseLit : ISLAND_COPY.lighthouse);
    case "island-dock":
    case "island-fire":
      return card(place.label, ISLAND_COPY[place.id]);
    case "peaks-signpost":
      return card(place.label, signpostText(s));
    case "weather-station":
      return card(place.label, stationText(s));
    case "snow-cave":
      return card(place.label, CAVE_TEXT);
    case "forest-signpost": {
      const lead = INSPECT_COPY["forest-signpost"].default;
      return card(place.label, `${lead} ${FOREST_DIRECTIONS}${s.clueDecoded ? " The scroll's clue points across the sea, to Foggaten Island." : ""}`);
    }
    case "campfire":
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
