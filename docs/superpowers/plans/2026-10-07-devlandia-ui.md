# Chronicles of Devlandia UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the playable three-screen web UI from the Figma Make file: Main Menu, an Overworld map you can walk around, and a Terminal Puzzle modal that unlocks the gate.

**Architecture:** A Vite single-page React app. All game rules live in pure TypeScript (`src/game/`): geometry and clock helpers, plus one `gameReducer`. Screens are thin React components that dispatch actions to the reducer. Two small hooks own side effects: keyboard input and timers. `App` switches between `menu`, `overworld` and `farewell`. The terminal is a modal rendered inside the overworld while `state.terminalOpen` is true. Layout comes from the lo-fi wireframe; colors come from the SVG mockup.

**Tech Stack:** Vite 8, React 19, TypeScript 5.7, Tailwind CSS 4 (`@tailwindcss/vite`), Vitest + @testing-library/react + @testing-library/user-event + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-07-devlandia-ui-spec.md` (visual reference: `docs/reference/game-ui-mockup.svg`)

## Global Constraints

- Dependencies are limited to those listed in Tech Stack; no state library and no router.
- Color tokens come exactly from the spec's table and are defined once as CSS variables in `src/index.css`. Components never hard-code hex values.
- The font is JetBrains Mono, loaded from Google Fonts in `src/index.css`.
- All numbers and copy in the spec's "Rules (exact values)" are used verbatim. They live as named constants in `src/game/constants.ts`.
- Coordinates are percentages (0–100) of the map viewport.
- Every interactive element is a real `<button>` or `<input>`, reachable by keyboard and with a visible focus ring.
- The layout works from 360px wide upward. Below the `md` breakpoint the overworld panels stack vertically, as in the wireframe.

## Decisions not in the source (confirm or change)

1. **TEAM LOBBY / SETTINGS** render disabled with a "Coming soon" label. Neither is specified.
2. **EXIT GAME** goes to a farewell screen ("Thanks for playing") with a `[ Back to Menu ]` button, because a browser tab can't quit itself.
3. **[=] Menu** in the HUD returns to the main menu. **SOLO QUEST** always starts a fresh game.
4. **Opening the terminal:** press `[E]` near the gate, or click `[G] Gate`. The gate's inspection still logs its line.
5. **Puzzle answer:** the input is trimmed and lower-cased, and an optional trailing `;` is accepted. If the result is `block`:
   - `gateUnlocked = true` and the modal closes.
   - Log "Bridge restored. The river can be crossed safely."
   - The river renders as a solid bridge and stops doing cold damage.

   Any other value shows the inline error `Compile error: display: <value> keeps the bridge hidden.` and the modal stays open.
6. **Hint:** the hint box shows "Hint locked. Use a hint item to decode." until `[ USE HINT ITEM ]` is clicked. After that it shows the spec's hint text. The item can be used unlimited times (no inventory cost).
7. **HP 0:** a "DOWNED" overlay with `[ Respawn ]` appears. Respawn resets the player and drone to their start positions and HP to 100, and logs "Drone revived you at base camp." Movement and timers are ignored while downed.
8. **Quest label:** keep the wireframe's quest, "Survey Frozen River". The SVG's "Reach Java Island" is a future quest.

## Review Focus

1. **Typing in the terminal input** (e.g. the letters `w`, `a`, `s`, `d`, `e`) must not move the player or trigger interact. Test: Task 5.
2. **Keys pressed while the terminal is open or the player is downed** are ignored. `Escape` closes the terminal. Test: Task 5.
3. **Leaving the overworld** (`[=] Menu`) stops all intervals: no state updates after unmount and no React warnings. Test: Task 4.
4. **Holding a key at a map edge** keeps the player clamped and never drives stamina below 0, even with no movement possible. Moves at 0 stamina are still allowed, as in the source. Test: Task 2.
5. **Clock wrap at midnight** (23:59 → 00:04) shows `00:04` and phase Night. Test: Task 1.

---

## File Structure

```
index.html
package.json  vite.config.ts  tsconfig.json  vitest.setup.ts
src/
  main.tsx                  # mounts <App/>
  index.css                 # font import, Tailwind, color tokens, body bg
  App.tsx                   # screen switch: menu | overworld | farewell
  ui/
    Panel.tsx               # bordered surface with optional floating label
    Button.tsx              # variants: primary | danger | accent | success | neutral | ghost
    Meter.tsx               # labeled bar (HP / STA)
  game/
    constants.ts            # every exact value + copy from the spec
    types.ts                # Point, PoiId, Poi, Direction, Phase, GameState, GameAction
    geometry.ts             # distance, clampPlayer, nearestPoi, isInRiver
    clock.ts                # advanceClock, phaseOf, formatTime
    puzzle.ts               # normalizeAnswer, isCorrectAnswer
    reducer.ts              # initialState, gameReducer
  hooks/
    useKeyboardControls.ts  # WASD/arrows/E/Escape → dispatch
    useGameTimers.ts        # tick, river damage, drone follow
  screens/
    MainMenu.tsx
    Farewell.tsx
    overworld/
      Overworld.tsx         # owns useReducer; composes the parts below
      TopHud.tsx  BottomHud.tsx  MiniMap.tsx  MapViewport.tsx  EventLog.tsx
    TerminalModal.tsx
