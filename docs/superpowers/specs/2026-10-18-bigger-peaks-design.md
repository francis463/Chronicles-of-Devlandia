# Bigger Peaks: design

The C++ Peaks grows from one screen to 2 × 2 screens (640 × 360 art pixels), like the Dense Forest, Sunbaked Desert and Sunny Beach.

## What the player gets
- The Peaks is twice as wide and tall. The camera follows the player, `−` all the way out shows the "Whole map", and the mini-map shows the whole area with the camera window.
- Everything keeps its game position (percent of the area), so saves, teams and exits do not change. Landmarks are about twice as far apart.
- Walking speed and reach stay the same in art pixels (`stepFor`, `reachFor` already do this).
- The new space is filled with snowy scenery (pine groves, drifts, boulders, ice spikes) from the existing decoration generator, plus a few hand-placed props along the paths.
- Two hidden spots, in the far corners of the new part, with C++ cards (Frozen Pointer Stone, Buried Ski Hut), like the other areas.

## Design
- `ZONE_SCALE.peaks = 2`. Everything authored in art pixels in `areas/peaks.ts` is spread by K = 2 with `up`/`upRect` (positions, extents along the map; thicknesses such as path width and sprite sizes stay). Place-derived art uses `zoneToArt(place, "peaks")`.
- River/ice: the cold zone is the river's game zone in art pixels (`ICE_RECT` and `BRIDGE_RECT` scale with it, so what looks like ice is exactly what hurts).
- The north wall: `WALL_RECT` becomes per-zone: ten rows ending just above the wall's game line (`WALL_Y`, 49 %), runs the full width; the gate box and the 16 px tiles are as before.
- Shore, dock, mountains band (top 16 rows), waterfall, caves, hedge, exits and corridors scale like the forest's mouths.
- Effects that assumed one screen (aurora, ice glints, gusts, camp light, start arrow, lights) are placed in the zone's world or tiled over it.
- Hidden spots: `secret-pointer` and `secret-hut`; tracked in the existing `secrets` list; the Codex count becomes `n/8`.

## Out of scope
New quests, chests, badges or NPCs; enlarging the village or Foggaten.

## Risks
- A hand-authored art coordinate left unscaled shows as a mis-placed prop or an unfair river. The existing exhaustive collision tests, the `WORLD` guard test and new "art matches game" tests cover this, plus browser checks of river, wall, gate, exits and the lodge door.
- The early quest is longer (landmarks twice as far apart); checked by walking it in the browser.
