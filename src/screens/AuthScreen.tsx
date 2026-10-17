import { useState } from "react";
import { AUTH_ERROR_COPY, type AuthError, type Result } from "../auth/authClient";
import { validateName, validatePassword } from "../auth/nameRules";
import type { Auth } from "../auth/useAuth";
import { Button } from "../ui/Button";
import { AuthFrame, Field, Problem } from "./authParts";

type Tab = "login" | "signup" | "forgot";
const FORGOT_NOTICE = "If that account has an email, we sent a reset link.";

export function AuthScreen({ auth }: { auth: Auth }) {
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const show = (error: AuthError) => setProblem(AUTH_ERROR_COPY[error]);
  const run = async (call: () => Promise<Result>, done?: () => void) => {
    setPending(true);
    setProblem(null);
    const result = await call();
    setPending(false);
    if (!result.ok) show(result.error);
    else done?.();
  };
  const switchTo = (next: Tab) => {
    setTab(next);
    setProblem(null);
    setNotice(null);
    setPassword("");
    setRepeat("");
  };

  const submit = () => {
    const trimmed = name.trim();
    if (tab === "forgot") {
      if (!trimmed) return setProblem("Enter your name.");
      return void run(() => auth.forgot(trimmed), () => setNotice(FORGOT_NOTICE));
    }
    const bad = validateName(trimmed) ?? validatePassword(password);
    if (bad) return show(bad);
    if (tab === "signup" && password !== repeat) return setProblem("Passwords don't match.");
    void run(() => (tab === "signup" ? auth.signUp(trimmed, password) : auth.logIn(trimmed, password)));
  };

  const busy = pending || auth.status === "loading";
  const primary = tab === "signup" ? "[ Create account ]" : tab === "forgot" ? "[ Send reset link ]" : "[ Log in ]";
  return (
    <AuthFrame title="CHRONICLES OF DEVLANDIA">
      <div role="tablist" className="grid w-full grid-cols-2 gap-2">
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => switchTo(t)}
            className={`rounded border-2 px-3 py-2 text-xs font-bold uppercase tracking-widest ${tab === t ? "border-[var(--primary-border)] bg-[var(--primary-strong)] text-[var(--text)]" : "border-[var(--panel-border)] text-[var(--text-muted)]"}`}
          >
            {t === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      <form
        className="flex w-full flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) submit();
        }}
      >
        <Field label="Name" value={name} onChange={setName} autoComplete="username" maxLength={12} />
        {tab !== "forgot" && (
          <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete={tab === "signup" ? "new-password" : "current-password"} />
        )}
        {tab === "signup" && <Field label="Repeat password" type="password" value={repeat} onChange={setRepeat} autoComplete="new-password" />}
        <Problem text={problem} />
        {auth.offline && !problem && <p role="status" className="text-xs text-[var(--text-muted)]">{AUTH_ERROR_COPY.unreachable}</p>}
        {notice && <p role="status" className="text-xs text-[var(--success-border)]">{notice}</p>}
        {tab === "login" && (
          <button type="button" onClick={() => switchTo("forgot")} className="self-start text-xs text-[var(--primary-border)] underline">
            Forgot your password?
          </button>
        )}
        <Button type="submit" variant="accent" disabled={busy} className="w-full">
          {pending ? (tab === "signup" ? "Creating…" : tab === "forgot" ? "Sending…" : "Logging in…") : primary}
        </Button>
        {tab === "forgot" && (
          <Button variant="ghost" onClick={() => switchTo("login")} className="w-full">
            [ Back ]
          </Button>
        )}
      </form>

      <div className="flex w-full flex-col gap-2">
        <Button variant="neutral" disabled={busy} onClick={() => void run(() => auth.logInWithGoogle())} className="w-full">
          [ Sign in with Google ]
        </Button>
        <Button variant="ghost" onClick={auth.playAsGuest} className="w-full">
          [ Play as guest ]
        </Button>
      </div>
      <p className="text-center text-xs text-[var(--text-muted)]">Your badges are saved to your account. Guest progress is not saved.</p>
    </AuthFrame>
  );
}
