import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMemoryAuth } from "../auth/memoryAuth";
import { useAuth, type Auth } from "../auth/useAuth";
import { SetPassword } from "./SetPassword";

let latest: Auth;
function Harness({ client }: { client: ReturnType<typeof createMemoryAuth> }) {
  latest = useAuth(client);
  return <SetPassword auth={latest} />;
}
const setup = async () => {
  const client = createMemoryAuth();
  await client.signUp("Kai", "password1");
  render(<Harness client={client} />);
  await waitFor(() => expect(latest.status).toBe("signedIn"));
  client.emit("recovery");
  await waitFor(() => expect(latest.status).toBe("recovery"));
  return { client, user: userEvent.setup() };
};
const type = async (user: ReturnType<typeof userEvent.setup>, a: string, b: string) => {
  await user.clear(screen.getByLabelText("Password"));
  await user.clear(screen.getByLabelText("Repeat password"));
  await user.type(screen.getByLabelText("Password"), a);
  await user.type(screen.getByLabelText("Repeat password"), b);
  await user.click(screen.getByRole("button", { name: "[ Save password ]" }));
};

describe("SetPassword", () => {
  it("needs 8+ characters that match, then signs you in", async () => {
    const { user } = await setup();
    await type(user, "short", "short");
    expect(screen.getByRole("alert")).toHaveTextContent("Password: at least 8 characters.");
    await type(user, "long-enough", "different-one");
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords don't match.");
    await type(user, "long-enough", "long-enough");
    await waitFor(() => expect(latest.status).toBe("signedIn"));
  });

  it("can be cancelled", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("button", { name: "[ Cancel ]" }));
    await waitFor(() => expect(latest.status).toBe("signedOut"));
  });

  it("shows the expired-link message when the server says so", async () => {
    const { client, user } = await setup();
    client.setPassword = async () => ({ ok: false, error: "expired" });
    await type(user, "long-enough", "long-enough");
    expect(screen.getByRole("alert")).toHaveTextContent("That link has expired. Ask for a new one.");
  });
});
