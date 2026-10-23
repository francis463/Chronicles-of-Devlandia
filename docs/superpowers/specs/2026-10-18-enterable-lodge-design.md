# Enterable Ski Lodge — design

The Ski Lodge in the C++ Peaks (where the HTML chest is today) becomes a building you walk into. Inside is a small room with the HTML chest, a lodge keeper to talk to, and a fireplace.

## What the player gets

- **A door on the lodge.** Walk into the door on the lodge's front wall and the room loads at once. Walk onto the door mat at the bottom of the room and you are back outside, standing in front of the door.
- **A cosy room**, one screen (320 × 180 art px), always lit: wood floor, log walls, bunks, a table, a rug, shelves and a fireplace whose glow flickers. No night tint, no snow, and the river's cold does not apply.
- **The HTML chest moves inside**, onto a shelf by the fireplace. Its questions, badge and Codex entry are unchanged.
- **A lodge keeper** (`E` to talk) who gives hints about the Peaks and the other zones, the way the ranger, nomad and fisher do.
- **Soup by the fire.** The keeper serves soup once per game: +2 hearts (`REMEDY_HEAL`) if you are hurt; at full health she says to come back when you are hurt and the soup is not used up (same rule as the healing finds).
- **Nothing else changes.** Eleven badges, the same HP rules, hard mode, team features and the saved-game format (apart from the new zone id being valid) all stay.

## Design

### 1. A seventh zone, `lodge`

- `ZoneId` gains `"lodge"`: name `Ski Lodge`, no wall, no gate, no river, no exits along its edges, `entered` log line `Entered the Ski Lodge.`.
- Every `Record<ZoneId, …>` gets an entry: `ZONES`, `AREAS`, `ZONE_SCALE` (1), the chest `ZONE` ordering, the Codex zone names, the caption lists in `mapLayout`.
- The mini-map keeps its six cells. While you are inside the lodge it highlights the **Peaks** cell and puts your dot on the lodge door's position there.

### 2. Doors

- `Zone` gains `doors: Door[]`, where `Door = { at: Point (percent); radius: number; to: ZoneId; arrive: Point (percent) }`. Only the Peaks (one door onto the lodge's front) and the lodge (one mat onto the Peaks, arriving just below the door) have any.
- The reducer's `move` checks doors after a step: if the new position is within the door's radius it changes zone to `to` and sets the player at `arrive` (and the drone beside them, as exits do), logging the new zone's `entered` line. A step through an ordinary exit works as before.
- You can only trigger a door by stepping onto it, never by being placed on it: arrival points are outside every door's radius, so entering never bounces you straight back.
- The Peaks door sits at the lodge's door position (the existing `lodge` sprite is drawn at art (62, 161); the door spot is its bottom-centre, one step in front). The door spot is part of the lodge's hit area/caption as the button "Enter Lodge".

### 3. The room

- New area `LODGE` (`src/render/areas/lodge.ts`): 320 × 180, floor texture `wood`, terrain kind `floor`, walls drawn as props along the top and sides (no hedge, no outer decoration, no corridors).
- New sprites: `fireplace` (2 frames, flickering), `bunk`, `table`, `rug`, `shelf`, `door-mat`; the keeper is an `explorer-down` with a lodge colour variant. All use the shared dark outline.
- Places: the keeper, the fireplace (inspect card), the HTML chest (hosted by the shelf, caption `Shelf`), the door mat.
- The scene has no tint and no snow in the lodge; the fireplace light is a warm glow drawn at all hours.
- The Peaks lodge sprite stays as the building; its caption `Lodge` now belongs to its door button.

### 4. Game rules

- `chest-html` moves to `zone: "lodge"` with a new `at`; its `host` becomes `Shelf`. The chest table's `Go there` note reads `Ski Lodge, C++ Peaks`.
- The keeper joins `ZONES.lodge.places` with id `lodge-keeper` (a `PoiId`), label `Keeper`, verb `Talk to Keeper`, and a hint line (`keeperLine(state)`) that names what the player has not done yet, in the style of `rangerLine`.
- Soup: `GameState.soupTaken: boolean` (default false, old saves read false). Interacting beside the keeper while `hp < MAX_HP` and `!soupTaken` heals `REMEDY_HEAL` and sets it; otherwise she only talks.
- Hard mode: the soup is not offered (as the healing finds are not).
- Team: `soupTaken` is personal. Teammates in the lodge appear through the normal zone sync; pings and `/where` accept the new zone; `/ping keeper` works like `/ping nomad`.
- Saved games: a save made in the lodge resumes in the lodge (the resume check only requires `zone in ZONES`).

## Out of scope

Other buildings (the village huts, the forest cabin), a second floor, furniture you can interact with beyond the fireplace card, sounds, and shopkeeper items.

## Risks and how they are handled

- **A missed `Record<ZoneId, …>`** fails type-checking, so `tsc` catches it; a test also asserts every zone has an area, a scale, a name and an `entered` line.
- **Bouncing through the door:** arrival points lie outside door radii (tested for both doors, and for every arrival after an exit).
- **Collisions and captions:** the existing exhaustive caption/hit-area/prop tests run over the new zone at both map sizes; furniture is placed to pass them.
- **Teammates crossing together:** a teammate who is in the lodge when you enter is drawn from their own zone data, not an animation from the Peaks (the jump rule that exists for zone changes covers it).
- **Old saves and old clients:** an old save has no `soupTaken` and reads `false`; a save made inside the lodge cannot be loaded by an older build, which is accepted (no version bump needed beyond the existing fill-in rule).
- **Hard mode and the zone-name list in the Codex** read the new zone through the same tables, covered by the zone-table test.

## Phases (each ships on its own and keeps the suite green)

1. **The zone and doors, with an empty room:** `lodge` zone, doors both ways, floor and walls, mini-map highlight, arrival rules.
2. **The room's art and the chest:** furniture sprites, fireplace glow, chest moved inside with its caption and Codex line.
3. **The keeper and the soup:** keeper hints, `soupTaken`, card and log lines, team and ping support, README and browser check.
