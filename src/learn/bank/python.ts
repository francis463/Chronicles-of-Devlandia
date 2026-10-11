import type { ChestQuestion } from "../types";

/** The 71 names in Python's Built-in Functions table. */
const BUILTINS =
  "abs aiter all anext any ascii bin bool breakpoint bytearray bytes callable chr classmethod compile complex delattr dict dir divmod enumerate eval exec filter float format frozenset getattr globals hasattr hash help hex id input int isinstance issubclass iter len list locals map max memoryview min next object oct open ord pow print property range repr reversed round set setattr slice sorted staticmethod str sum super tuple type vars zip __import__";

/** `dir(list)` as Python 3.13 prints it. */
const LIST_NAMES =
  "__add__ __class__ __class_getitem__ __contains__ __delattr__ __delitem__ __dir__ __doc__ __eq__ __format__ __ge__ __getattribute__ __getitem__ __getstate__ __gt__ __hash__ __iadd__ __imul__ __init__ __init_subclass__ __iter__ __le__ __len__ __lt__ __mul__ __ne__ __new__ __reduce__ __reduce_ex__ __repr__ __reversed__ __rmul__ __setattr__ __setitem__ __sizeof__ __str__ __subclasshook__ append clear copy count extend index insert pop remove reverse sort";

export const PY1_BANK: readonly ChestQuestion[] = [
  {
    kind: "blank",
    id: "py-print",
    lang: "python",
    prompt: "Show the greeting on screen, without waiting for the player to type anything.",
    code: ['___("Hello, Devlandia!")'],
    answers: ["print"],
    caseSensitive: true,
    live: { kind: "legal", tokens: BUILTINS.split(" "), label: "a Python built-in function" },
    blocks: ["print", "len", "str", "echo", "printf", "Print"],
    hint: "It's the same word you'd use in English.",
    explain:
      "print() writes to the screen. input() shows its text too, but then waits for a reply: it's for asking, not telling. echo and printf belong to other languages.",
  },
  {
    kind: "choice",
    id: "py-range",
    lang: "python",
    prompt: "What does this print?",
    code: ["for i in range(3):", "    print(i)"],
    options: ["0, 1, 2 (one per line)", "1, 2, 3 (one per line)", "0, 1, 2, 3 (one per line)", "3"],
    correct: 0,
    hint: "range(3) starts at 0 and stops before 3.",
    explain: "range(n) counts from 0 up to n − 1.",
  },
  {
    kind: "choice",
    id: "py-def",
    lang: "python",
    prompt: "Which line starts a function in Python?",
    options: ["def greet():", "function greet() {", "void greet() {", "fn greet()"],
    correct: 0,
    codeOptions: true,
    hint: "Python's keyword is short for 'define'.",
    explain: "def starts a function, and the colon begins its indented body.",
  },
];

export const PY2_BANK: readonly ChestQuestion[] = [
  {
    kind: "blank",
    id: "py-append",
    lang: "python",
    prompt: 'Add "kiwi" to the end of the list.',
    code: ['fruits = ["apple", "fig"]', 'fruits.___("kiwi")'],
    answers: ["append"],
    caseSensitive: true,
    live: { kind: "legal", tokens: LIST_NAMES.split(" "), label: "a list method" },
    blocks: ["append", "insert", "extend", "add", "push"],
    hint: "The method's name means 'attach at the end', like an appendix at the back of a book.",
    explain: "append() adds one item to the end of a list. add is for Python sets, and push is JavaScript's.",
  },
  {
    kind: "choice",
    id: "py-len",
    lang: "python",
    prompt: "What does this print?",
    code: ['print(len("code"))'],
    options: ["4", "3", "5", "code"],
    correct: 0,
    codeOptions: true,
    hint: "Count the letters.",
    explain: "len() gives the number of characters: c, o, d, e.",
  },
  {
    kind: "choice",
    id: "py-if",
    lang: "python",
    prompt: "What does this print?",
    code: ["x = 7", "if x > 5:", '    print("big")', "else:", '    print("small")'],
    options: ["big", "small", "True", "nothing"],
    correct: 0,
    codeOptions: true,
    hint: "Is 7 greater than 5?",
    explain: "The condition is true, so only the if branch runs.",
  },
];
