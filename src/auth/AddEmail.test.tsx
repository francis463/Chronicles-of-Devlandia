import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddEmail } from "./AddEmail";

describe("AddEmail", () => {
  it("rejects a malformed email without calling the server", async () => {
    const onAdd = vi.fn();
    render(<AddEmail onAdd={onAdd} onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText("Email"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "[ Save email ]" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email.");
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("saves a good email and asks the player to check their inbox", async () => {
    const onAdd = vi.fn().mockResolvedValue({ ok: true });
    render(<AddEmail onAdd={onAdd} onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText("Email"), " kai@example.com ");
    await userEvent.click(screen.getByRole("button", { name: "[ Save email ]" }));
    expect(onAdd).toHaveBeenCalledWith("kai@example.com");
    expect(await screen.findByText("Check your inbox to confirm it.")).toBeInTheDocument();
  });

  it("shows the server's error and closes on [ Close ]", async () => {
    const onClose = vi.fn();
    render(<AddEmail onAdd={async () => ({ ok: false, error: "unreachable" })} onClose={onClose} />);
    await userEvent.type(screen.getByLabelText("Email"), "kai@example.com");
    await userEvent.click(screen.getByRole("button", { name: "[ Save email ]" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the account server.");
    await userEvent.click(screen.getByRole("button", { name: "[ Close ]" }));
    expect(onClose).toHaveBeenCalled();
  });
});
