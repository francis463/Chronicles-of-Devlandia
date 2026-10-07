import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// @testing-library/react drains its async wrapper with setTimeout(0) and only
// advances fake timers when it detects Jest. Expose the one Jest API it calls so
// userEvent works under vi.useFakeTimers().
Object.assign(globalThis, { jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) } });

afterEach(() => cleanup());
