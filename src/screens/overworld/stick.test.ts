import { describe, expect, it } from "vitest";
import { STICK_DEAD, knobOffset, stickDirection } from "./stick";

describe("stickDirection", () => {
  it("is nothing inside the dead zone", () => {
    expect(stickDirection(0, 0)).toBeNull();
    expect(stickDirection(STICK_DEAD - 1, 0)).toBeNull();
    expect(stickDirection(8, 8)).toBeNull(); // length 11.3
  });

  it("picks the way the thumb leans furthest", () => {
    expect(stickDirection(30, 5)).toBe("right");
    expect(stickDirection(-30, -5)).toBe("left");
    expect(stickDirection(4, 30)).toBe("down");
    expect(stickDirection(-4, -30)).toBe("up");
  });

  it("on a diagonal the bigger lean wins, and an exact tie goes up or down", () => {
    expect(stickDirection(20, 19)).toBe("right");
    expect(stickDirection(19, 20)).toBe("down");
    expect(stickDirection(20, 20)).toBe("down");
    expect(stickDirection(-20, -20)).toBe("up");
  });

  it("just outside the dead zone it already picks a direction", () => {
    expect(stickDirection(STICK_DEAD, 0)).toBe("right");
    expect(stickDirection(0, -STICK_DEAD)).toBe("up");
  });
});

describe("knobOffset", () => {
  it("follows the thumb inside the ring", () => {
    expect(knobOffset(10, -5)).toEqual({ x: 10, y: -5 });
  });
  it("stops at the ring's edge, keeping the angle", () => {
    const k = knobOffset(60, 80, 28);
    expect(Math.hypot(k.x, k.y)).toBeCloseTo(28);
    expect(k.y / k.x).toBeCloseTo(80 / 60);
  });
  it("is the centre when the thumb is", () => {
    expect(knobOffset(0, 0)).toEqual({ x: 0, y: 0 });
  });
});
