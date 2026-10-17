import { useEffect, useMemo, useRef, useState } from "react";
import {
  CERTIFICATE_SIZE,
  NAME_LIMIT,
  certificateFileName,
  certificateHtml,
  certificateName,
  drawCertificate,
  earnedBadgeNames,
  type CertificateData,
} from "../learn/certificate";
import type { ChestId } from "../learn/types";
import { TerminalDialog } from "../ui/TerminalDialog";

const BUTTON =
  "min-h-11 cursor-pointer rounded border-[1.5px] px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-border)] disabled:cursor-default disabled:opacity-50";

/**
 * The "Devlandia Graduate" certificate: a preview with the player's name (their account's, or whatever a guest types),
 * [ Download PNG ] for a picture and [ Print ] for a printable page.
 */
export function Certificate({
  name: initialName,
  badges,
  played,
  hard,
  date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
  onBack,
}: {
  name: string;
  badges: readonly ChestId[];
  played: string;
  hard: boolean;
  /** The award date as written; today's by default. */
  date?: string;
  onBack: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [note, setNote] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const data: CertificateData = useMemo(() => ({ name, badges, date, played, hard }), [name, badges, date, played, hard]);
  const drawn = useRef(false);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    drawn.current = !!ctx;
    if (ctx) drawCertificate(ctx, data);
  }, [data]);

  const download = () => {
    const url = canvas.current?.toDataURL("image/png");
    if (!drawn.current || !url) return setNote("Your browser can't make the picture here: use Print instead.");
    const link = document.createElement("a");
    link.href = url;
    link.download = certificateFileName(name);
    link.click();
    setNote("Saved: check your downloads.");
  };

  const print = () => {
    const page = window.open("", "_blank");
    if (!page) return setNote("Your browser blocked the print window: allow pop-ups for this site and try again.");
    page.document.write(certificateHtml(data));
    page.document.close();
    page.focus();
    page.print();
  };

  return (
    <TerminalDialog title="< DEVLANDIA GRADUATE CERTIFICATE >" onClose={onBack}>
      <div className="flex flex-col gap-3 text-xs">
        <label className="flex flex-col gap-1">
          <span className="font-bold">Name on the certificate</span>
          <input
            value={name}
            maxLength={NAME_LIMIT}
            onChange={(e) => setName(e.target.value)}
            placeholder="Explorer"
            className="min-h-11 rounded border-[1.5px] border-[var(--panel-border)] bg-[var(--editor-bg)] px-3 text-[var(--text)]"
          />
        </label>
        <canvas
          ref={canvas}
          width={CERTIFICATE_SIZE.width}
          height={CERTIFICATE_SIZE.height}
          role="img"
          aria-label={`Certificate: ${certificateName(name)} is a Devlandia Graduate with ${earnedBadgeNames(badges).length} language badges, awarded ${date}.`}
          className="w-full rounded border-[1.5px] border-[var(--panel-border)]"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={download} className={`${BUTTON} border-[var(--primary-border)] text-[var(--primary-border)]`}>
            [ Download PNG ]
          </button>
          <button type="button" onClick={print} className={`${BUTTON} border-[var(--accent-border)] text-[var(--accent)]`}>
            [ Print ]
          </button>
          <button type="button" onClick={onBack} className={`${BUTTON} border-[var(--panel-border)]`}>
            [ Back ]
          </button>
        </div>
        <p role="status" className="text-[var(--text-muted)]">{note}</p>
      </div>
    </TerminalDialog>
  );
}
