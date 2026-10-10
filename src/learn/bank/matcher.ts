import type { MatchChallenge } from "../types";

const TITLE = "< SYNTAX TERMINAL: DEV VILLAGE >";
const LANGUAGE_PROMPT = "Match each snippet to its language, then submit to print the Archive's access code.";
const LANGUAGE_HINT = "Look for each language's tell-tale symbols: $ for PHP, :: for C++, tags for HTML.";

/** The Syntax Terminal's three rounds; one is rolled per game. */
export const MATCHER_ROUNDS: readonly [MatchChallenge, MatchChallenge, MatchChallenge] = [
  {
    kind: "match",
    id: "matcher-1",
    lang: "logic",
    title: TITLE,
    prompt: LANGUAGE_PROMPT,
    hint: LANGUAGE_HINT,
    pairs: [
      { snippet: "SELECT name FROM users;", label: "SQL" },
      { snippet: '$name = "Ada"; echo $name;', label: "PHP" },
      { snippet: 'System.out.println("Hi");', label: "Java" },
      { snippet: 'print("Hi")', label: "Python" },
      { snippet: "<p>Hi</p>", label: "HTML" },
    ],
    explain:
      "Each language has its own tell: SQL reads like English commands, PHP variables start with $, Java prints through System.out, Python's print needs no semicolon, and HTML uses tags.",
  },
  {
    kind: "match",
    id: "matcher-2",
    lang: "logic",
    title: TITLE,
    prompt: LANGUAGE_PROMPT,
    hint: LANGUAGE_HINT,
    pairs: [
      { snippet: 'std::cout << "Hi";', label: "C++" },
      { snippet: 'Console.WriteLine("Hi");', label: "C#" },
      { snippet: "h1 { color: teal; }", label: "CSS" },
      { snippet: 'def hi(): return "Hi"', label: "Python" },
      { snippet: "INSERT INTO users VALUES ('Ada');", label: "SQL" },
    ],
    explain:
      "C++ streams text with <<, C# uses Console.WriteLine, CSS styles selectors in braces, Python defines functions with def, and SQL adds rows with INSERT INTO.",
  },
  {
    kind: "match",
    id: "matcher-3",
    lang: "logic",
    title: TITLE,
    prompt: "Match each snippet to its output, then submit to print the Archive's access code.",
    hint: "Work each line out in your head; ** is a power and % a remainder.",
    pairs: [
      { snippet: "print(2 ** 3)", label: "8", tag: "Python" },
      { snippet: 'print("ab" * 2)', label: "abab", tag: "Python" },
      { snippet: "std::cout << 7 % 3;", label: "1", tag: "C++" },
      { snippet: "System.out.println(10 / 4);", label: "2", tag: "Java" },
      { snippet: 'echo strlen("devs");', label: "4", tag: "PHP" },
    ],
    explain:
      "** raises to a power, * repeats a string, % gives the remainder, int / int drops the fraction, and strlen counts characters.",
  },
];
