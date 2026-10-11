import { Fragment, type ReactNode } from "react";
import { CHESTS } from "../learn/chests";

/** Badges whose written name differs from how it is said (C++ I → "C++ 1", C# → "C sharp"), longest first. */
const SPOKEN = CHESTS.filter((c) => c.spoken !== c.badge).sort((a, b) => b.badge.length - a.badge.length);
const SAID = new Map(SPOKEN.map((c) => [c.badge, c.spoken]));
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A badge name as the game writes it: after `the ` (`the C# Badge`, `the C++ I Chest`) or in a list
 * (`(HTML, C#).`, `: Python I, SQL.`). Nicknames and free text never sit in those places.
 */
const BADGE = new RegExp(`(?<=\\bthe |\\(|: |, )(${SPOKEN.map((c) => escape(c.badge)).join("|")})(?= Badge| Chest|[,.)]|$)`, "g");

/** A game line with each badge name shown as written and read by its spoken form; other text is unchanged. */
export function speak(entry: string): ReactNode {
  const hits = [...entry.matchAll(BADGE)];
  if (hits.length === 0) return entry;
  const parts: ReactNode[] = [];
  let from = 0;
  hits.forEach((hit, i) => {
    const at = hit.index!;
    parts.push(
      <Fragment key={i}>
        {entry.slice(from, at)}
        <span aria-hidden="true">{hit[0]}</span>
        <span className="sr-only">{SAID.get(hit[0])}</span>
      </Fragment>,
    );
    from = at + hit[0].length;
  });
  parts.push(entry.slice(from));
  return <>{parts}</>;
}

/** The same text with each badge name in its spoken form (for the announcer). */
export const spoken = (entry: string): string => entry.replace(BADGE, (name) => SAID.get(name) ?? name);