```

Tests sit next to their source as `*.test.ts(x)`.

---

### Task 1: Project scaffold, tokens, UI primitives, pure helpers

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.setup.ts`, `index.html`, `src/main.tsx`, `src/index.css`, `src/App.tsx` (placeholder rendering the title)
- Create: `src/ui/Panel.tsx`, `src/ui/Button.tsx`, `src/ui/Meter.tsx`
- Create: `src/game/constants.ts`, `src/game/types.ts`, `src/game/geometry.ts`, `src/game/clock.ts`, `src/game/puzzle.ts`
- Test: `src/game/geometry.test.ts`, `src/game/clock.test.ts`, `src/game/puzzle.test.ts`, `src/ui/Button.test.tsx`

**Interfaces:**
- Produces (types.ts):
  - `type Point = { x: number; y: number }`
  - `type PoiId = "gate" | "chest" | "river"`
  - `type Poi = { id: PoiId; label: string } & Point`
  - `type Direction = "up" | "down" | "left" | "right"`
  - `type Phase = "Day" | "Dusk" | "Night"`
- Produces (constants.ts): `PLAYER_START`, `DRONE_START`, `STEP = 4`, `BOUNDS = { minX: 6, maxX: 94, minY: 10, maxY: 90 }`, `POIS: Poi[]`, `INTERACT_RADIUS = 13`, `RIVER_ZONE = { minX: 24, maxX: 76, minY: 28, maxY: 39 }`, `START_MINUTES = 1169`, `TICK_MS = 2000`, `TICK_MINUTES = 5`, `STAMINA_REGEN = 2`, `RIVER_DAMAGE = 8`, `RIVER_DAMAGE_MS = 1800`, `DRONE_DELAY_MS = 320`, `DRONE_FOLLOW = 0.58`, `LOG_LIMIT = 6`, `INITIAL_LOGS`, `LOG` (an object of every log string from the spec and the Decisions section), `INSPECT_COPY`, `PUZZLE_ANSWER = "block"`
- Produces (geometry.ts): `distance(a: Point, b: Point): number`, `clampPlayer(p: Point): Point`, `nearestPoi(p: Point): { poi: Poi; distance: number }`, `isInRiver(p: Point): boolean` (inclusive bounds)
- Produces (clock.ts): `advanceClock(minutes: number): number`, `phaseOf(minutes: number): Phase`, `formatTime(minutes: number): string`
- Produces (puzzle.ts): `normalizeAnswer(raw: string): string`, `isCorrectAnswer(raw: string): boolean`
- Produces (ui):
  - `Panel({ label?, dashed?, className?, children })`
  - `Button({ variant?: "primary"|"danger"|"accent"|"success"|"neutral"|"ghost", disabled?, onClick?, className?, children })` renders a `<button type="button">`
  - `Meter({ label: string; value: number; max?: number; tone: "accent"|"primary" })` renders `role="meter"` with `aria-valuenow`

