import { ARCHIVE } from "../game/constants";
import { stepFor } from "../game/zoneSize";
import { distance } from "../game/geometry";
import type { GameState, Point } from "../game/types";
import { ZONES, type ZoneId } from "../game/zones";
import { CHESTS, chestById, type Chest } from "./chests";
import type { Challenge, ChestId } from "./types";

/** The Codex's pure side: how chests group by zone, what to do next, the story steps and the practice questions. */

/** The zones that hold chests, in world order. */
export const ZONE_ORDER: readonly ZoneId[] = ["lodge", "peaks", "village", "forest", "desert", "beach", "foggaten"];

export type CodexGroup = { zone: ZoneId; name: string; chests: Chest[]; earned: number };
export type CodexFilter = "all" | "earned" | "todo";

export function groupChests(badges: readonly ChestId[]): CodexGroup[] {
  return ZONE_ORDER.flatMap((zone) => {
    const chests = CHESTS.filter((c) => c.zone === zone);
    return chests.length ? [{ zone, name: ZONES[zone].name, chests, earned: chests.filter((c) => badges.includes(c.id)).length }] : [];
  });
}

/** The groups limited to earned or still-to-find chests (empty zones drop out); `all` returns them as they are. */
export function filterGroups(groups: CodexGroup[], filter: CodexFilter, badges: readonly ChestId[]): CodexGroup[] {
  if (filter === "all") return groups;
  return groups.flatMap((g) => {
    const chests = g.chests.filter((c) => badges.includes(c.id) === (filter === "earned"));
    return chests.length ? [{ ...g, chests }] : [];
  });
}

/** Where a chest stands: the C# chest is in the Archive. */
const spotOf = (c: Chest): Point => c.at ?? ARCHIVE;
const hostOf = (c: Chest): string => c.host ?? "Archive";

/** "Next closest: Hut, 3 steps away." in your zone; "Next: Ski Lodge in C++ Peaks." elsewhere; a cheer when all are earned. */
export function nextHint({ badges, zone, player }: { badges: readonly ChestId[]; zone: ZoneId; player: Point }): string {
  const left = CHESTS.filter((c) => !badges.includes(c.id));
  if (left.length === 0) return `All ${CHESTS.length} badges earned. Well done, explorer!`;
  // The lodge is a room in the Peaks: from outside, its chest is as near as the lodge's door.
  const here = left.filter((c) => c.zone === zone || (zone === "peaks" && c.zone === "lodge"));
  if (here.length) {
    const nearest = here.map((c) => ({ c, d: distance(player, c.zone === zone ? spotOf(c) : ZONES.peaks.doors[0].at) })).reduce((a, b) => (b.d < a.d ? b : a));
    const steps = Math.ceil(nearest.d / stepFor(zone));
    return `Next closest: ${hostOf(nearest.c)}, ${steps} ${steps === 1 ? "step" : "steps"} away.`;
  }
  const first = ZONE_ORDER.flatMap((z) => left.filter((c) => c.zone === z))[0];
  return `Next: ${hostOf(first)} in ${ZONES[first.zone].name}.`;
}

const WITH_THE: Partial<Record<ZoneId, string>> = { forest: "the ", desert: "the ", beach: "the " };
const ROUTE: Partial<Record<ZoneId, string>> = {
  village: ", west of the Peaks",
  forest: ", south of the Peaks",
  desert: ", west of the Dense Forest",
  beach: ", east of the Dense Forest",
  foggaten: ": take the boat from the Peaks' east dock",
  lodge: ": walk into the lodge door in the C++ Peaks",
};
const CHEST_ROUTE: Partial<Record<ChestId, string>> = {
  "chest-css": ", north of the wall: the gate must be open first",
  "chest-cs": ": its keypad needs the Syntax Terminal's access code",
};

/** The log line "Go there" writes: which landmark, in which zone, and what it takes to get there. */
export function goToNote(id: ChestId): string {
  const c = chestById(id);
  const route = CHEST_ROUTE[id] ?? ROUTE[c.zone] ?? "";
  return `Head to the ${hostOf(c)} in ${WITH_THE[c.zone] ?? ""}${ZONES[c.zone].name}${route}.`;
}

/** Where "Go there" rings: the chest's landmark. */
export const goToSpot = (id: ChestId, from?: ZoneId): { zone: ZoneId; x: number; y: number } => {
  const c = chestById(id);
  // From outside the lodge, the ring marks its door on the Peaks map.
  if (c.zone === "lodge" && from !== undefined && from !== "lodge") return { zone: "peaks", ...ZONES.peaks.doors[0].at };
  return { zone: c.zone, ...spotOf(c) };
};

export type QuestProgress = Pick<GameState, "gateUnlocked" | "questComplete" | "hasLoot" | "clueDecoded" | "artifactFound" | "towerPowered" | "lighthouseLit" | "archiveOpen">;
export type Quest = { id: keyof QuestProgress; label: string; hint: string; done: (p: QuestProgress) => boolean };

/** The story steps that are not chests, with a line on where to look while they are open. */
export const QUESTS: readonly Quest[] = [
  { id: "gateUnlocked", label: "North gate", hint: "The Peaks' north wall: solve the terminal at the gate.", done: (p) => p.gateUnlocked },
  { id: "questComplete", label: "Frozen river", hint: "North of the wall: walk out onto the ice and survey it.", done: (p) => p.questComplete },
  { id: "towerPowered", label: "Signal tower", hint: "North-west of the Peaks: solve its logic lock to light the beam.", done: (p) => p.towerPowered },
  { id: "hasLoot", label: "Supply Cache", hint: "Hidden in the Hollow Tree: the Dense Forest, north-east, south of the Peaks.", done: (p) => p.hasLoot },
  { id: "clueDecoded", label: "Scroll", hint: "Decode it from your inventory: every letter is shifted 13 places.", done: (p) => p.clueDecoded },
  { id: "artifactFound", label: "Golden Semicolon", hint: "Foggaten Island, south-east corner: take the boat from the Peaks' east dock.", done: (p) => p.artifactFound },
  { id: "lighthouseLit", label: "Lighthouse lamp", hint: "Foggaten Island: the terminal by the lighthouse door wants the letter H in binary.", done: (p) => p.lighthouseLit },
  { id: "archiveOpen", label: "Archive", hint: "Dev Village: the Syntax Terminal prints the keypad's access code.", done: (p) => p.archiveOpen },
];

/** A short tag and colours for each language's row. */
export const LANG_TAGS: Record<string, { tag: string; bg: string; fg: string }> = {
  HTML: { tag: "HTML", bg: "#e44d26", fg: "#ffffff" },
  CSS: { tag: "CSS", bg: "#2965f1", fg: "#ffffff" },
  PHP: { tag: "PHP", bg: "#777bb3", fg: "#0b1020" },
  Python: { tag: "PY", bg: "#3776ab", fg: "#ffffff" },
  Java: { tag: "JAVA", bg: "#f89820", fg: "#0b1020" },
  "C#": { tag: "C#", bg: "#68217a", fg: "#ffffff" },
  SQL: { tag: "SQL", bg: "#00758f", fg: "#ffffff" },
  "C++": { tag: "C++", bg: "#00599c", fg: "#ffffff" },
  JavaScript: { tag: "JS", bg: "#f7df1e", fg: "#0b1020" },
};

/** Practice: the question `step` places after the one you were asked, wrapping round the chest's bank. Changes nothing in the game. */
export function practiceQuestion(id: ChestId, pickedIndex: number, step: number): Challenge {
  const { bank } = chestById(id);
  return bank[(pickedIndex + 1 + step) % bank.length];
}
