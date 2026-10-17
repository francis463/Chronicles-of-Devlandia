# Sunny Beach — design

A sixth screen of the world, east of the Dense Forest. Pure exploration like the desert: no chest, puzzle or badge (still 11 badges), no stat or database change.

## Behaviour

- **Reaching it.** The forest's east edge opens (rows 62–78); walking off it lands you on the beach's west edge, same row. The beach's west edge leads back. `ZoneId` gains `"beach"`; log "Entered Sunny Beach." No damage.
- **Places** (inspect cards only): `fisher` "Fisher" (hint NPC, line never changes), `beach-pier` "Pier", `shipwreck` "Shipwreck" (story card), `beach-signpost` "Signpost" (points back west to the Dense Forest). Verbs: "Talk to Fisher", "Read Signpost".
- **Look.** Pale sand (new terrain kind `beach`, own texture), the sea beyond the east and north edges of the walkable area (you cannot walk into it), palms, rocks along the edge, a pier running into the sea, a shipwreck, a beached boat, two umbrellas, a sandcastle, shells.
- **Motion** (decoration; all still under reduced motion): foam washing in and out along the shore, sun glints on the sea, gulls crossing the sky (the existing bird drawing), a crab scuttling along the sand.
- **Chrome.** Caption "(Sunny Beach Biome)"; exit signs "Beach →" on the forest and "← Forest" on the beach; the mini-map has six cells (32 px wide in the 194 px box).
- **Team.** Zone parsing, `/where`, pings: `/ping fisher|jetty|shipwreck` (`pier` is already Foggaten's dock; the signpost is not pingable). Older clients read an unknown zone as null / drop the ping.

## Out of scope
Water mechanics, boats you can use, chests, sounds.