- [ ] **Step 1: Scaffold.** Copy versions from the Make `package.json`: react/react-dom ^19, vite ^8.0.5, @vitejs/plugin-react ^6, tailwindcss + @tailwindcss/vite ^4, typescript ^5.7. Add dev deps vitest, jsdom, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event. Scripts: `dev`, `build` (`tsc -b && vite build`), `test` (`vitest run`). In vite.config, set `test: { environment: "jsdom", setupFiles: "./vitest.setup.ts" }`. Run `npm install`.
- [ ] **Step 2: Write `src/index.css`** with the font import, `@import 'tailwindcss'`, `@theme inline { --font-mono: 'JetBrains Mono', monospace; }`, the spec's color variables on `:root`, and `body { background: var(--bg); color: var(--text); font-family: var(--font-mono) }`.
- [ ] **Step 3: Write failing tests**

```ts
// geometry.test.ts
expect(distance({x:0,y:0},{x:3,y:4})).toBe(5)
expect(clampPlayer({x:2,y:95})).toEqual({x:6,y:90})
expect(nearestPoi({x:50,y:52}).poi.id).toBe("gate")
expect(isInRiver({x:24,y:28})).toBe(true); expect(isInRiver({x:23.9,y:30})).toBe(false)
// clock.test.ts
expect(formatTime(1169)).toBe("19:29")
expect(advanceClock(1439)).toBe(4); expect(formatTime(advanceClock(1439))).toBe("00:04")   // Review Focus 5
expect(phaseOf(4)).toBe("Night"); expect(phaseOf(359)).toBe("Night"); expect(phaseOf(360)).toBe("Day")
expect(phaseOf(1080)).toBe("Dusk"); expect(phaseOf(1199)).toBe("Dusk"); expect(phaseOf(1200)).toBe("Night")
// puzzle.test.ts
for (const ok of ["block", " Block ", "BLOCK;", "block ;"]) expect(isCorrectAnswer(ok)).toBe(true)
for (const bad of ["none", "", "blocks", "inline-block"]) expect(isCorrectAnswer(bad)).toBe(false)
// Button.test.tsx
render(<Button disabled>X</Button>); expect(screen.getByRole("button",{name:"X"})).toBeDisabled()
```

- [ ] **Step 4: Run** `npm test`. Expected: FAIL (modules missing).
- [ ] **Step 5: Implement** constants, types, helpers and UI primitives to the signatures above. Map each Button variant to the token pair from the spec (fill + border). `ghost` is transparent with a dashed `--panel-border` border.
- [ ] **Step 6: Run** `npm test && npm run build`. Expected: all pass, build succeeds.
- [ ] **Step 7: Commit** `feat: scaffold app, design tokens, UI primitives and game helpers`

---

### Task 2: Game reducer

**Files:**
- Create: `src/game/reducer.ts`
- Test: `src/game/reducer.test.ts`

**Interfaces:**
- Consumes: everything from Task 1 `game/*`.
- Produces:
  ```ts
  type GameState = { player: Point; drone: Point; hp: number; stamina: number; minutes: number;
    inspected: PoiId | null; questComplete: boolean; hasLoot: boolean; gateUnlocked: boolean;
    terminalOpen: boolean; puzzleError: string | null; hintRevealed: boolean; logs: string[] }
  type GameAction =
    | { type: "move"; dir: Direction } | { type: "tick" } | { type: "riverDamage" }
    | { type: "droneFollow" } | { type: "interact"; poi: PoiId } | { type: "closeInspection" }
    | { type: "closeTerminal" } | { type: "submitCode"; value: string } | { type: "revealHint" }
    | { type: "respawn" }
  const initialState: GameState
  function gameReducer(state: GameState, action: GameAction): GameState
  const isDowned = (s: GameState) => s.hp <= 0
  ```
  (`GameState` and `GameAction` go in `types.ts`.)

- [ ] **Step 1: Write failing tests** (one `it` per line):

