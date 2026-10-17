import { CHESTS } from "./chests";
import type { ChestId } from "./types";

/** What a "Devlandia Graduate" certificate says. */
export type CertificateData = {
  /** The player's name; blank reads as "Explorer". */
  name: string;
  badges: readonly ChestId[];
  /** The date it is awarded, already written out. */
  date: string;
  /** The in-game time played, such as "3 h 20 min". */
  played: string;
  hard: boolean;
};

export const CERTIFICATE_SIZE = { width: 1100, height: 780 } as const;
export const NAME_LIMIT = 24;

const PAPER = "#fdf6e3";
const INK = "#1f2937";
const GOLD = "#b45309";
const GREEN = "#15803d";

/** The name as it prints: trimmed to NAME_LIMIT, "Explorer" when blank. */
export const certificateName = (name: string): string => name.trim().slice(0, NAME_LIMIT) || "Explorer";

/** The badges earned, as the written badge names in chest-table order. */
export const earnedBadgeNames = (badges: readonly ChestId[]): string[] => CHESTS.filter((c) => badges.includes(c.id)).map((c) => c.badge);

/** A file name for the download: devlandia-certificate-ada-lovelace.png. */
export function certificateFileName(name: string): string {
  const slug = certificateName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "explorer";
  return `devlandia-certificate-${slug}.png`;
}

/** Draws the certificate on a canvas of CERTIFICATE_SIZE. */
export function drawCertificate(ctx: CanvasRenderingContext2D, data: CertificateData): void {
  const { width: w, height: h } = CERTIFICATE_SIZE;
  const names = earnedBadgeNames(data.badges);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, w - 48, h - 48);
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, w - 88, h - 88);
  ctx.textAlign = "center";
  const line = (text: string, y: number, size: number, color: string, weight = "normal", x = w / 2) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px "Courier New", monospace`;
    ctx.fillText(text, x, y);
  };
  line("CHRONICLES OF DEVLANDIA", 120, 26, GOLD, "bold");
  line("CERTIFICATE OF COMPLETION", 190, 44, INK, "bold");
  line("Devlandia Graduate", 245, 30, GOLD, "bold");
  line("This certifies that", 310, 22, INK);
  line(certificateName(data.name), 380, 56, INK, "bold");
  ctx.fillStyle = GOLD;
  ctx.fillRect(w / 2 - 260, 396, 520, 3);
  line(`has earned all ${names.length} language badges${data.hard ? " on hard mode" : ""}:`, 445, 22, INK);
  // Four even columns across the page, the last row centred under them.
  names.forEach((badge, i) => {
    const row = Math.floor(i / 4);
    const inRow = Math.min(4, names.length - row * 4);
    const x = w / 2 + ((i % 4) - (inRow - 1) / 2) * 230;
    line(`✓ ${badge}`, 505 + row * 50, 24, GREEN, "bold", x);
  });
  line(`Awarded ${data.date} · Game time ${data.played}`, h - 90, 20, INK);
}

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The printable page: the same certificate as HTML, light on ink, sized to one landscape sheet. */
export function certificateHtml(data: CertificateData): string {
  const items = earnedBadgeNames(data.badges)
    .map((b) => `<li>✓ ${escapeHtml(b)}</li>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Devlandia Graduate: ${escapeHtml(certificateName(data.name))}</title>
<style>
@page { size: landscape; margin: 12mm; }
body { margin: 0; font-family: "Courier New", monospace; color: ${INK}; background: ${PAPER}; }
.sheet { box-sizing: border-box; min-height: 92vh; margin: 0; padding: 28px 36px; border: 6px double ${GOLD}; text-align: center; }
h1 { margin: 8px 0 4px; font-size: 34px; } h2 { margin: 0 0 18px; color: ${GOLD}; font-size: 24px; }
.kicker { color: ${GOLD}; font-weight: bold; letter-spacing: 3px; }
.name { margin: 10px auto 6px; padding-bottom: 6px; border-bottom: 3px solid ${GOLD}; width: 70%; font-size: 44px; font-weight: bold; }
ul { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 18px; margin: 18px 0; padding: 0; list-style: none; color: ${GREEN}; font-weight: bold; }
.foot { margin-top: 24px; font-size: 14px; }
</style></head><body><div class="sheet">
<p class="kicker">CHRONICLES OF DEVLANDIA</p><h1>CERTIFICATE OF COMPLETION</h1><h2>Devlandia Graduate</h2>
<p>This certifies that</p><p class="name">${escapeHtml(certificateName(data.name))}</p>
<p>has earned all ${earnedBadgeNames(data.badges).length} language badges${data.hard ? " on hard mode" : ""}:</p>
<ul>${items}</ul>
<p class="foot">Awarded ${escapeHtml(data.date)} · Game time ${escapeHtml(data.played)}</p>
</div></body></html>`;
}
