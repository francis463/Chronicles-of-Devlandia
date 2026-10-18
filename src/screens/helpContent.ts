/** The Help dialog's words: controls, how to play, a step-by-step tutorial and tips. Plain text, so a test can read it. */

export type HelpTab = "controls" | "play" | "tutorial" | "tips";
export const HELP_TABS: ReadonlyArray<{ id: HelpTab; label: string }> = [
  { id: "controls", label: "Controls" },
  { id: "play", label: "How to play" },
  { id: "tutorial", label: "Tutorial" },
  { id: "tips", label: "Tips" },
];

/** Keys on a keyboard, and what the same things are on a touch screen. */
export const CONTROLS: ReadonlyArray<{ keys: string; touch: string; does: string }> = [
  { keys: "W A S D or the arrow keys", touch: "the D-pad", does: "Move your explorer" },
  { keys: "E", touch: "the [E] button, or tap a landmark", does: "Use the place you are next to (talk, read, search, open)" },
  { keys: "C", touch: "[C] Codex", does: "Open or close the Codex: your badges, the story and a study sheet" },
  { keys: "?", touch: "[?] Help", does: "Open or close this help" },
  { keys: "/ or Enter", touch: "the chat box", does: "Type a team chat message or a command such as /where or /ping" },
  { keys: "Esc", touch: "[X] CLOSE", does: "Close the window that is open" },
];

export const PLAY: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: "Your goal",
    text: "Earn all 11 language badges and find the Golden Semicolon. Each badge comes from a code chest that asks one question in a programming language. Answer it right and the badge is yours for good.",
  },
  {
    title: "Where the chests are",
    text: "There are no chests lying on the ground: each one is inside a landmark, and the landmark is the chest. Walk into the Ski Lodge door and up to its shelf, or to the windmill, the old oak or the pyramid, and press E. The Codex lists all 11 and has a [ Go there ] button for each.",
  },
  {
    title: "The world",
    text: "C++ Peaks is where you start. Dev Village is west of it, the Dense Forest south, the Sunbaked Desert west of the forest and Sunny Beach east of the forest. Foggaten Island is across the sea: take the boat from the Peaks' east dock once the north gate is open. Walk off an edge through a gap in the hedge to cross; the sign by the gap names where it leads.",
  },
  {
    title: "The story",
    text: "Open the north gate by fixing its terminal. Power the signal tower, survey the frozen river, and empty the Supply Cache in the north-east. Decode the scroll in your inventory, then follow its clue to the island and dig where the X is. In the village, the Syntax Terminal prints the code that unseals the Archive, and the lighthouse on the island has a lamp that needs the letter H in binary.",
  },
  {
    title: "Staying safe",
    text: "Only the frozen river hurts you: its cold drains HP until the signal tower's beam brings the bridge back. If your HP runs out you wake up inside the Ski Lodge.",
  },
];

export const TUTORIAL: ReadonlyArray<{ title: string; text: string; tryIt: string }> = [
  { title: "Move around", text: "Walk with W A S D or the arrow keys, or the D-pad on a phone. The map is one screen per region; the small map at the top left shows where you are.", tryIt: "Walk a few steps toward the ski lodge at the bottom left; its door is on the bottom row." },
  { title: "Use a place", text: "Stand next to a landmark and a prompt appears over your head, such as \"[E] Talk to Keeper\". Press E (or tap the landmark) to use it.", tryIt: "Walk into the Ski Lodge door, then press E next to the keeper." },
  { title: "Answer a chest", text: "A chest shows a code snippet with a gap. Type the missing piece (or pick blocks), and the line under it says whether it is valid. Press SUBMIT. Stuck? The drone's hint button helps, and a wrong answer costs nothing.", tryIt: "Answer the HTML question to earn your first badge." },
  { title: "Check your Codex", text: "Press C. The bar shows your badges, \"Next closest\" names a chest to try, and [ Go there ] writes in the log where any chest is and how to reach it.", tryIt: "Open the Codex and press [ Go there ] on a badge you have not earned." },
  { title: "Follow the story", text: "The Story list in the Codex ticks off the gate, the tower, the cache, the scroll, the Golden Semicolon, the lighthouse and the Archive, and says where to look for what is left.", tryIt: "Open the north gate: it is the grey gate in the wall across the Peaks." },
  { title: "Play with a team", text: "In a team game your friends appear on the map and mini-map. Type /ping to mark a spot, /where to see everyone, or just chat. Badges are personal: each explorer opens their own chests.", tryIt: "Press / and type /where." },
];

export const TIPS: readonly string[] = [
  "Every badge you earn stays reviewable: open it in the Codex to see the question, your answer and the explanation, and practise that language's other questions.",
  "The captions on the map show what each landmark is. A ✓ means you have its badge.",
  "Use /weather snow or /weather clear and /light day or /light night to change how your own map looks. Nobody else sees it.",
  "On a touch screen every button is at least 44 px tall, and the [E] button shows the name of the place you are next to.",
  "If your device is set to reduce motion, the map holds still: no gliding, drifting snow, sand or foam.",
  "You can leave any time with [=] Menu. Signed-in players keep their badges; guests start fresh.",
];
