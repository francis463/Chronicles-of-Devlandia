# Character classes: design

**Date:** 2026-10-17 · **Status:** awaiting the owner's review of this written spec

## Goal

Before a game starts, the player picks a character class: Warrior, Archer, Mage, Assassin, Tank or Healer. Their hero is drawn in that class, and teammates see it. Classes are a **look only**: they change no stat, speed, puzzle, hint or damage.

## Decisions already made with the owner

| Question | Decision |
|---|---|
| What a class does | Look only. The game has no combat, so no abilities or stats are added |
| Where it is picked | A **Choose your class** screen before every game: after Solo Quest, and after Team Lobby |
| Remembered? | Signed-in players: the last choice is saved and preselected. Guests: start on Warrior, nothing saved |
| Roster | Six: Warrior, Archer, Mage, Assassin, Tank, Healer |
| Teams | Everyone sees everyone's class. Two players may pick the same class |
| Art | Shared explorer body, a per-class outfit colour and a small per-class item (approach B) |

Out of scope: stats, abilities, combat, one-class-per-team rules, changing class mid-game, class-based leaderboards.

## What the player sees

1. **Flow.** Menu → *Solo Quest* → **Choose your class** → game. Menu → *Team Lobby* → **Choose your class** → the lobby (nickname, create or join). Back from the picker returns to the menu.
2. **The picker.** Six cards in a 3 × 2 grid (one column on a phone). Each card shows the class's sprite (facing down), its name and a one-line blurb. One card is selected: the player's saved class, or Warrior. Buttons: `[ Start ]` (Solo) or `[ Continue ]` (Team), and `[ Back ]`. It is a radio group: arrow keys move the selection, Enter continues, and the selected card has a visible focus ring.
3. **In the game.** The hero is drawn as the chosen class on the map and in the main-menu backdrop. The HUD shows `Class: Mage`. A downed hero is still drawn grey, as now.
4. **In a team.** Each teammate is drawn in their own class, still in their own team hood colour so two players of the same class can be told apart. The lobby roster shows the class name beside each nickname.

| Class | Outfit | Item | Blurb |
|---|---|---|---|
| Warrior | steel and red | helm with crest | "Steel and nerve." |
| Archer | forest green | bow on the back | "Sharp eyes, steady hands." |
| Mage | deep blue | pointed hat | "Reads the code between the lines." |
| Assassin | charcoal | face mask | "Quiet feet, quick fixes." |
| Tank | iron grey and gold | round shield | "Nothing gets past the wall." |
| Healer | white and gold | staff | "Mends bugs and spirits." |

(The blurbs are flavour text only; they promise no ability.)

## Model

- `src/game/classes.ts` (pure): `CLASS_IDS = ["warrior","archer","mage","assassin","tank","healer"]`, `type ClassId`, `DEFAULT_CLASS = "warrior"`, `isClassId(v: unknown): v is ClassId`, `classOrDefault(v: unknown): ClassId` (anything that is not one of the six becomes the default), and `CLASSES: Record<ClassId, { name: string; blurb: string; outfit: string; trim: string }>`.
- `GameState` is **not** changed: the class is cosmetic session data held by `App`, never part of the reducer, so saves, the team's shared flags and every existing reducer test are untouched.

## Drawing (approach B)

- `src/render/sprites.ts` gains a class layer: for each class and each facing (`down`, `up`, `right`; `left` is the mirrored `right`) a small pixel grid, the same size as the explorer, holding only the class item (helm, bow, hat, mask, shield, staff). Class outfit colours recolour the explorer body palette keys; the **hood keys stay the player's team colour**, so identity by colour is kept.
- `explorerPalette(hood)` becomes `explorerPalette(hood, cls)`. The scene's explorer `variant` string, which is the sprite-cache key, becomes `"<hood>"` for the old look and `"<hood>:<class>"` otherwise, so every class and colour caches separately. The painter draws the base explorer, then the class item on top, in one cache entry.
- `SceneInput` gains `playerClass: ClassId`; the teammate shape (`Teammate`) gains `cls: ClassId`. `MenuBackdrop` passes the default class.
- The mini-map, labels, chat and pings do not change.

