import { useEffect, useRef, useState } from "react";
import { lastSeq, REFUSALS, type ChatLine } from "../../hooks/useChat";
import { spoken } from "../speak";

const REFUSAL_GAP_MS = 3000;

/**
 * The one visually hidden polite status that speaks for chat. It is fed by new lines (not by DOM changes), so
 * lines an unmute brings back are never read, and it can also speak the event log while that list is hidden.
 */
export function Announcer({ lines, log = null }: { lines: readonly ChatLine[]; log?: { entries: readonly string[]; count: number } | null }) {
  const [said, setSaid] = useState<Array<{ id: number; text: string }>>([]);
  /** The newest seq already dealt with; what is on screen at mount is history. */
  const spokenSeq = useRef<number | null>(null);
  if (spokenSeq.current === null) spokenSeq.current = lastSeq(lines);
  const logSeen = useRef<number | null>(null);
  const refusedAt = useRef(new Map<string, number>());
  const counter = useRef(0);

  useEffect(() => {
    const out: string[] = [];
    const fresh = lines.filter((l) => l.seq > spokenSeq.current!);
    spokenSeq.current = Math.max(spokenSeq.current!, lastSeq(lines));
    for (const l of fresh) {
      if (l.silent || l.kind === "mine") continue;
      if (l.kind === "teammate") {
        out.push(`${l.name} says: ${l.text}`);
        continue;
      }
      if (l.kind === "note" && REFUSALS.includes(l.text)) {
        const at = Date.now();
        const last = refusedAt.current.get(l.text);
        if (last !== undefined && at - last < REFUSAL_GAP_MS) continue;
        refusedAt.current.set(l.text, at);
      }
      out.push(spoken(l.text));
    }

    if (!log) logSeen.current = null;
    else if (logSeen.current === null) logSeen.current = log.count;
    else {
      const first = log.count - log.entries.length;
      log.entries.forEach((entry, i) => {
        if (first + i + 1 > logSeen.current!) out.push(spoken(entry));
      });
      logSeen.current = log.count;
    }

    if (out.length) setSaid(out.map((text) => ({ id: ++counter.current, text })));
  }, [lines, log]);

  return (
    <div role="status" aria-live="polite" aria-label="Chat announcements" className="sr-only">
      {said.map((item) => (
        <div key={item.id}>{item.text}</div>
      ))}
    </div>
  );
}
