import { describe, expect, it } from "vitest";
import { NO_FLAGS, type PresenceMeta } from "../game/team";
import { makeTransportWith } from "./makeTransport";
import { TeamError } from "./transport";

const me: PresenceMeta = { id: "a", name: "Ana", joinedAt: 1, startedAt: null, flags: NO_FLAGS, x: 28, y: 72, zone: "peaks" };

describe("makeTransport", () => {
  it("online mode without a configured server fails as unreachable instead of crashing", async () => {
    const make = makeTransportWith({ url: "", key: "" });
    await expect(make("online").join("KQZM", me)).rejects.toEqual(new TeamError("unreachable"));
  });

  it("local mode never needs the server config", async () => {
    const make = makeTransportWith({ url: "", key: "" });
    const t = make("local");
    await expect(t.join("KQZM", me)).resolves.toBeUndefined();
    await t.leave();
  });
});
