import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_SIZE,
  NAME_LIMIT,
  certificateFileName,
  certificateHtml,
  certificateName,
  drawCertificate,
  earnedBadgeNames,
  type CertificateData,
} from "./certificate";
import { CHEST_IDS, CHESTS } from "./chests";

const data: CertificateData = { name: "Ada Lovelace", badges: [...CHEST_IDS], date: "October 17, 2026", played: "3 h 20 min", hard: false };

describe("certificate text", () => {
  it("names the player, trims long names and falls back to Explorer", () => {
    expect(certificateName("  Ada  ")).toBe("Ada");
    expect(certificateName("   ")).toBe("Explorer");
    expect(certificateName("x".repeat(40))).toHaveLength(NAME_LIMIT);
  });

  it("lists the badges earned, in chest-table order", () => {
    expect(earnedBadgeNames([...CHEST_IDS])).toEqual(CHESTS.map((c) => c.badge));
    expect(earnedBadgeNames(["chest-js", "chest-html"])).toEqual(["HTML", "JavaScript"]);
  });

  it("makes a safe file name", () => {
    expect(certificateFileName("Ada Lovelace")).toBe("devlandia-certificate-ada-lovelace.png");
    expect(certificateFileName("")).toBe("devlandia-certificate-explorer.png");
    expect(certificateFileName("../../x")).toBe("devlandia-certificate-x.png");
  });
});

describe("the printable page", () => {
  it("holds the name, the date, the time and all 11 badges", () => {
    const html = certificateHtml(data);
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("October 17, 2026");
    expect(html).toContain("3 h 20 min");
    expect(html).toContain("all 11 language badges");
    for (const c of CHESTS) expect(html).toContain(`✓ ${c.badge}`);
  });

  it("escapes a name that tries to be HTML", () => {
    const html = certificateHtml({ ...data, name: '<img src=x onerror="alert(1)">' });
    expect(html).not.toContain("<img");
    expect(html).toContain("&#60;img");
  });

  it("says hard mode for a hard run, and Explorer for no name", () => {
    expect(certificateHtml({ ...data, hard: true })).toContain("on hard mode");
    expect(certificateHtml({ ...data, name: "" })).toContain("Explorer");
  });
});

describe("drawCertificate", () => {
  it("paints the page, the name and a tick for each badge on the context it is given", () => {
    const texts: string[] = [];
    const ctx = {
      fillRect: () => {},
      strokeRect: () => {},
      fillText: (t: string) => texts.push(t),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "",
    } as unknown as CanvasRenderingContext2D;
    drawCertificate(ctx, data);
    expect(texts).toContain("Ada Lovelace");
    expect(texts.filter((t) => t.startsWith("✓ "))).toHaveLength(11);
    expect(texts.some((t) => t.includes("October 17, 2026"))).toBe(true);
    expect(CERTIFICATE_SIZE).toEqual({ width: 1100, height: 780 });
  });
});
