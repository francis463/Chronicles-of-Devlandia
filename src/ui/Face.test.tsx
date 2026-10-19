import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Face } from "./Face";

const KEY = "0b9e8f0c-7a55-4a3c-9d0e-5a1f2c3d4e5f";

describe("Face", () => {
  it("shows the picture when there is one, at the size it is given", () => {
    render(<Face name="Alice" avatar={KEY} size={20} />);
    const img = screen.getByRole("img", { name: "Alice's photo" });
    expect(img).toHaveAttribute("src", expect.stringContaining(`/avatars/${KEY}.jpg`));
    expect(img.parentElement).toHaveStyle({ width: "20px", height: "20px" });
  });

  it("shows the first letter, in capitals, when there is no picture", () => {
    const { container } = render(<Face name="alice" />);
    expect(container).toHaveTextContent("A");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("falls back to the first letter when the picture will not load", () => {
    const { container } = render(<Face name="Bobby" avatar={KEY} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(container).toHaveTextContent("B");
  });

  it("shows a ? for an empty spot, even when given a picture", () => {
    const { container } = render(<Face name="Spot 3" avatar={KEY} empty />);
    expect(container).toHaveTextContent("?");
    expect(screen.queryByRole("img")).toBeNull();
  });
});