```ts
const s0 = initialState
// move
expect(gameReducer(s0,{type:"move",dir:"up"}).player).toEqual({x:28,y:68})
expect(gameReducer(s0,{type:"move",dir:"up"}).stamina).toBe(99)
// Review Focus 4: clamped at edge, stamina floors at 0
const edge = {...s0, player:{x:6,y:50}, stamina:0}
const e1 = gameReducer(edge,{type:"move",dir:"left"}); expect(e1.player.x).toBe(6); expect(e1.stamina).toBe(0)
// entering river completes quest once and logs it
const nearRiver = {...s0, player:{x:50,y:43}}
const r1 = gameReducer(nearRiver,{type:"move",dir:"up"})
expect(r1.questComplete).toBe(true); expect(r1.logs.at(-1)).toBe("Quest complete: Frozen River surveyed.")
expect(gameReducer(r1,{type:"move",dir:"right"}).logs.filter(l=>l.startsWith("Quest complete"))).toHaveLength(1)
// downed ignores move
expect(gameReducer({...s0,hp:0},{type:"move",dir:"up"}).player).toEqual(s0.player)
// tick
const t = gameReducer({...s0,stamina:99},{type:"tick"}); expect(t.minutes).toBe(1174); expect(t.stamina).toBe(100)
// riverDamage: only in river, not after gateUnlocked, floors at 0
const inRiver = {...s0, player:{x:50,y:33}}
expect(gameReducer(inRiver,{type:"riverDamage"}).hp).toBe(92)
expect(gameReducer({...inRiver,gateUnlocked:true},{type:"riverDamage"}).hp).toBe(100)
expect(gameReducer({...inRiver,hp:5},{type:"riverDamage"}).hp).toBe(0)
expect(gameReducer(s0,{type:"riverDamage"})).toBe(s0)
// droneFollow
expect(gameReducer({...s0,drone:{x:0,y:0},player:{x:100,y:50}},{type:"droneFollow"}).drone).toEqual({x:58,y:29})
// interact
const g = gameReducer(s0,{type:"interact",poi:"gate"}); expect(g.terminalOpen).toBe(true); expect(g.inspected).toBe("gate")
const c1 = gameReducer(s0,{type:"interact",poi:"chest"}); expect(c1.hasLoot).toBe(true)
expect(gameReducer(c1,{type:"interact",poi:"chest"}).logs.at(-1)).toBe("Supply cache already collected.")
// log limit
let s = s0; for (let i=0;i<10;i++) s = gameReducer(s,{type:"interact",poi:"river"}); expect(s.logs).toHaveLength(6)
// submitCode
const open = {...s0, terminalOpen:true}
const ok = gameReducer(open,{type:"submitCode",value:"block;"})
expect(ok.gateUnlocked).toBe(true); expect(ok.terminalOpen).toBe(false); expect(ok.puzzleError).toBeNull()
const bad = gameReducer(open,{type:"submitCode",value:"flex"})
expect(bad.terminalOpen).toBe(true); expect(bad.puzzleError).toBe("Compile error: display: flex keeps the bridge hidden.")
// respawn
const rs = gameReducer({...s0,hp:0,player:{x:50,y:33}},{type:"respawn"})
expect(rs.hp).toBe(100); expect(rs.player).toEqual({x:28,y:72}); expect(rs.logs.at(-1)).toBe("Drone revived you at base camp.")
```

- [ ] **Step 2: Run** `npx vitest run src/game/reducer.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `gameReducer`.** Use a private `pushLog(state, msg)` that keeps the last `LOG_LIMIT` entries. `riverDamage` returns the same state object when it has no effect, so React can skip re-rendering. `closeTerminal` also clears `puzzleError`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: add game reducer with movement, clock, river, POIs and puzzle rules`

---

### Task 3: Main Menu, Farewell, App screen switching

