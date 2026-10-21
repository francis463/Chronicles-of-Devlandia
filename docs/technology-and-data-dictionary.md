# Chronicles of Devlandia: Technology and Data Dictionary

## 1. Technologies

### Software

| Layer | Technology | Used for |
|---|---|---|
| Language | TypeScript 5.7 (strict), SQL (PostgreSQL), HTML, CSS | Game code, database, page |
| UI framework | React 19 | Screens, HUD, terminals, chat |
| Build tool | Vite 8 with `@vitejs/plugin-react` | Dev server (`localhost:5173`) and production build |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) | Layout down to 360px wide |
| Rendering | Browser pixel-art renderer (`src/render/`) | Map, sprites, zones |
| Backend platform | Supabase (`@supabase/supabase-js` 2.x) | Auth, database, Realtime, Storage, Edge Functions |
| Database | PostgreSQL with row-level security | Accounts, badges, leaderboard |
| Auth | Supabase Auth: name and password, Google sign-in, optional email | Login and password reset |
| Realtime | Supabase Realtime (presence and broadcast) | Online team play and chat |
| Local team play | Browser `BroadcastChannel` | "Same computer" mode |
| File storage | Supabase Storage (`avatars` bucket) | 96×96 JPEG profile photos |
| Serverless | Supabase Edge Function `account` (Deno) | Sign up, log in, forgot password by name |
| Testing | Vitest 5, jsdom, React Testing Library, `user-event`, `jest-dom` | Unit and component tests |
| Package manager | npm | Dependencies |
| Version control | Git and GitHub | Source |
| Hosting | Vercel is implied by the README's mention of preview URLs; not configured in the repo | Deployment |
| Design docs | Markdown specs and plans in `docs/superpowers/`, SVG mockup | Design sources |

### Hardware

Inferred from the code; the repo does not state the development machine.

| Role | Hardware |
|---|---|
| Player device | Desktop or laptop with keyboard (arrow keys, `E` to interact, `Enter` to chat) |
| Player device (touch) | Phone or tablet with on-screen touch controls; minimum screen width 360px |
| Network | Internet connection for Online play, accounts and leaderboards (not needed for Guest or Same computer mode) |
| Server side | Supabase cloud (managed Postgres, Realtime, Storage); no physical server is run |
| Development machine | Any computer that runs Node.js, npm and a modern browser |

## 2. Data dictionary

### 2.1 Database tables (PostgreSQL, from `supabase/migrations/`)

**`profiles`**: one row per account.

| Field | Type | Key and constraint | Description |
|---|---|---|---|
| `user_id` | uuid | PK, FK → `auth.users` (cascade delete) | Account id |
| `name` | text | NOT NULL, matches `^[A-Za-z0-9_-]{3,12}$` | Player name, 3–12 characters |
| `name_key` | text | Generated as `lower(name)`, UNIQUE | Case-insensitive uniqueness; the client can't set it |
| `created_at` | timestamptz | NOT NULL, default `now()` | Sign-up time |

**`badges`**: one row per earned chest.

| Field | Type | Key and constraint | Description |
|---|---|---|---|
| `user_id` | uuid | PK (part), FK → `auth.users` | Owner |
| `chest` | text | PK (part), one of the 11 chest ids | Which chest was opened |
| `question_id` | text | NOT NULL | Question that was answered |
| `answer` | text | NOT NULL, length ≤ 200 | The player's answer, shown in the Codex |
| `earned_at` | timestamptz | NOT NULL, set by the server with a trigger | Time earned; breaks leaderboard ties |

**`leaderboard_hidden`**: one row per player who opted out.

| Field | Type | Key and constraint | Description |
|---|---|---|---|
| `user_id` | uuid | PK, FK → `auth.users` | Player hidden from the leaderboard |

**`avatars`**: one row per profile photo.

| Field | Type | Key and constraint | Description |
|---|---|---|---|
| `user_id` | uuid | PK, FK → `auth.users` | Owner |
| `key` | uuid | NOT NULL, default `gen_random_uuid()` | Random photo name, so the leaderboard never exposes the account id |

**Storage bucket `avatars`**: public to read, JPEG only, 50 KB at most, files named `<key>.jpg`.

**Class** is not a table column. It is stored in `auth.users.raw_user_meta_data ->> 'class'`.

**Row-level security:** a player reads and writes only their own rows. There are no update policies, and `avatars` changes only through the functions below.

### 2.2 Database functions

| Function | Returns | Description |
|---|---|---|
| `leaderboard_top(max_rows)` | `rank`, `name`, `badges`, `last_earned`, `avatar`, `cls` | Top players (max 50, default 20). Ties share a rank; hidden players are left out. Never returns ids or emails. |
| `leaderboard_me()` | `rank`, `badges`, `hidden`, `avatar` | The caller's own standing |
| `avatar_start()` | `new_key`, `old_key` | Issues a fresh photo key |
| `avatar_clear()` | `old_key` | Deletes the caller's photo row |
| `badges_stamp()` (trigger) | trigger | Forces `earned_at = now()` on insert |

### 2.3 Game state (`GameState`, in memory; only badges are saved)

