import { describe, expect, it } from "vitest";
import { GLIDE_MS, createMotion, poseAt, retarget, snap, type Motion } from "./motion";

const start = (kind: Motion["kind"] = "player") => createMotion(kind, { x: 0, y: 0 }, -10_000);

describe("motion", () => {
  it("player glides over 150 ms, linearly", () => {
    const m = retarget(start(), { x: 12, y: 0 }, 0, false);
    expect(poseAt(m, 0, false).x).toBe(0);
    expect(poseAt(m, 75, false).x).toBe(6);
    expect(poseAt(m, 150, false).x).toBe(12);
    expect(poseAt(m, 400, false).x).toBe(12);
  });

  it("a new target mid-glide starts from where the sprite is drawn", () => {
    let m = retarget(start(), { x: 12, y: 0 }, 0, false);
    m = retarget(m, { x: 24, y: 0 }, 75, false);
    expect(poseAt(m, 75, false).x).toBe(6);
    expect(poseAt(m, 150, false).x).toBe(15);
    expect(poseAt(m, 225, false).x).toBe(24);
  });

  it("per-entity durations: player 150, teammate 250, drone 300", () => {
    expect(GLIDE_MS).toEqual({ player: 150, teammate: 250, drone: 300 });
    const mate = retarget(start("teammate"), { x: 10, y: 0 }, 0, false);
    expect(poseAt(mate, 125, false).x).toBe(5);
    const drone = retarget(start("drone"), { x: 10, y: 0 }, 0, false);
    expect(poseAt(drone, 150, false).x).toBe(5);
  });

  it("returns the same motion when the target hasn't changed", () => {
    const m = retarget(start(), { x: 12, y: 0 }, 0, false);
    expect(retarget(m, { x: 12, y: 0 }, 50, false)).toBe(m);
  });

  it("facing from the move in art px; horizontal wins ties; zero move keeps facing", () => {
    expect(poseAt(start(), 0, false).facing).toBe("down");
    let m = retarget(start(), { x: 13, y: 7 }, 0, false);
    expect(poseAt(m, 0, false).facing).toBe("right");
    m = retarget(m, { x: 13, y: 0 }, 10, false);
    expect(poseAt(m, 10, false).facing).toBe("up");
    m = retarget(m, { x: 6, y: 7 }, 20, false);
    expect(poseAt(m, 20, false).facing).toBe("left");
    m = retarget(m, { x: 6, y: 14 }, 30, false);
    expect(poseAt(m, 30, false).facing).toBe("down");
  });

  it("walking frames alternate every 125 ms while moving and stop after glide + 150 ms", () => {
    const m = retarget(start(), { x: 12, y: 0 }, 0, false);
    expect(poseAt(m, 0, false).frame).toBe(1);
    expect(poseAt(m, 124, false).frame).toBe(1);
    expect(poseAt(m, 125, false).frame).toBe(2);
    expect(poseAt(m, 250, false).frame).toBe(1);
    expect(poseAt(m, 299, false).frame).toBe(1);
    expect(poseAt(m, 300, false).frame).toBe(0);
  });

  it("a teammate updated every 250 ms never shows the standing frame between updates", () => {
    let m = start("teammate");
    let x = 0;
    for (let t = 0; t < 2000; t += 10) {
      if (t % 250 === 0) m = retarget(m, { x: (x += 13), y: 0 }, t, false);
      expect(poseAt(m, t, false).frame, `t ${t}`).not.toBe(0);
    }
  });

  it("snap: no glide, facing kept, not walking", () => {
    let m = retarget(start(), { x: 12, y: 0 }, 0, false);
    m = snap(m, { x: 90, y: 130 }, 50);
    expect(poseAt(m, 50, false)).toEqual({ x: 90, y: 130, facing: "right", frame: 0 });
  });

  it("reduced motion: instant, walk frame alternates per step", () => {
    let m = retarget(start(), { x: 12, y: 0 }, 0, true);
    expect(poseAt(m, 0, true)).toMatchObject({ x: 12, y: 0 });
    const first = poseAt(m, 0, true).frame;
    expect(poseAt(m, 125, true).frame).toBe(first);
    m = retarget(m, { x: 24, y: 0 }, 140, true);
    const second = poseAt(m, 140, true).frame;
    expect([first, second].sort()).toEqual([1, 2]);
  });

  it("a pose long after the last move is at the target, standing", () => {
    const m = retarget(start(), { x: 12, y: 6 }, 0, false);
    expect(poseAt(m, 10 * 60_000, false)).toEqual({ x: 12, y: 6, facing: "right", frame: 0 });
  });

  it("poses are whole art pixels", () => {
    const m = retarget(start(), { x: 7, y: 3 }, 0, false);
    for (let t = 0; t <= 150; t += 7) {
      const p = poseAt(m, t, false);
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
    }
  });
});
