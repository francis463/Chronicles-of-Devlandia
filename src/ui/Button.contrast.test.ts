import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Reads the real design tokens and the real Button variant classes so the check
// tracks the source instead of a copy of it.
const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
const button = readFileSync(resolve(__dirname, "Button.tsx"), "utf8");

const tokens = Object.fromEntries(
  [...css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]),
);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const variants = [...button.matchAll(/^\s*(\w+): "([^"]+)",$/gm)].map(([, name, classes]) => {
  const bg = classes.match(/(?:^|\s)bg-\[var\((--[\w-]+)\)\]/)?.[1];
  const text = classes.match(/(?:^|\s)text-\[var\((--[\w-]+)\)\]/)?.[1];
  return { name, bg, text };
});

describe("Button text contrast (WCAG AA, 4.5:1 for 12px bold text)", () => {
  it("finds all six variants", () => {
    expect(variants.map((v) => v.name).sort()).toEqual(
      ["accent", "danger", "ghost", "neutral", "primary", "success"].sort(),
    );
  });

  it.each(variants)("$name variant text meets 4.5:1", ({ name, bg, text }) => {
    expect(text, `${name} text token`).toBeDefined();
    const backgrounds = bg ? [bg] : ["--panel", "--bg"]; // ghost is transparent over panels/HUD bars
    for (const surface of backgrounds) {
      const ratio = contrast(tokens[text!], tokens[surface]);
      expect(ratio, `${name}: ${text} on ${surface} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("Matcher pair tags", () => {
  it.each([1, 2, 3, 4, 5])("--pair-%i is at least 3:1 on --panel, and its number (--bg) at least 4.5:1 on the tag", (n) => {
    const tag = tokens[`--pair-${n}`];
    expect(tag, `--pair-${n}`).toBeDefined();
    expect(contrast(tag, tokens["--panel"])).toBeGreaterThanOrEqual(3);
    expect(contrast(tokens["--bg"], tag)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Chest captions", () => {
  it("--code-chest on the caption chip is at least 4.5:1", () => {
    const chest = tokens["--code-chest"];
    expect(chest, "--code-chest").toBe("#2dd4bf");
    // The chip is the page colour at 80 % over the map: on its own, and over the lightest ground (white at worst).
    const overWhite = `#${[1, 3, 5].map((i) => Math.round(0.8 * parseInt(tokens["--bg"].slice(i, i + 2), 16) + 0.2 * 255).toString(16).padStart(2, "0")).join("")}`;
    for (const chip of [tokens["--bg"], overWhite]) expect(contrast(chest, chip), `on ${chip}`).toBeGreaterThanOrEqual(4.5);
  });
});
