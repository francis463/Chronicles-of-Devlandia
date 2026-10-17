# Sunbaked Desert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Add a Sunbaked Desert zone west of the Dense Forest.

**Architecture:** One more `ZoneId` with its `Zone` entry, `Area` and scene branch, following the Dense Forest's pattern. A new `dune` terrain kind keeps cacti off Foggaten's sand.

**Tech Stack:** Vite/React/TS strict/Tailwind/Vitest.

**Spec:** docs/superpowers/specs/2026-10-17-sunbaked-desert-design.md

## Global Constraints

- 11 badges, no stat/DB change; strict TypeScript; `npx tsc -b`, `npx vitest run`, `npm run build` stay green.
- Reuse existing helpers (`outlined`, `spriteBox`, `props(zone)`, `useReducedMotion`); match surrounding style.

## Review Focus

- Older clients: unknown zone in `pos`/`presence` → null, in `ping` → dropped.
- Walking off the desert east edge and the forest west edge outside rows 62–78 is blocked as before.
- Every desert place reachable from the east exit; no place overlaps a prop, pond or pyramid.
- Reduced motion: shimmer, drift, tumbleweed, lizard all still.
- Mini-map: five cells fit, current/teammate markers on the right cell.

### Task 1: Zone, exits, places, cards, verbs
**Files:** `src/game/{zones,constants,types,cards,reducer,geometry}.ts` + their tests.
**Produces:** `ZoneId` includes `"desert"`; `ZONES.desert`; `NOMAD, OASIS, DESERT_PYRAMID, DESERT_SIGNPOST: Poi` in constants; `LOG.enteredDesert`; forest exit `{edge:"west",min:62,max:78,to:"desert"}`; desert exit east → forest; PoiIds `nomad|oasis|desert-pyramid|desert-signpost`.
- [ ] Failing tests: zones keys now include desert; forest west / desert east exits and `arrival`; stepping off the edges in and outside the span; inspect cards for the four places (nomad line constant, signpost mentions "Dense Forest"); verbs "Talk to Nomad"/"Read Signpost"; `inspect` of each sets `inspected`; nomad logs once like the ranger.
- [ ] Implement; run `npx vitest run src/game` and `npx tsc -b`.
- [ ] Commit.

### Task 2: Team and chat
**Files:** `src/game/team.ts`, `src/chat/{places,commands}.ts` + tests.
- [ ] Failing tests: `parseZone("desert")`, strict ping zone accepts desert, pos from desert parsed; `PING_PLACE_NAMES` gains `nomad`, `oasis`, `pyramid` with spots/copy ("the Oasis"); `/ping nomad` effect; unknown-place help lists them with the landmarks.
- [ ] Implement (`DESERT_PLACES` list alongside FOREST/ISLAND_PLACES); run `npx vitest run src/game src/chat`; commit.

### Task 3: Sprites and `dune` terrain
**Files:** `src/render/{sprites,terrain}.ts`, `src/render/areas/area.ts`, tests.
**Produces:** `TerrainKind` gains `"dune"`; sprites `CACTUS, PALM, DRY_BUSH, OASIS_POND, FOOTBRIDGE, DESERT_PYRAMID_SPRITE, TUMBLEWEED, LIZARD` (names as the file's convention); `dune` texture + mini-map colour; decoration options for dune (cacti, dry bushes, rocks; no pines/flowers).
- [ ] Failing tests: sprite dimensions/outline rules like the existing sprite tests; `dune` decorations contain only desert kinds and none on `sand`; deterministic.
- [ ] Implement; run `npx vitest run src/render`; commit.

### Task 4: Desert area and the forest's west gap
**Files:** `src/render/areas/{desert,forest,index}.ts`, tests.
**Produces:** `DESERT: Area` in `AREAS.desert`; forest `MOUTH` west {x:0,y:112,w:32,h:32}, corridor {x:-1000,y:112,w:1000,h:32}, west path; desert east mouth/corridor mirroring it; paths linking all four places.
- [ ] Failing tests (areas.test pattern): all four places on walkable ground, not in props/pond/pyramid; paths connect the east mouth to each place; protected rects; forest west mouth open.
- [ ] Implement; `npx vitest run src/render`; commit.

### Task 5: Scene, effects, map chrome
**Files:** `src/render/scene.ts`, `src/screens/overworld/{mapLayout,MapViewport,MiniMap,Overworld}.ts(x)`, tests.
- [ ] Failing tests: scene for desert has props, pond, pyramid, shimmer/drift when motion allowed and none when reduced; tumbleweed/lizard present; no snow/fog; caption "(Sunbaked Desert Biome)"; landmark buttons and captions without overlaps (mapLayout GROUPS/MAP_TEXTS); `EXIT_SIGNS` for desert and forest west; MiniMap renders five cells inside 194 px with current marker and teammates on the desert cell.
- [ ] Implement; run full `npx vitest run`; commit.

### Task 6: Docs and browser check
- [ ] README mentions the desert; `npm run build`; Playwright check at 1366×657 and 390×844: walk forest→desert→back, open each place card, screenshot desert; commit.