**Files:**
- Create: `src/screens/MainMenu.tsx`, `src/screens/Farewell.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces:
  - `type Screen = "menu" | "overworld" | "farewell"`
  - `MainMenu({ onSoloQuest: () => void; onExit: () => void })`
  - `Farewell({ onBack: () => void })`
  - `Overworld({ onMenu: () => void })` is a stub `<h2>Overworld</h2>` until Task 4. App passes `key={gameId}` so each Solo Quest remounts it with fresh state.

- [ ] **Step 1: Write failing tests**

```tsx
render(<App/>)
expect(screen.getByRole("heading",{name:/chronicles of devlandia/i})).toBeInTheDocument()
expect(screen.getByText(/solve the map, break the code, find the treasure/i)).toBeInTheDocument()
expect(screen.getByRole("button",{name:/team lobby/i})).toBeDisabled()
expect(screen.getByRole("button",{name:/settings/i})).toBeDisabled()
await user.click(screen.getByRole("button",{name:/solo quest/i})); expect(screen.getByText(/overworld/i)).toBeInTheDocument()
// exit → farewell → back
await user.click(screen.getByRole("button",{name:/exit game/i})); expect(screen.getByText(/thanks for playing/i)).toBeInTheDocument()
await user.click(screen.getByRole("button",{name:/back to menu/i})); expect(screen.getByRole("button",{name:/solo quest/i})).toBeInTheDocument()
```

(The exit flow is its own `it`, starting from a fresh render.)

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to the spec's Screen 1 layout: a centered panel, a 200px button column with `gap-2`, and footer text left and right. Disabled buttons show "Coming soon" under their label in `--text-muted`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: main menu, farewell screen and screen switching`

---

### Task 4: Overworld screen (HUDs, mini-map, viewport, event log, timers)

**Files:**
- Create: `src/screens/overworld/{Overworld,TopHud,BottomHud,MiniMap,MapViewport,EventLog}.tsx`, `src/hooks/useGameTimers.ts`
- Test: `src/screens/overworld/Overworld.test.tsx`

**Interfaces:**
- Consumes: `gameReducer`, `initialState`, `isDowned` (Task 2); `phaseOf`, `formatTime`, `nearestPoi`, `isInRiver` (Task 1); `Panel`, `Button`, `Meter`.
- Produces:
  - `Overworld({ onMenu, initial }: { onMenu: () => void; initial?: Partial<GameState> })` owns `useReducer(gameReducer, { ...initialState, ...initial })`.
  - `useGameTimers(state: GameState, dispatch: Dispatch<GameAction>): void`:
    - `tick` every `TICK_MS` unless the terminal is open or the player is downed.
    - `riverDamage` every `RIVER_DAMAGE_MS` while in the river, not downed and the gate is locked.
    - `droneFollow` `DRONE_DELAY_MS` after each `state.player` change.
  - Children receive only the state slices they render, plus callbacks.

- [ ] **Step 1: Write failing tests** (with `vi.useFakeTimers()`):

```tsx
const { unmount } = render(<Overworld onMenu={onMenu}/>)
expect(screen.getByText("REGION: C++ PEAKS")).toBeInTheDocument()
expect(screen.getByText("Dusk / 19:29")).toBeInTheDocument()
act(()=>vi.advanceTimersByTime(2000)); expect(screen.getByText("Dusk / 19:34")).toBeInTheDocument()
expect(screen.getAllByRole("meter")[0]).toHaveAttribute("aria-valuenow","100")
expect(screen.getByText("Quest: Survey Frozen River (0/1)")).toBeInTheDocument()
expect(screen.getByText("Entered C++ Peaks.")).toBeInTheDocument()
await user.click(screen.getByRole("button",{name:"[X] Supply Cache"}))
expect(screen.getByText("Supply cache opened: +1 Repair Patch.")).toBeInTheDocument()
expect(screen.getByText("Patch")).toBeInTheDocument()
expect(screen.getByRole("button",{name:"[X] Empty Cache"})).toBeInTheDocument()
await user.click(screen.getByRole("button",{name:"[=] Menu"})); expect(onMenu).toHaveBeenCalled()
// Review Focus 3 (separate `it`): unmount clears timers
const err = vi.spyOn(console,"error"); unmount(); act(()=>vi.advanceTimersByTime(10000))
expect(err).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0)
```

