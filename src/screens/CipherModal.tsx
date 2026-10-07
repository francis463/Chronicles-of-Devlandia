import { useState } from "react";
import { CIPHER_HINT, PUZZLE_HINT_LOCKED, SCROLL_CIPHERTEXT } from "../game/constants";
import { Button } from "../ui/Button";
import { TerminalDialog } from "../ui/TerminalDialog";

export function CipherModal({
  error,
  hintRevealed,
  onSubmit,
  onClose,
  onRevealHint,
}: {
  error: string | null;
  hintRevealed: boolean;
  onSubmit: (value: string) => void;
  onClose: () => void;
  onRevealHint: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <TerminalDialog title="< SCROLL CIPHER: ROT13 >" onClose={onClose}>
      <div className="flex flex-col gap-1 text-xs">
        <span className="font-bold">SCROLL INSTRUCTIONS:</span>
        <p className="text-[var(--text-muted)]">Decode the scroll to learn where the artifact is hidden.</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(value);
        }}
        className="overflow-x-auto rounded-md border-2 border-[var(--panel-border)] bg-[var(--editor-bg)] p-4 font-mono text-[13px] leading-7 whitespace-pre text-[var(--code)]"
      >
        <div>1 | // ROT13: every letter is shifted 13 places</div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{`2 | rot13("${SCROLL_CIPHERTEXT}")  →`}</span>
          <input
            aria-label="decoded text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="plain text"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="characters"
            className="w-40 max-w-full rounded border border-dashed border-[var(--accent)] bg-transparent px-2 font-mono text-[var(--accent)] uppercase outline-none placeholder:text-[var(--text-muted)] placeholder:normal-case focus:border-solid"
          />
        </div>
      </form>

      {error && (
        <p role="alert" className="text-xs text-[var(--danger-border)]">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        <section
          aria-label="AI drone hint"
          className="flex-1 rounded-md border-2 border-[var(--primary-border)] bg-[var(--panel)] p-4"
        >
          <h3 className="text-sm text-[var(--primary-border)]">SMART AI DRONE DIAGNOSTIC HINT:</h3>
          <p className="mt-2 text-xs">{hintRevealed ? CIPHER_HINT : PUZZLE_HINT_LOCKED}</p>
        </section>
        <div className="flex flex-col gap-2 md:w-80">
          <Button variant="success" className="w-full py-3" onClick={() => onSubmit(value)}>
            [ SUBMIT DECODE ]
          </Button>
          <Button variant="neutral" className="w-full py-3" onClick={onRevealHint}>
            [ USE HINT ITEM ]
          </Button>
        </div>
      </div>
    </TerminalDialog>
  );
}
