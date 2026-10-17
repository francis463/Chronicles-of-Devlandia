# Sunny Beach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Add a Sunny Beach zone east of the Dense Forest.
**Architecture:** Same shape as the Sunbaked Desert: `ZoneId`, `ZONES.beach`, `AREAS.beach`, scene branch, map chrome; new terrain kind `beach`.
**Tech Stack:** Vite/React/TS strict/Vitest.
**Spec:** docs/superpowers/specs/2026-10-17-sunny-beach-design.md

## Global Constraints
- 11 badges, no stat/DB change; `npx tsc -b`, `npx vitest run`, `npm run build` green.

## Review Focus
- Older clients: unknown zone null/dropped. Forest east / beach west exits symmetrical (rows 62–78).
- Every beach place reachable, clear of props; ping name `jetty` not `pier`.
- Reduced motion: foam, glints, gulls, crab all still.
- Mini-map six cells fit 194 px; every Record<ZoneId> and zone list includes beach.

### Task 1: Zone, exits, places, cards, verbs, team/chat
Files: `src/game/{zones,constants,types,cards,reducer,geometry,team,beach}.ts`, `src/chat/{places,commands}.ts` + tests.
Produces: `"beach"`; `FISHER, BEACH_PIER, SHIPWRECK, BEACH_SIGNPOST: Poi` at (34,72),(84,62),(60,30),(14,58); PoiIds `fisher|beach-pier|shipwreck|beach-signpost`; ping names `fisher|jetty|shipwreck`; `FISHER_LINE`, `BEACH_COPY`.
### Task 2: Sprites and `beach` terrain
Sprites `umbrella, sandcastle, boat, shipwreck, pier, crab(2), shell`; `TerrainKind`/`TextureId` `beach`; decorations (palm, rock) and rock hedge; mini-map colour.
### Task 3: Beach area and the forest's east gap
`areas/beach.ts` (`BEACH_POINTS`, props, paths, west mouth), forest east mouth/corridor/road, `AREAS.beach`.
### Task 4: Scene, map chrome, mini-map
Scene branch (foam, glints, gulls, crab), captions/exit signs, MapViewport branch, six-cell mini-map, tests.
### Task 5: README, browser check, final review.