| Field | Type | Description |
|---|---|---|
| `zone` | `ZoneId` | Current area: peaks, village, forest, foggaten, desert, beach, lodge, hall |
| `player`, `drone` | Point `{x, y}` | Positions |
| `hp` | number | Health |
| `minutes`, `ticks` | number | In-game clock (wraps at midnight) and total ticks played |
| `inspected` | `PoiId` or null | Point of interest in use |
| `questComplete`, `hasLoot`, `gateUnlocked`, `clueDecoded`, `artifactFound`, `towerPowered`, `archiveOpen`, `lighthouseLit` | boolean | Quest progress flags |
| `logicOpen`, `logicError`, `logicHintRevealed` | boolean, string, boolean | Tower logic terminal |
| `lampOpen`, `lampError`, `lampTries`, `lampHintRevealed` | boolean, string, number, boolean | Lighthouse lamp terminal |
| `picks` | `Picks` | Which bank question each chest asks this game |
| `seed` | number | Shuffle seed for options and tiles |
| `badges` | `ChestId[]` | Earned chests, in order |
| `answered` | map of `ChestId` → text | Answers shown in the Codex |
| `challenge` | `ChallengeState` or null | Open terminal: `target`, `error`, `wrongTries`, `solved`, `lastWrong` |
| `hintsRevealed` | string[] | Challenge ids whose hint is shown |
| `matcherRound`, `matcherSolved`, `accessCode` | 0–2, boolean, string | Syntax Matcher and Archive code |
| `mushrooms`, `rangerFed` | `MushroomId[]`, boolean | Ranger side quest |
| `jars`, `nomadServed` | `JarId[]`, boolean | Nomad side quest |
| `remedies`, `food`, `soupTaken` | `RemedyId[]`, number, boolean | Healing items |
| `secrets` | `SecretId[]` | Eight hidden spots found |
| `sandcastleBuilt` | boolean | Beach puzzle solved |
| `codexOpen`, `bookOpen`, `finaleOpen`, `finaleSeen` | boolean | Windows and finale |
| `hard` | boolean | New Game+ (harder questions, wrong answers cost HP) |
| `logs`, `logCount` | string[], number | Event log |

### 2.4 Question bank (`src/learn/types.ts`)

| Item | Values |
|---|---|
| `Lang` | html, css, php, python, java, csharp, sql, cpp, javascript, logic |
| `ChestId` (11) | chest-cpp-1, chest-java, chest-cpp-2, chest-html, chest-css, chest-py-1, chest-php, chest-sql, chest-py-2, chest-cs, chest-js |
| `ChallengeTarget` | a `ChestId`, or gate, cipher, matcher, archive, sandcastle |
| Challenge kinds | `blank` (fill the gap), `choice` (4 options, or true/false), `match` (pairs of snippet and label) |
| Common fields | `id`, `lang`, `title`, `prompt`, `hint`, `explain` |
| `blank` extras | `code[]`, `answers[]`, `caseSensitive`, `live` check data, optional `blocks[]` tiles |
| `choice` extras | `options[]`, `correct` (data index 0–3), `fixedOrder` |

### 2.5 Team and network data (nothing stored; sent over Realtime)

**`PresenceMeta`**: describes each player in a room.

| Field | Type | Description |
|---|---|---|
| `id` | string | Per-session player id |
| `name` | string | Nickname (account name when signed in) |
| `joinedAt`, `startedAt` | number, number or null | Join time and game start time |
| `flags` | `TeamFlags` | The 8 shared progress flags |
| `x`, `y` | number | Position |
| `zone` | `ZoneId` or null | Current area |
| `cls` | `ClassId` (optional) | Hero class |

**`TeamMessage`** is one of: `pos`, `progress`, `start`, `badge`, `chat`, `food`, `ping`. Chat text is at most 120 characters, one message a second.

**Other values**
- Room code: 4 letters from `ABCDEFGHJKLMNPQRSTUVWXYZ`.
- Team size: 2–4 players.
- Classes: warrior, archer, mage, assassin, tank, healer (a look only; no stat changes).

### 2.6 Account Edge Function (`account`)

| Request field | Type | Rules |
|---|---|---|
| `action` | `"signup"`, `"login"` or `"forgot"` | Selects the operation |
| `name` | string | 3–12 characters of `A–Z a–z 0–9 _ -` |
| `password` | string | 8 or more characters |

Name-only accounts get a hidden internal email, `<name>@players.devlandia.invalid`.

### 2.7 Configuration

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public key, safe in the browser |
| `SITE_URLS` (Edge Function secret) | Sites a password-reset link may return to |

### 2.8 Leaderboard row (client side)

| Field | Type | Notes |
|---|---|---|
| `Row.rank` | integer 1–1,000,000 | |
| `Row.name` | string, 1–12 characters | |
| `Row.badges` | integer 1–11 | |
| `Row.avatar` | uuid string, optional | Photo key |
| `Row.cls` | `ClassId`, optional | |
| `Me.rank` | integer or null | Null while the player has no badges |
| `Me.badges` | integer | |
| `Me.hidden` | boolean | |
| `Me.avatar` | uuid string, optional | Photo key |
