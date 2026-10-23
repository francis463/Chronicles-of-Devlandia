import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMemoryAuth } from "../auth/memoryAuth";
import { useAuth, type Auth } from "../auth/useAuth";
import { ChooseName } from "./ChooseName";

let latest: Auth;
function Harness({ client }: { client: ReturnType<typeof createMemoryAuth> }) {
  latest = useAuth(client);
  return <ChooseName auth={latest} />;
}
const setup = async () => {
  const client = createMemoryAuth();
  await client.logInWithGoogle();
  render(<Harness client={client} />);
  await waitFor(() => expect(latest.status).toBe("needsName"));
  return { client, user: userEvent.setup() };
};

describe("ChooseName", () => {
  it("validates the name, reports a taken one, and signs in once a name is chosen", async () => {
    const { client, user } = await setup();
    await client.signUp("Kai", "password1");
    await client.logOut();
    await client.logInWithGoogle();
    await user.type(screen.getByLabelText("Name"), "x");
    await user.click(screen.getByRole("button", { name: "[ Continue ]" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Name: 3–12 letters, digits, - or _.");
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "KAI");
    await user.click(screen.getByRole("button", { name: "[ Continue ]" }));
    expect(screen.getByRole("alert")).toHaveTextContent("That name is taken.");
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Zed");
    await user.click(screen.getByRole("button", { name: "[ Continue ]" }));
    await waitFor(() => expect(latest.status).toBe("signedIn"));
  });

  it("lets a player log out instead", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("button", { name: "[ Log out ]" }));
    await waitFor(() => expect(latest.status).toBe("signedOut"));
  });
});
