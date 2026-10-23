# Accounts and saved badges: design

**Date:** 2026-10-17 · **Status:** awaiting the owner's review of this written spec

## Goal

Before the main menu, show a login screen (Log in / Sign up tabs, Name and Password, Forgot password, Sign in with Google, Play as guest). Logged-in players keep their badges, and the answers behind them, on any computer. Guests play everything, and nothing of theirs is saved.

## Decisions already made with the owner

| Question | Decision |
|---|---|
| Scope | Real accounts and saved progress |
| Password sign-in | Name + password, plus an **optional** email so "Forgot password" works |
| Also | Sign in with Google |
| What is saved | **Badges and the answers behind them** only. Not quest progress, position, HP or inventory |
| Guests | May play Solo Quest and Team Lobby; nothing is saved |
| Approach | Supabase Auth plus one Edge Function (below). Build everything in one go (no phases) |
| Screen | Appears before the main menu |

Out of scope: leaderboards (the menu's third button stays "Leaderboards, coming soon"), saving the world state, changing a name, deleting an account, avatars.

## Flow

1. App starts. If Supabase already holds a session for this browser, go to the main menu as that player. Otherwise show the **login screen**.
2. **Log in:** Name and Password, then `[ Log in ]`. **Sign up:** Name, Password, Repeat password, then `[ Create account ]`. Both end on the main menu.
3. **Sign in with Google:** redirects to Google and back. A Google player with no name yet sees one extra screen, **Choose your name**, then enters the menu. Their name is the same kind of name as everyone else's.
4. **Play as guest:** goes straight to the main menu. Guest status lasts until the page is reloaded.
5. **Forgot your password?** asks for the account name and says: "If that account has an email, we sent a reset link." (The same words whether or not it has one.) The link opens the app on a **Set a new password** screen; saving it logs the player in.
6. The main menu shows `Signed in as <name> · [ Log out ]` or `Guest · [ Log in ]`. A signed-in player can `[ Add email ]` there so Forgot password works for them.

Footer text under the buttons, as in the reference: "Your badges are saved to your account. Guest progress is not saved."

## Names, passwords, email

- **Name:** 3–12 characters: letters, digits, `-`, `_`. No spaces (a name can't be mistaken for another by spacing). Unique ignoring case (`Kai` and `kai` are the same). The existing chat filter rejects rude names (`maskRude(name) !== name`).
- **Password:** at least 8 characters, entered twice on Sign up.
- **Optional email:** added later from the menu. Supabase sends a confirmation to it; once confirmed it becomes the account's sign-in address. Name login keeps working because the **server** maps a name to the account, never the client.
- Error copy is generic where it matters: a wrong name and a wrong password both say "Wrong name or password."

## Server side (Supabase)

### Tables (migration)

```sql
create table profiles (
  user_id   uuid primary key references auth.users on delete cascade,
  name      text not null check (name ~ '^[A-Za-z0-9_-]{3,12}$'),
  name_key  text not null unique,            -- lower(name)
  created_at timestamptz not null default now()
);
create table badges (
  user_id    uuid not null references auth.users on delete cascade,
  chest      text not null check (chest in
    ('chest-cpp-1','chest-java','chest-cpp-2','chest-html','chest-css','chest-py-1',
     'chest-php','chest-sql','chest-py-2','chest-cs','chest-js')),
  question_id text not null,
  answer     text not null check (length(answer) <= 200),
  earned_at  timestamptz not null default now(),
  primary key (user_id, chest)
);
alter table profiles enable row level security;
alter table badges   enable row level security;
-- a player reads and writes only their own rows
create policy own_profile_read  on profiles for select using (user_id = auth.uid());
create policy own_profile_write on profiles for insert with check (user_id = auth.uid());
create policy own_badges_read   on badges   for select using (user_id = auth.uid());
create policy own_badges_write  on badges   for insert with check (user_id = auth.uid());
```

No update or delete policies: a badge, once saved, stays. (Inserting the same chest again is ignored client-side.)

### Edge Function `account`

One function with the service-role key (kept in Supabase secrets, never in the repo). Actions:

- `signup {name, password}`: validate the name and password, reject taken names, create the user with a reserved internal address (email-confirmed by the admin API, so no dashboard setting is needed), insert the profile, sign in, return the session.
- `login {name, password}`: look the name up, sign in with that account's current email, return the session. Wrong name or wrong password both fail the same way.
- `forgot {name}`: if the account's email is a real (non-internal) one, ask Supabase to send the reset link to it. Always answers the same.

Google sign-in, session refresh, adding an email and setting a new password use Supabase Auth directly from the client.

## Client side

New folders; existing files change only where noted.

- `src/auth/nameRules.ts`: validation shared by the screen and tests (pure).
- `src/auth/authClient.ts`: the `AuthClient` interface (`session`, `signUp`, `logIn`, `logInWithGoogle`, `forgot`, `setPassword`, `addEmail`, `logOut`, `setName`) and its Supabase implementation. `memoryAuth.ts`: an in-memory fake for tests.
- `src/auth/useAuth.ts`: the hook the app uses: `status: "loading" | "signedOut" | "needsName" | "signedIn" | "guest" | "recovery"`, `name`, and the actions.
- `src/screens/AuthScreen.tsx` (tabs and forms, matching the reference: gold Log in button, white Google button, outlined Play as guest), `ChooseName.tsx`, `SetPassword.tsx`.
- `src/progress/progressStore.ts`: `loadBadges(userId)` and `saveBadge(userId, chest, questionId, answer)` against the `badges` table; a fake for tests.
- `App.tsx`: new `"auth"` screen before `"menu"`; `MainMenu.tsx`: the account bar and `[ Add email ]`.
- `TeamLobby.tsx`: the nickname box is prefilled with the account name (guests type theirs as today).

### Saving and restoring badges

- On a new badge while signed in, the game saves `{chest, question_id, answer}`. The question's id is stored because each game rolls a random question per chest.
- On login the saved rows seed the next game as `badges` and `answered`, and the roll's pick for each earned chest is set to the saved question. The Codex and the open chest therefore show the question the player really answered.
- The unsaved case never blocks play: if saving fails, the log says "Couldn't save your badge. It'll retry." and one retry happens when the next badge is earned or the menu is reached.
- Guests never touch the database.

## Setup the owner must do (outside the repo)

Nothing below is done without asking first:

1. Apply the migration and deploy the `account` function to the existing project.
2. Enable the Google provider in Supabase and Google Cloud (client id and secret), and list the redirect URLs (production, Vercel previews, `http://localhost:5173`).
3. Set Supabase's Site URL. For real "Forgot password" volume, add a custom SMTP sender: the built-in one is heavily rate-limited.

## Edge cases

- Supabase unreachable: the login screen shows "Can't reach the account server" and `Play as guest` still works.
- Two tabs, one account: both show the same badges after reload; saving the same chest twice is ignored.
- Google player reloads before choosing a name: they return to **Choose your name**.
- Name taken at sign up (including a race): the unique key rejects it; the form says "That name is taken."
- A signed-in player leaves a team game: nothing about badges changes.
- Password reset link opened with no app session: shows **Set a new password** only; an expired link shows "That link has expired. Ask for a new one."

## Testing

- Unit tests (fake auth and fake progress store): name rules; each screen's states and error copy; sign-up and login flows; guest path; badge save and restore, including the question-pick override; save-failure retry; menu account bar; team nickname prefill.
- Server: SQL checked against the policies by a script run on a throwaway branch or local database before touching the real project; the function's three actions called with valid and invalid input.
- Browser check at 1366×657 and 390×844: sign up, log out, log in, add a badge, reload, and see the badge still there; guest play; error states.

## Review focus

1. A player must never be able to read or write another player's rows (try with a second account).
2. Wrong name and wrong password must be indistinguishable in message and behavior.
3. No secret is committed: only the public Supabase key is in the repo.
4. The login screen must never trap a player: guest is always one click away, even offline.
5. Restoring a saved badge must show the question that was actually answered, not a new random one.
