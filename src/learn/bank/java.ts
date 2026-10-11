import type { ChestQuestion } from "../types";

/** Every public method name of java.io.PrintStream in Java 21, inherited ones included. */
const PRINT_STREAM =
  "append charset checkError close equals flush format getClass hashCode notify notifyAll nullOutputStream print printf println toString wait write writeBytes";

export const JAVA_BANK: readonly ChestQuestion[] = [
  {
    kind: "blank",
    id: "java-println",
    lang: "java",
    prompt: "Print Hello on its own line.",
    code: ['System.out.___("Hello");'],
    answers: ["println"],
    caseSensitive: true,
    live: { kind: "legal", tokens: PRINT_STREAM.split(" "), label: "a System.out method" },
    blocks: ["println", "print", "printf", "log", "echo"],
    hint: "The method's name ends with 'ln', for line.",
    explain: "println prints and ends the line; print and printf don't end it. log and echo aren't System.out methods.",
  },
  {
    kind: "choice",
    id: "java-int",
    lang: "java",
    prompt: "Which type holds whole numbers like 42?",
    options: ["int", "String", "boolean", "double"],
    correct: 0,
    codeOptions: true,
    hint: "Short for 'integer'.",
    explain: "int stores whole numbers; double stores decimals and String stores text.",
  },
  {
    kind: "choice",
    id: "java-plus-eq",
    lang: "java",
    prompt: "What does this print?",
    code: ["int x = 10;", "x += 5;", "System.out.println(x);"],
    options: ["15", "105", "10", "5"],
    correct: 0,
    codeOptions: true,
    hint: "x += 5 means x = x + 5.",
    explain: "+= adds to the variable, so x becomes 15.",
  },
];
