import { useState, type KeyboardEvent } from "react";
import { TerminalDialog } from "../ui/TerminalDialog";
import { CONTROLS, HELP_TABS, PLAY, TIPS, TUTORIAL, type HelpTab } from "./helpContent";

const BUTTON =
  "min-h-11 cursor-pointer rounded border-[1.5px] px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] disabled:cursor-default disabled:opacity-50";

function Tutorial() {
  const [step, setStep] = useState(0);
  const s = TUTORIAL[step];
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div role="meter" aria-label="Tutorial progress" aria-valuemin={1} aria-valuemax={TUTORIAL.length} aria-valuenow={step + 1} className="h-2 w-full rounded-sm border border-[var(--panel-border)]">
        <div className="h-full bg-[var(--primary-border)] transition-all" style={{ width: `${((step + 1) / TUTORIAL.length) * 100}%` }} />
      </div>
      <h3 className="text-sm font-bold text-[var(--accent)]">{`Step ${step + 1} of ${TUTORIAL.length}: ${s.title}`}</h3>
      <p>{s.text}</p>
      <p className="rounded border-[1.5px] border-dashed border-[var(--primary-border)] px-3 py-2">
        <span className="font-bold text-[var(--primary-border)]">Try it: </span>
        {s.tryIt}
      </p>
      <div className="flex gap-2">
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className={`${BUTTON} border-[var(--panel-border)]`}>
          [ Back ]
        </button>
        <button type="button" disabled={step === TUTORIAL.length - 1} onClick={() => setStep(step + 1)} className={`${BUTTON} border-[var(--primary-border)] text-[var(--primary-border)]`}>
          [ Next ]
        </button>
      </div>
    </div>
  );
}

/**
 * Help and tutorial: controls (keyboard and touch), how to play, a six-step tutorial and tips.
 * `?` and Esc close it here: the game's key handling is paused while it is open.
 */
export function Help({ onClose, initial = "controls" }: { onClose: () => void; initial?: HelpTab }) {
  const [tab, setTab] = useState<HelpTab>(initial);
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "?") {
      event.preventDefault();
      onClose();
    }
  };
  const move = (event: KeyboardEvent<HTMLButtonElement>) => {
    const at = HELP_TABS.findIndex((t) => t.id === tab);
    const to = event.key === "ArrowRight" ? at + 1 : event.key === "ArrowLeft" ? at - 1 : null;
    if (to === null) return;
    event.preventDefault();
    const next = HELP_TABS[(to + HELP_TABS.length) % HELP_TABS.length].id;
    setTab(next);
    document.getElementById(`help-tab-${next}`)?.focus();
  };

  return (
    // The wrapper only listens: Esc and ? must work wherever focus is inside the dialog.
    <div onKeyDown={keys}>
      <TerminalDialog title="< HELP & TUTORIAL >" onClose={onClose}>
        <div role="tablist" aria-label="Help topics" className="flex flex-wrap gap-2">
          {HELP_TABS.map((t) => (
            <button
              key={t.id}
              id={`help-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              aria-controls="help-panel"
              tabIndex={tab === t.id ? 0 : -1}
              data-autofocus={t.id === initial ? true : undefined}
              onClick={() => setTab(t.id)}
              onKeyDown={move}
              className={`${BUTTON} ${tab === t.id ? "border-[var(--primary-border)] font-bold text-[var(--primary-border)]" : "border-[var(--panel-border)] text-[var(--text-muted)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div id="help-panel" role="tabpanel" aria-labelledby={`help-tab-${tab}`} className="text-xs">
          {tab === "controls" && (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[var(--text-muted)]">
                  <th className="py-1 pr-3 font-bold">Keyboard</th>
                  <th className="py-1 pr-3 font-bold">Touch</th>
                  <th className="py-1 font-bold">What it does</th>
                </tr>
              </thead>
              <tbody>
                {CONTROLS.map((c) => (
                  <tr key={c.keys} className="border-t border-[var(--panel-border)] align-top">
                    <td className="py-2 pr-3 font-bold text-[var(--accent)]">{c.keys}</td>
                    <td className="py-2 pr-3">{c.touch}</td>
                    <td className="py-2">{c.does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === "play" && (
            <div className="flex flex-col gap-3">
              {PLAY.map((p) => (
                <section key={p.title} aria-label={p.title}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">{p.title}</h3>
                  <p className="mt-1">{p.text}</p>
                </section>
              ))}
            </div>
          )}
          {tab === "tutorial" && <Tutorial />}
          {tab === "tips" && (
            <ul className="flex list-disc flex-col gap-2 pl-4">
              {TIPS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      </TerminalDialog>
    </div>
  );
}
