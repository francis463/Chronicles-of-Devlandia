import type { ChestQuestion } from "../types";

export const CSS_BANK: readonly [ChestQuestion, ChestQuestion, ChestQuestion] = [
  {
    kind: "blank",
    id: "css-color",
    lang: "css",
    prompt: "Make the paragraph text red.",
    code: ["p {", "  ___: red;", "}"],
    answers: ["color", "-webkit-text-fill-color"],
    caseSensitive: false,
    live: {
      kind: "notLegal",
      tokens: ["text-color", "font-color", "colour", "text-colour", "foreground"],
      label: "a CSS property",
    },
    blocks: ["color", "background-color", "border-color", "text-color", "font-color"],
    hint: "CSS uses American spelling for this property.",
    explain:
      "color sets the text colour; background-color sets the colour behind it. (-webkit-text-fill-color also paints text red in most browsers, but color is the standard way.)",
  },
  {
    kind: "choice",
    id: "css-id",
    lang: "css",
    prompt: 'Which selector targets the element with id="hero"?',
    options: ["#hero", ".hero", "hero", "*hero"],
    correct: 0,
    codeOptions: true,
    hint: "Classes use a dot; ids use a different symbol.",
    explain: "# selects by id, . selects by class, and a bare name selects a tag.",
  },
  {
    kind: "choice",
    id: "css-margin",
    lang: "css",
    prompt: ".box { margin: 10px 20px; } — how much margin is on the left?",
    options: ["20px", "10px", "0", "30px"],
    correct: 0,
    codeOptions: true,
    hint: "With two values, the first is top and bottom, the second is left and right.",
    explain: "margin: 10px 20px means 10px top and bottom, 20px left and right.",
  },
];
