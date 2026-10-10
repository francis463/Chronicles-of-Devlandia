import type { ChestQuestion } from "../types";

export const PHP_BANK: readonly [ChestQuestion, ChestQuestion, ChestQuestion] = [
  {
    kind: "blank",
    id: "php-echo",
    lang: "php",
    prompt: "Print the greeting.",
    code: ["<?php", '  ___ "Hello, Devlandia!";', "?>"],
    answers: ["echo", "print"],
    caseSensitive: false,
    // Exactly the reserved words that parse in this line.
    live: {
      kind: "legal",
      tokens: ["echo", "print", "return", "include", "include_once", "require", "require_once", "throw", "clone"],
      label: "a PHP keyword that can take a string here",
    },
    blocks: ["echo", "return", "include", "console.log", "printf"],
    hint: "PHP's usual output statement echoes what you give it.",
    explain: "echo (or print) sends text to the page. console.log is JavaScript, and printf is a function that needs brackets.",
  },
  {
    kind: "choice",
    id: "php-var",
    lang: "php",
    prompt: "What symbol comes before every PHP variable's name?",
    options: ["$", "@", "#", "&"],
    correct: 0,
    codeOptions: true,
    hint: "It's a currency symbol.",
    explain: "PHP variables are written with a $ before the name, as in $name.",
  },
  {
    kind: "choice",
    id: "php-concat",
    lang: "php",
    prompt: "What does this print?",
    code: ['<?php $a = 5; $b = "5"; echo $a . $b; ?>'],
    options: ["55", "10", "5 5", "Error"],
    correct: 0,
    codeOptions: true,
    hint: "In PHP the dot joins strings; it doesn't add.",
    explain: 'The . operator concatenates, so 5 and "5" become "55".',
  },
];
