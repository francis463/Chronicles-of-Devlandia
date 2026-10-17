import { useState } from "react";
import { AUTH_ERROR_COPY } from "../auth/authClient";
import { validatePassword } from "../auth/nameRules";
import type { Auth } from "../auth/useAuth";
import { Button } from "../ui/Button";
import { AuthFrame, Field, Problem } from "./authParts";

/** Where a password-reset link lands. */
export function SetPassword({ auth }: { auth: Auth }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const weak = validatePassword(password);
    if (weak) return setProblem(AUTH_ERROR_COPY[weak]);
    if (password !== repeat) return setProblem("Passwords don't match.");
    setPending(true);
    setProblem(null);
    const result = await auth.setPassword(password);
    setPending(false);
    if (!result.ok) setProblem(AUTH_ERROR_COPY[result.error]);
  };

  return (
    <AuthFrame title="SET A NEW PASSWORD">
      <form
        className="flex w-full flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending) void submit();
        }}
      >
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <Field label="Repeat password" type="password" value={repeat} onChange={setRepeat} autoComplete="new-password" />
        <Problem text={problem} />
        <Button type="submit" variant="accent" disabled={pending} className="w-full">
          [ Save password ]
        </Button>
      </form>
      <Button variant="ghost" onClick={() => void auth.logOut()} className="w-full">
        [ Cancel ]
      </Button>
    </AuthFrame>
  );
}
