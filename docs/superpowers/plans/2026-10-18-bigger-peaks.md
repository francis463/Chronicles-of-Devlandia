# Bigger Peaks plan

Spec: docs/superpowers/specs/2026-10-18-bigger-peaks-design.md. Execute inline; ledger at /tmp/ledger-peaks.txt. Each task ends green (`npx tsc -b`; `timeout 280 npx vitest run`) and is committed.

1. **Scale and landmarks.** `ZONE_SCALE.peaks = 2`; rescale `areas/peaks.ts` (props, paths, mouths, corridors, shore, wildlife, trail posts, ICE/BRIDGE); per-zone `WALL_RECT`; scene constants (glints, arrow, lights, aurora, camp light, birds); tests prove art matches game places.
2. **Scenery fill.** Extra props along paths; check density and collisions.
3. **Hidden spots** (two) + Codex `n/8` + cards + sprites reuse.
4. **Browser pass** (river, wall, gate, exits, lodge door, whole map, team minimap) and fixes.
5. **README, final review, push.**