Create `user` with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`. The `Overworld` component accepts a test-only `initial?: Partial<GameState>` prop, merged over `initialState`.

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement the layout** to the spec's Screen 2. Top HUD, then a three-column row on `md` and up (`w-36` mini-map column / flex-1 viewport, `min-h-[360px]` / `w-52` log), then the bottom HUD.
  - Positioned elements use `left: x%`, `top: y%` with `-translate-x-1/2 -translate-y-1/2`.
  - Player: `--success` circle. Drone: `--primary` circle with a `transition-all duration-300`. Gate: `accent` button. Cache: `ghost` button. River: dashed `--primary` line, which becomes solid with the label "Bridge" when `gateUnlocked`.
  - Overlays: phase tint with the spec's rgba values, and the fog gradient `radial-gradient(circle at X% Y%, transparent 0%, transparent 15%, rgba(15,23,42,0.35) 32%, rgba(15,23,42,0.7) 62%)`.
  - The `[E] Inspect <label>` prompt shows when `nearestPoi(player).distance <= INTERACT_RADIUS`. The inspection card shows `INSPECT_COPY` with a `[X] Close` button.
  - The DOWNED overlay with `[ Respawn ]` shows when `isDowned(state)`.
- [ ] **Step 4: Implement `useGameTimers`.** Clear every interval/timeout in effect cleanups.
- [ ] **Step 5: Wire** `App` to render the real `Overworld`.
- [ ] **Step 6: Run** `npm test`. Expected: PASS.
- [ ] **Step 7: Commit** `feat: overworld screen with HUD, mini-map, map viewport, event log and timers`

---

### Task 5: Keyboard controls

**Files:**
- Create: `src/hooks/useKeyboardControls.ts`
- Modify: `src/screens/overworld/Overworld.tsx` (call the hook)
- Test: `src/hooks/useKeyboardControls.test.tsx` (drives the real `Overworld`)

**Interfaces:**
- Consumes: `GameState`, `GameAction`, `nearestPoi`, `INTERACT_RADIUS`, `isDowned`.
- Produces: `useKeyboardControls(state: GameState, dispatch: Dispatch<GameAction>): void`.
  - Maps `w/ArrowUp`, `s/ArrowDown`, `a/ArrowLeft`, `d/ArrowRight` (case-insensitive) to `move`.
  - `e` dispatches `interact` with the nearest POI when it's in range.
  - `Escape` dispatches `closeTerminal` when the terminal is open.
  - Calls `preventDefault` only on keys it handles.
  - Ignores every key except Escape when the event target is an `input`/`textarea`/`contenteditable`, when `terminalOpen` is true, or when the player is downed.

- [ ] **Step 1: Write failing tests**

```tsx
render(<Overworld onMenu={()=>{}}/>)
const player = () => screen.getByTestId("player")          // style.left/top
await user.keyboard("{ArrowUp}"); expect(player().style.top).toBe("68%")
await user.keyboard("D"); expect(player().style.left).toBe("32%")
// interact out of range does nothing
await user.keyboard("e"); expect(screen.queryByText(/Gate terminal ready/)).toBeNull()
// Review Focus 2: keys ignored while downed
render(<Overworld onMenu={()=>{}} initial={{hp:0}}/>); await user.keyboard("{ArrowUp}"); expect(player().style.top).toBe("72%")
```

Add these as `it.todo` now. Task 6 turns them into real tests:

```tsx
// start next to the gate, open with E
render(<Overworld onMenu={()=>{}} initial={{player:{x:50,y:58}}}/>); await user.keyboard("e")
expect(screen.getByRole("dialog",{name:/terminal gate lock/i})).toBeInTheDocument()
// Review Focus 1: typing in the input does not move the player
await user.type(screen.getByRole("textbox",{name:"display value"}),"wasde"); expect(player().style.top).toBe("58%")
// Review Focus 2: Escape closes the modal
await user.keyboard("{Escape}"); expect(screen.queryByRole("dialog")).toBeNull()
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the hook, and add `data-testid="player"` on the player marker.
- [ ] **Step 4: Run** `npm test`. Expected: PASS (dialog tests skipped with `it.todo` until Task 6).
- [ ] **Step 5: Commit** `feat: keyboard movement and interaction`

---

### Task 6: Terminal Puzzle modal + gate unlock

**Files:**
- Create: `src/screens/TerminalModal.tsx`
- Modify: `src/screens/overworld/Overworld.tsx` (render it when `state.terminalOpen`); `src/hooks/useKeyboardControls.test.tsx` (turn the `it.todo` blocks into real tests)
- Test: `src/screens/TerminalModal.test.tsx`

