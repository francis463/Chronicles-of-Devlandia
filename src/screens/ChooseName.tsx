import { useState } from "react";
import { AUTH_ERROR_COPY } from "../auth/authClient";
import { validateName } from "../auth/nameRules";
import type { Auth } from "../auth/useAuth";
import { Button } from "../ui/Button";
import { AuthFrame, Field, Problem } from "./authParts";

/** A Google player's one extra step: the name teammates will see. */
export function ChooseName({ auth }: { auth: Auth }) {
  const [name, setName] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    const bad = validateName(trimmed);
    if (bad) return setProblem(AUTH_ERROR_COPY[bad]);
    setPending(true);
    setProblem(null);
    const result = await auth.chooseName(trimmed);
    setPending(false);
    if (!result.ok) setProblem(AUTH_ERROR_COPY[result.error]);
  };

  return (
    <AuthFrame title="CHOOSE YOUR NAME">
      <p className="text-center text-sm text-[var(--primary-border)]">This is the name your teammates see.</p>
      <form
        className="flex w-full flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending) void submit();
        }}
      >
        <Field label="Name" value={name} onChange={setName} autoComplete="username" maxLength={12} />
        <Problem text={problem} />
        <Button type="submit" variant="accent" disabled={pending} className="w-full">
          [ Continue ]
        </Button>
      </form>
      <Button variant="ghost" onClick={() => void auth.logOut()} className="w-full">
        [ Log out ]
      </Button>
    </AuthFrame>
  );
}
