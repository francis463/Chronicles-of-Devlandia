import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { speak, spoken } from "./speak";

describe("speak", () => {
  it("shows a badge as written and reads it by its spoken form", () => {
    const { container } = render(<p>{speak("Kai pinged the C++ I Chest.")}</p>);
    expect(screen.getByText("C++ I")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".sr-only")).toHaveTextContent("C++ 1");
  });

  it("covers a Badge entry, as the event log always has", () => {
    const { container } = render(<p>{speak("Kai earned the C# Badge.")}</p>);
    expect(container.querySelectorAll(".sr-only")).toHaveLength(1);
    expect(container.querySelector(".sr-only")).toHaveTextContent("C sharp");
  });

  it("covers every badge in a list", () => {
    const { container } = render(<p>{speak("Your badges: 3/10 (HTML, C#, Python II).")}</p>);
    const hidden = [...container.querySelectorAll(".sr-only")].map((n) => n.textContent);
    expect(hidden).toEqual(["C sharp", "Python 2"]);
  });

  it("returns plain text when nothing needs speaking", () => {
    expect(speak("Earned the SQL Badge.")).toBe("Earned the SQL Badge.");
    expect(speak('No teammate called "C#".')).toBe('No teammate called "C#".');
    expect(speak("Kai: C++ Peaks")).toBe("Kai: C++ Peaks");
  });
});

describe("spoken", () => {
  it("is the same text with badge names in their spoken form", () => {
    expect(spoken("Your badges: 3/10 (HTML, C#).")).toBe("Your badges: 3/10 (HTML, C sharp).");
    expect(spoken("Kai pinged the C++ II Chest.")).toBe("Kai pinged the C++ 2 Chest.");
    expect(spoken("Kai has earned 2 that you know of: Python I, SQL.")).toBe("Kai has earned 2 that you know of: Python 1, SQL.");
    expect(spoken("Hello there.")).toBe("Hello there.");
  });
});
