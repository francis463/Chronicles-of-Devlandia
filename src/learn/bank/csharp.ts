import type { ChestQuestion } from "../types";

/** Every public method name of System.Console in .NET 8, those inherited from object included. */
const CONSOLE =
  "Beep Clear Equals GetCursorPosition GetHashCode GetType MoveBufferArea OpenStandardError OpenStandardInput OpenStandardOutput Read ReadKey ReadLine ReferenceEquals ResetColor SetBufferSize SetCursorPosition SetError SetIn SetOut SetWindowPosition SetWindowSize ToString Write WriteLine";

export const CSHARP_BANK: readonly ChestQuestion[] = [
  {
    kind: "blank",
    id: "cs-writeline",
    lang: "csharp",
    prompt: "Print the greeting on its own line.",
    code: ['Console.___("Hello, Devlandia!");'],
    answers: ["WriteLine"],
    caseSensitive: true,
    live: { kind: "legal", tokens: CONSOLE.split(" "), label: "a Console method" },
    blocks: ["WriteLine", "Write", "ReadLine", "println", "writeline"],
    hint: "C# method names start with a capital letter.",
    explain:
      "Console.WriteLine prints a line; Write prints without ending it. C# names are case-sensitive, so writeline isn't the same method.",
  },
  {
    kind: "choice",
    id: "cs-var",
    lang: "csharp",
    prompt: "In C#, which keyword declares a local variable whose type the compiler works out?",
    options: ["var", "val", "auto", "dim"],
    correct: 0,
    codeOptions: true,
    hint: "It's short for 'variable'.",
    explain:
      "var lets C# infer a local variable's type from its value. val is Kotlin, auto does the same job in C++, and Dim declares variables in Visual Basic.",
  },
  {
    kind: "choice",
    id: "cs-interp",
    lang: "csharp",
    prompt: "What does this print?",
    code: ['string name = "Ada";', 'Console.WriteLine($"Hi {name}");'],
    options: ["Hi Ada", "Hi {name}", "$Hi Ada", "Hi name"],
    correct: 0,
    codeOptions: true,
    hint: "The $ before the quotes fills in the braces.",
    explain: 'An interpolated string ($"…") replaces {name} with the variable\'s value.',
  },
];
