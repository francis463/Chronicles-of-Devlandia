import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useUndo } from "./useUndo";

function clocked(start = "") {
  let t = 0;
  const hook = renderHook(() => useUndo(start, () => t));
  return { hook, at: (ms: number) => (t = ms) };
}

describe("useUndo", () => {
  it("typing within a second is one step; a pause starts a new one", () => {
    const { hook, at } = clocked();
    act(() => hook.result.current.set("a", { typing: true }));
    at(500);
    act(() => hook.result.current.set("ab", { typing: true }));
    at(1600);
    act(() => hook.result.current.set("abc", { typing: true }));
    act(() => hook.result.current.undo());
    expect(hook.result.current.value).toBe("ab");
    act(() => hook.result.current.undo());
    expect(hook.result.current.value).toBe("");
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("breakRun ends a typing run: typing, breakRun, typing again within a second makes two steps", () => {
    const { hook, at } = clocked();
    act(() => hook.result.current.set("a", { typing: true }));
    act(() => hook.result.current.breakRun());
    at(100);
    act(() => hook.result.current.set("ab", { typing: true }));
    expect(hook.result.current.value).toBe("ab");
    act(() => hook.result.current.undo());
    expect(hook.result.current.value).toBe("a");
  });

  it("20 steps at most", () => {
    const { hook } = clocked();
    for (let i = 1; i <= 25; i++) act(() => hook.result.current.set(`v${i}`));
    for (let i = 0; i < 20; i++) act(() => hook.result.current.undo());
    expect(hook.result.current.value).toBe("v5");
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("Reset is undoable", () => {
    const { hook } = clocked("none");
    act(() => hook.result.current.set("block"));
    act(() => hook.result.current.reset());
    expect(hook.result.current.value).toBe("none");
    act(() => hook.result.current.undo());
    expect(hook.result.current.value).toBe("block");
  });

  it("canUndo and canReset", () => {
    const { hook } = clocked("none");
    expect([hook.result.current.canUndo, hook.result.current.canReset]).toEqual([false, false]);
    act(() => hook.result.current.set("block"));
    expect([hook.result.current.canUndo, hook.result.current.canReset]).toEqual([true, true]);
    act(() => hook.result.current.set("none"));
    expect([hook.result.current.canUndo, hook.result.current.canReset]).toEqual([true, false]);
    act(() => hook.result.current.reset());
    expect(hook.result.current.value).toBe("none");
  });
});