**Interfaces:**
- Consumes: `GameAction` `submitCode`, `closeTerminal`, `revealHint`; `state.puzzleError`, `state.hintRevealed`.
- Produces: `TerminalModal({ error: string | null; hintRevealed: boolean; onSubmit: (value: string) => void; onClose: () => void; onRevealHint: () => void })`.
  - Renders `role="dialog"` with `aria-modal="true"`, labelled by the header text.
  - The input has `aria-label="display value"` and a default value of `none`. It's autofocused on open.
  - Pressing Enter in the input submits.

- [ ] **Step 1: Write failing tests**

```tsx
render(<TerminalModal error={null} hintRevealed={false} onSubmit={onSubmit} onClose={onClose} onRevealHint={onHint}/>)
expect(screen.getByRole("dialog",{name:"< TERMINAL GATE LOCK: C++ PEAKS >"})).toBeInTheDocument()
expect(screen.getByText("1 | .frozen-bridge {")).toBeInTheDocument()
const input = screen.getByRole("textbox",{name:"display value"}); expect(input).toHaveValue("none"); expect(input).toHaveFocus()
expect(screen.getByText("Hint locked. Use a hint item to decode.")).toBeInTheDocument()
await user.clear(input); await user.type(input,"block{Enter}"); expect(onSubmit).toHaveBeenCalledWith("block")
await user.click(screen.getByRole("button",{name:"[ SUBMIT CODE ]"})); expect(onSubmit).toHaveBeenCalledTimes(2)
await user.click(screen.getByRole("button",{name:"[ USE HINT ITEM ]"})); expect(onHint).toHaveBeenCalled()
await user.click(screen.getByRole("button",{name:"[X] CLOSE"})); expect(onClose).toHaveBeenCalled()
// rerender with error + hint
rerender(<TerminalModal error="Compile error: display: flex keeps the bridge hidden." hintRevealed onSubmit={onSubmit} onClose={onClose} onRevealHint={onHint}/>)
expect(screen.getByRole("alert")).toHaveTextContent("Compile error: display: flex keeps the bridge hidden.")
expect(screen.getByText(`"Setting display to 'none' hides the object. Try 'block' instead!"`)).toBeInTheDocument()
```

Integration test, in `Overworld.test.tsx`:
1. Click `[G] Gate`; the dialog opens.
2. Type `block` and submit.
3. The dialog closes, the log shows "Bridge restored. The river can be crossed safely.", and the river label reads "Bridge".

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to the spec's Screen 3 with the SVG styling:
  - Panel border and header in `--accent`, header text in `--bg`.
  - Editor on `--editor-bg`, code text `#4ade80` via a `--code` token, input text in `--accent`.
  - Hint box has a `--primary-border` stroke.
  - Submit is `success`, Use Hint is `neutral`.
  - Overlay is a fixed inset backdrop `rgba(15,23,42,0.7)`. Clicking the backdrop does **not** close the modal (only `[X] CLOSE` and `Escape` do).
- [ ] **Step 4: Run** `npm test`. Expected: PASS, including the un-todo'd keyboard tests.
- [ ] **Step 5: Commit** `feat: terminal puzzle modal unlocks the frozen bridge`

---

### Task 7: Final verification + README

**Files:**
- Create: `README.md` covering the setup (`npm install`, `npm run dev`, `npm test`), controls, and links to the spec and Figma file.

- [ ] **Step 1: Run** `npm test && npm run build`. Expected: all tests pass, and `dist/` is built with no TS errors.
- [ ] **Step 2: Manual check.** Run `npm run dev`, then open the app in Playwright/Chromium at 1280×800 and at 375×800:
  - Play the full loop: menu → Solo Quest → walk into the river (quest completes, HP drains) → loot the cache → open the gate → wrong answer shows the error → `block` unlocks the bridge → the river stops damaging → `[=] Menu` → Exit → Back.
  - Take screenshots and compare them against `docs/reference/game-ui-mockup.svg`.
  - Confirm there is no horizontal scroll at 375px.
- [ ] **Step 3: Commit** `docs: add README with setup and controls`
