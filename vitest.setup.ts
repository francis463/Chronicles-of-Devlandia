import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// @testing-library/react drains its async wrapper with setTimeout(0) and only
// advances fake timers when it detects Jest. Expose the one Jest API it calls so
// userEvent works under vi.useFakeTimers().
Object.assign(globalThis, { jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) } });

afterEach(() => cleanup());

// jsdom has no 2D canvas; without this it logs "Not implemented: getContext" for every canvas.
// Assigned rather than spied on, so restoreAllMocks can't undo it. Tests that need a context
// assign their own fake and put this back.
HTMLCanvasElement.prototype.getContext = (() => null) as never;

// jsdom has no scrollIntoView (the drone's hint panel scrolls itself into view).
Element.prototype.scrollIntoView = () => {};
