import type { ChestQuestion } from "../types";

export const CPP1_BANK: readonly [ChestQuestion, ChestQuestion, ChestQuestion] = [
  {
    kind: "blank",
    id: "cpp-cout",
    lang: "cpp",
    prompt: "Print Hello to standard output (the normal output, not the error stream).",
    code: ["#include <iostream>", "int main() {", '  std::___ << "Hello";', "}"],
    answers: ["cout", "wcout"],
    caseSensitive: true,
    // The complete set of standard stream objects.
    live: {
      kind: "legal",
      tokens: ["cout", "cin", "cerr", "clog", "wcout", "wcin", "wcerr", "wclog"],
      label: "a standard stream object",
    },
    blocks: ["cout", "cin", "cerr", "print", "console"],
    hint: "It's the 'character output' stream.",
    explain:
      "std::cout is the standard output stream; << sends text into it. std::cerr and std::clog reach the screen too, but they are the error and log streams. std::wcout is cout's wide-character twin.",
  },
  {
    kind: "choice",
    id: "cpp-semicolon",
    lang: "cpp",
    prompt: "What ends almost every statement in C++?",
    options: [";", ".", ":", "nothing"],
    correct: 0,
    codeOptions: true,
    hint: "Devlandia's lost artifact is one of these.",
    explain: "A semicolon ends a C++ statement, the very thing the Golden Semicolon stands for.",
  },
  {
    kind: "choice",
    id: "cpp-int-div",
    lang: "cpp",
    prompt: "What does this print?",
    code: ["int a = 7 / 2;", "std::cout << a;"],
    options: ["3", "3.5", "4", "2"],
    correct: 0,
    codeOptions: true,
    hint: "Both numbers are whole numbers.",
    explain: "Dividing two ints drops the remainder, so 7 / 2 is 3.",
  },
];

export const CPP2_BANK: readonly [ChestQuestion, ChestQuestion, ChestQuestion] = [
  {
    kind: "blank",
    id: "cpp-for",
    lang: "cpp",
    prompt: "Make the loop print 012.",
    code: ["for (int i = 0; i ___ 3; i++) {", "  std::cout << i;", "}"],
    answers: ["<", "!=", "not_eq"],
    caseSensitive: true,
    // The three-way <=> is a category of its own, so it is truthfully not one.
    live: {
      kind: "legal",
      tokens: ["<", "<=", ">", ">=", "==", "!=", "not_eq"],
      label: "a relational or equality operator",
    },
    blocks: ["<", "<=", ">", "=>", "=<"],
    hint: "The loop must stop before i reaches 3.",
    explain:
      "i < 3 runs for 0, 1 and 2. i != 3 (also spelled not_eq) does too, but < is the usual choice because it still stops if i ever jumps past 3. => and =< aren't C++ operators.",
  },
  {
    kind: "choice",
    id: "cpp-address",
    lang: "cpp",
    prompt: "Which expression gives the address of a variable x?",
    options: ["&x", "*x", "#x", "@x"],
    correct: 0,
    codeOptions: true,
    hint: "The 'and' sign.",
    explain: "&x is the address of x; *p reads what a pointer p points to.",
  },
  {
    kind: "choice",
    id: "cpp-ref",
    lang: "cpp",
    prompt: "What does this print?",
    code: ["int n = 5;", "int& r = n;", "r = 9;", "std::cout << n;"],
    options: ["9", "5", "14", "Error"],
    correct: 0,
    codeOptions: true,
    hint: "r is another name for n.",
    explain: "A reference is an alias: changing r changes n.",
  },
];
