# Sunbaked Desert — design

A fifth screen of the world, west of the Dense Forest. Pure exploration: no chest, no puzzle, no badge (still 11 badges), no stat or database change.

## Behaviour

- **Reaching it.** The forest's west edge opens (rows 62–78, like every other exit); walking off it lands you on the desert's east edge, same row. The desert's east edge (rows 62–78) leads back. `ZoneId` gains `"desert"`; log line "Entered the Sunbaked Desert." No heat damage.
- **Places** (all inspect cards, no actions beyond a card): `nomad` "Nomad" (a hint NPC like the ranger/hermit: points to the forest signpost, the oasis and the pyramid; its line never changes), `oasis` "Oasis" (inspect card), `desert-pyramid` "Pyramid" (ruins story card), `desert-signpost` "Signpost" (points back east to the Dense Forest and lists the places). Verbs: "Talk to Nomad", "Read Signpost".
- **Look.** Golden dunes (new terrain kind `dune`, its own texture; not `sand`, which is Foggaten's shore), cacti, dry bushes, rocks, a few palms, an oasis pond with a small footbridge, a pyramid. Normal day/night tint, no snow, no fog of war.
- **Motion.** Heat shimmer and slow blowing sand; a tumbleweed rolls across and a lizard sits on a rock. Decoration only. Under reduced motion everything is still.
- **Chrome.** Caption "(Sunbaked Desert Biome)"; landmark buttons and captions like the other zones; an exit sign east to the forest and one west of the forest; the mini-map shows five zones (cells shrink to fit the 194 px box).
- **Team.** Teammates standing in the desert show on the map, `/where` names it, the mini-map and crossing logic treat it like any zone. `/ping nomad|oasis|pyramid` works (new ping places; the desert signpost is not pingable). A client that does not know `"desert"` reads a position as "elsewhere" (null) and drops a ping, exactly as it does for any unknown zone.

## Out of scope

Heat/thirst mechanics, a chest or badge, sailing, new sounds.

## Tests

Every list that enumerates zones or places (zones, areas, mapLayout, MiniMap, terrain, places, commands, team, scene) gains the desert. Layout tests keep places, props and captions from overlapping and keep every place reachable from the east exit.