## Team sync

- `PresenceMeta` gains an optional `cls` field. It is tracked once, at join, because the class cannot change in a game.
- On receipt, `cls` goes through `classOrDefault`, so a teammate on an older client, a missing field, or any unknown or hostile value is drawn as Warrior and never breaks the scene.
- `TeamSession.create(name, mode, cls)` and `join(name, code, mode, cls)` take the class; `Teammate` and the roster expose it.

## Saving (signed-in players only)

- The class is stored in the account's own profile data (`supabase.auth.updateUser({ data: { class } })`, read back from `user.user_metadata.class`). **No database migration, no policy and no Edge Function change**, so nothing needs the owner's Supabase approval.
- `AuthClient` gains `setClass(cls: ClassId): Promise<Result>`; `Account` gains `playerClass: ClassId | null` (validated on read with `isClassId`, else `null`). The memory fake mirrors both.
- On Start/Continue, `App` keeps the choice locally for the game and, if signed in, calls `setClass` without waiting. A failed save is ignored: the game uses the local choice and nothing is shown (it is cosmetic). The picker is preselected from `account.playerClass ?? DEFAULT_CLASS`.
- Guests never call `setClass`. A reload returns them to Warrior.

## Code shape

| File | Change |
|---|---|
| `src/game/classes.ts` (+test) | new: ids, names, blurbs, validators |
| `src/render/sprites.ts`, `paint.ts`, `scene.ts` | class layer, palette, variant key, `playerClass`, teammate `cls` |
| `src/screens/ClassPicker.tsx` (+test) | new screen |
| `src/App.tsx` | `Screen` gains `"class"`; remembers `chosenClass` and where to go next |
| `src/game/team.ts`, `src/hooks/useTeamSession.ts` | `cls` in presence, create/join, `Teammate` |
| `src/screens/TeamLobby.tsx`, `src/screens/overworld/TopHud.tsx` | class name in roster and HUD |
| `src/auth/authClient.ts`, `supabaseAuth.ts`, `memoryAuth.ts`, `useAuth.ts` | `setClass`, `Account.playerClass` |
| `README.md` | one short section |

## Edge cases

- Saved or sent class is unknown, missing or malformed: default (Warrior); never throws.
- Offline or `setClass` fails: the local choice still applies this session.
- A signed-in player picks a new class: the next login preselects it.
- Back from the picker returns to the menu without starting anything.
- Team of four with duplicate classes: all four are drawn in their class and are told apart by hood colour.
- A downed hero is drawn grey whatever the class.
- Touch: the cards are at least 44 px tall and need no keyboard.

## Testing

- **Unit:** `classes.ts` (six ids, default, `classOrDefault` on `undefined`, `null`, numbers, `"__proto__"`, an unknown string); the picker (renders six, preselects the saved class, arrow keys, Enter, Back, Start/Continue labels, radio roles); `setClass` and `playerClass` in the memory and Supabase auth tests; `App` flow for Solo and Team and for guest versus signed-in preselection; presence round-trip with a class, with none, and with garbage.
- **Render:** every class draws a different pixel image in every facing; the hood keys keep the team colour; two classes with the same hood differ; the downed grey ignores the class; the sprite cache keys do not collide.
- **Browser (1366 × 657 and 390 × 844):** pick each class and see it on the map; no horizontal scroll; no console errors; a two-player team shows both classes.

## Review focus

1. A bad class value from a teammate or from stored profile data must never crash the scene or the lobby.
2. Classes must change no gameplay: the existing reducer and game tests pass unchanged.
3. Two same-class teammates must stay distinguishable.
4. The picker must never trap a player: Back is always available, and a failed save never blocks starting.
5. No secret, key or database change is introduced.
