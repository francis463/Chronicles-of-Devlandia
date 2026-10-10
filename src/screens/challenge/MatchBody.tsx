import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { ChallengeView } from "../../game/challenges";
import { order } from "../../learn/shuffle";
import type { MatchChallenge } from "../../learn/types";
import { CHANGE_ANSWER } from "./BlankBody";
import { SubmitRow } from "./SubmitRow";
import { Toolbar } from "./Toolbar";
import { useUndo } from "./useUndo";

/** One pair: snippet index, label data index, and the number (1–5) both items show. */
type Pair = { s: number; l: number; n: number };
type Side = "s" | "l";
const LABEL_ATTR = "data-match-label";
const keyOf = (p: Pair) => `${p.s}-${p.l}`;

/**
 * The Syntax Matcher: snippets on the left, labels on the right (in the game's shuffled order). Pick one on
 * each side to pair them, or drag a snippet onto a label with a mouse; SUBMIT sends each snippet's label index.
 */
export function MatchBody({
  challenge: c,
  view,
  onSubmit,
  hint,
}: {
  challenge: MatchChallenge;
  view: ChallengeView;
  onSubmit: (value: number[]) => void;
  hint: ReactNode;
}) {
  const labels = useMemo(() => order(c.pairs.length, view.seed, c.id), [c, view.seed]);
  const history = useUndo<Pair[]>([]);
  const pairs = history.value;
  const [selected, setSelected] = useState<{ side: Side; i: number } | null>(null);
  const [message, setMessage] = useState("");
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);
  const [wrongKeys, setWrongKeys] = useState<ReadonlySet<string>>(new Set());
  const [announce, setAnnounce] = useState({ text: "", n: 0 });
  const firstSnippet = useRef<HTMLButtonElement>(null);
  const total = c.pairs.length;

  const pairOf = (side: Side, i: number) => pairs.find((p) => (side === "s" ? p.s : p.l) === i);
  const link = (s: number, l: number) => {
    const rest = pairs.filter((p) => p.s !== s && p.l !== l);
    const n = [1, 2, 3, 4, 5].find((k) => !rest.some((p) => p.n === k))!;
    history.set([...rest, { s, l, n }]);
    setMessage(`Paired ${n}: ${c.pairs[s].snippet} with ${c.pairs[l].label}.`);
  };
  const linkRef = useRef(link);
  linkRef.current = link;

  const pick = (side: Side, i: number) => {
    const existing = pairOf(side, i);
    if (existing) {
      history.set(pairs.filter((p) => p !== existing));
      setMessage(`Unpaired ${existing.n}.`);
      return setSelected({ side, i });
    }
    if (selected?.side === side) return setSelected(selected.i === i ? null : { side, i });
    if (selected) {
      link(side === "s" ? i : selected.i, side === "l" ? i : selected.i);
      return setSelected(null);
    }
    setSelected({ side, i });
  };

  // A mouse or pen can drag a snippet onto a label.
  const drag = useRef<{ s: number; id: number; active: boolean } | null>(null);
  const handlers = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | null>(null);
  const endDrag = useCallback(() => {
    drag.current = null;
    if (handlers.current) {
      window.removeEventListener("pointermove", handlers.current.move);
      window.removeEventListener("pointerup", handlers.current.up);
      window.removeEventListener("pointercancel", endDrag);
    }
  }, []);
  useEffect(() => {
    handlers.current = {
      move: (e) => {
        if (drag.current && e.pointerId === drag.current.id) drag.current.active = true;
      },
      up: (e) => {
        const d = drag.current;
        if (d?.active && e.pointerId === d.id) {
          const over = (document.elementFromPoint?.(e.clientX, e.clientY) ?? e.target) as Element | null;
          const label = over?.closest?.(`[${LABEL_ATTR}]`)?.getAttribute(LABEL_ATTR);
          if (label != null) {
            linkRef.current(d.s, Number(label));
            setSelected(null);
          }
        }
        endDrag();
      },
    };
    return endDrag;
  }, [endDrag]);
  const startDrag = (s: number) => (e: ReactPointerEvent) => {
    if (e.pointerType === "touch") return;
    endDrag();
    drag.current = { s, id: e.pointerId, active: false };
    window.addEventListener("pointermove", handlers.current!.move);
    window.addEventListener("pointerup", handlers.current!.up);
    window.addEventListener("pointercancel", endDrag);
  };

  const value = Array.from({ length: total }, (_, s) => pairOf("s", s)?.l ?? -1);
  const wrongNow = view.error !== null;
  const reason =
    pairs.length < total
      ? `Pair all ${total} first (${pairs.length}/${total} paired).`
      : wrongNow && JSON.stringify(value) === lastSubmitted
        ? CHANGE_ANSWER
        : null;
  const press = () => {
    if (reason) return setAnnounce((a) => ({ text: reason, n: a.n + 1 }));
    setLastSubmitted(JSON.stringify(value));
    setWrongKeys(new Set(pairs.filter((p) => p.s !== p.l).map(keyOf)));
    onSubmit(value);
  };

  const describe = (side: Side, i: number) => {
    const p = pairOf(side, i);
    if (!p) return "not paired";
    return `pair ${p.n}${wrongNow && wrongKeys.has(keyOf(p)) ? ", wrong" : ""}`;
  };
  const itemClass = (side: Side, i: number) =>
    `flex min-h-11 w-full cursor-pointer items-center gap-2 rounded border-[1.5px] px-3 py-2 text-left font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] ${
      selected?.side === side && selected.i === i ? "border-[var(--accent-border)] bg-[var(--editor-bg)]" : "border-[var(--panel-border)]"
    }`;
  const tag = (side: Side, i: number) => {
    const p = pairOf(side, i);
    if (!p) return null;
    return (
      <span aria-hidden="true" className="ml-auto flex items-center gap-1">
        {wrongNow && wrongKeys.has(keyOf(p)) && <span className="text-[var(--danger-border)]">✗</span>}
        <span className="rounded px-1.5 font-bold text-[var(--bg)]" style={{ background: `var(--pair-${p.n})` }}>
          {p.n}
        </span>
      </span>
    );
  };

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="flex flex-col gap-2">
          {c.pairs.map((pair, s) => (
            <button
              key={s}
              ref={s === 0 ? firstSnippet : undefined}
              type="button"
              data-autofocus={s === 0 ? true : undefined}
              aria-pressed={selected?.side === "s" && selected.i === s}
              aria-label={`${pair.snippet}${pair.tag ? ` (${pair.tag})` : ""}, ${describe("s", s)}`}
              onClick={() => pick("s", s)}
              onPointerDown={startDrag(s)}
              className={`${itemClass("s", s)} text-[var(--code)]`}
            >
              <span className="break-all whitespace-pre-wrap">{pair.snippet}</span>
              {pair.tag && <span className="font-sans text-[var(--text-muted)]">{pair.tag}</span>}
              {tag("s", s)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {labels.map((l) => (
            <button
              key={l}
              type="button"
              {...{ [LABEL_ATTR]: String(l) }}
              aria-pressed={selected?.side === "l" && selected.i === l}
              aria-label={`${c.pairs[l].label}, ${describe("l", l)}`}
              onClick={() => pick("l", l)}
              className={itemClass("l", l)}
            >
              <span className="whitespace-nowrap">{c.pairs[l].label}</span>
              {tag("l", l)}
            </button>
          ))}
        </div>
      </div>
      <p data-testid="match-announce" role="status" className="sr-only">
        {message}
      </p>
      <Toolbar
        canUndo={history.canUndo}
        canReset={history.canReset}
        onUndo={() => {
          history.undo();
          setSelected(null);
        }}
        onReset={() => {
          history.reset();
          setSelected(null);
        }}
        focusBlank={() => firstSnippet.current?.focus()}
      />
      {view.error && (
        // A fresh node per wrong try, so the same words are announced again.
        <p key={view.wrongTries} role="alert" className="text-xs text-[var(--danger-border)]">
          {view.error}
        </p>
      )}
      <div className="flex flex-col gap-4 md:flex-row-reverse md:items-stretch">
        <SubmitRow label="[ SUBMIT MATCHES ]" reason={reason} announce={announce} onPress={press} />
        {hint}
      </div>
    </>
  );
}
