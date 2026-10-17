import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, Problem } from "../screens/authParts";
import { AUTH_ERROR_COPY, type Result } from "./authClient";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A signed-in player adds a real email, so "Forgot your password?" can reach them. */
export function AddEmail({ onAdd, onClose }: { onAdd: (email: string) => Promise<Result>; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const trimmed = email.trim();
    if (!EMAIL.test(trimmed)) return setProblem("Enter a valid email.");
    setPending(true);
    setProblem(null);
    const result = await onAdd(trimmed);
    setPending(false);
    if (result.ok) setDone(true);
    else setProblem(AUTH_ERROR_COPY[result.error]);
  };

  return (
    <form
      className="mt-4 flex w-[240px] flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending && !done) void submit();
      }}
    >
      <Field label="Email" value={email} onChange={setEmail} autoComplete="email" />
      <Problem text={problem} />
      {done && <p role="status" className="text-xs text-[var(--success-border)]">Check your inbox to confirm it.</p>}
      <Button type="submit" disabled={pending || done} className="w-full">
        [ Save email ]
      </Button>
      <Button variant="ghost" onClick={onClose} className="w-full">
        [ Close ]
      </Button>
    </form>
  );
}
