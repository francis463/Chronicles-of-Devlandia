# Hall of Fame: the leaderboard as a place

Approved in chat on 2026-10-19 (the user chose "their own class hero" and "a round badge above the head").

## Goal

A new region, **Hall of Fame**, north of Dev Village. The top 10 of the leaderboard stand in it: the first three on a stage, the next seven on the ground. Each is drawn as their own class hero, with their profile picture in a round badge above the head and their name under the feet. It makes the leaderboard something you walk into, using the data that already exists.

## What the player sees

- **The way in.** Dev Village gets a north exit (an opening in its north hedge, beside the north road). It leads to the Hall; the Hall's south exit leads back. The world map (mini-map) shows the Hall as a cell above the village.
- **The Hall.** One screen (320 × 180 art px, scale 1). A plaza of paved floor inside a hedge. At the top, a raised stage with three podium blocks: 1st on the tallest block in the middle, 2nd on the left, 3rd on the right, with banners and a trophy. Below the stage, seven ground spots (ranks 4 to 10) in an arc, each on a paved tile with its number.
- **A figure.** The class hero (the same six looks as the game's explorer), a round picture badge above its head, the name under its feet. A player with no picture, or whose picture does not load, shows the first letter of the name in the badge. Players on the stage wear a gold, silver or bronze hood; the others a plain one.
- **Empty spots.** With fewer than 10 players, the unused spots show a faded outline and a "?" badge.
- **Reading a figure.** Walk up and press `E` (or tap its button) to get a log line: `Alice: rank 1, 3/11 badges, Mage.` Names are masked by the same rude-word filter as the leaderboard.
- **Loading.** The list is fetched when you enter the Hall (every entry). While it loads the spots are empty with a log line "The Hall is waking up…"; if it cannot be reached the log says "Can't reach the leaderboard." and the spots stay empty. Walking is never blocked.
- **Who.** Anyone: guests, signed-in players and teammates. Hidden players never appear (the server already leaves them out).
- **Ties.** Players who share a rank keep that rank number. The first three entries of the list stand on the stage and the next seven on the ground, so two players tied for 1st stand on the 1st and 2nd blocks and both show "1".

## Design

### Game layer
- `ZoneId` gains `"hall"`; `ZONE_SCALE.hall = 1`; `ZONES.hall`: no wall, gate or river, exit south to the village; the village gets `{ edge: "north", min, max, to: "hall" }` (columns chosen to match the village's north road). Names and copy for every table keyed by zone (`ZONE_NAMES`, the codex's zone order and "how to reach" text, the chat/ping place names, `LOG.enteredHall`).
- The ten spots are fixed places `hall-1` … `hall-10` (new `PoiId`s) at fixed positions, in `ZONES.hall.places`, plus a small signpost. Their text is not static: pressing `E` on a spot is handled in the overworld (it knows the fetched list) and adds a log line, so the reducer holds no leaderboard data.

### Data
- `Row` gains `cls?: ClassId`, read with `classOrDefault` (anything else, or a missing value, is the default Warrior). `parseRows` accepts the new field and still drops odd rows.
- `LeaderboardStore.top(rows?: number)`: the leaderboard screen keeps 20, the Hall asks for 10.
- A new hook `useHallOfFame(store, active)` loads when the zone becomes `hall`, returns `{ phase: "loading" | "ready" | "failed"; slots: (Row | null)[] }` of length 10, and ignores a late reply after you leave (like the leaderboard screen's "newest request wins").
- **Supabase (one new SQL step for the owner).** The class is stored in the account's private metadata (`auth.users.raw_user_meta_data`). `leaderboard_top` is a security-definer function, so it can return `left(raw_user_meta_data->>'class', 12) as cls` and nothing else of the metadata. Migration `20261019010000_leaderboard_class.sql` drops and recreates `leaderboard_top` with the extra column (the Supabase connector holds `DROP` statements for approval, so the owner pastes it into the SQL Editor, as for the photos). Until it runs the client still works: `cls` is missing, so everyone is a Warrior. The SQL test's column list gains `cls`.

### Render layer
- `src/render/areas/hall.ts` (an `Area`, like the village): paved floor terrain, a hedge, the stage and podium props, banners, lanterns, protected rects for every spot and the corridor from the south mouth. Exports `HALL_POINTS` (the ten spot positions) for the scene and the map layout.
- New sprites: `stage`, `podium` (three heights), `banner`, `trophy`, `paving-number tile`s are drawn as terrain; the faded empty outline is the hero sprite drawn at low opacity.
- The scene draws, per slot: the class hero (`explorerPalette` with the class, hood by rank), upright, sorted with the other uprights by feet. The picture badge and the name are DOM overlays in `MapViewport` (an `<img>` cannot be drawn into the canvas without cross-origin trouble), positioned from the same art points as the other captions and reduced to the same hit-area rules as the other places.
- Mini-map: a `hall` cell above the village (the box has 18 px free above the row); world-map overlay and the `MapViewport` caption `(Hall of Fame Biome)` follow the other zones.

### Tests
- zones: exits are mirrored; the Hall's places are reachable and do not collide with the stage or each other; every other zone-keyed table has the Hall.
- areas/mapLayout: the existing exhaustive collision and caption-overlap guards run over the Hall (the ten spots, badges and names do not overlap each other or the stage).
- leaderboard: `cls` parsing (valid, missing, wrong type, too long); `top(10)` asks the server for 10.
- `useHallOfFame`: loads on entry, fills ten slots in list order, tied ranks, fewer than 10, failure, late reply ignored.
- Overworld: `E` on a figure logs the right line; an empty spot says it is waiting for a player; the rude-word mask applies.
- SQL: `leaderboard.sql` (columns) and a check that `cls` is the class only.
- A browser check with screenshots of the Hall (full, with and without photos, phone width).

## Out of scope
Live updates while standing in the Hall; clicking a figure to open a profile; showing more than ten players; changing the leaderboard screen; podium animations beyond the existing light and weather; saving the Hall in team positions beyond the existing zone sync.

## Risks and rulings
- **Classes are player-editable metadata.** A player can set any string; the server cuts it to 12 characters and the client accepts only the six known classes.
- **Photos are public** (already decided for the leaderboard); the Hall shows them to anyone who walks in.
- **Rank ties on the stage.** Standing by list order, not rank, keeps ten fixed spots; the number shown is the true rank.
