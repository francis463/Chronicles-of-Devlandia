import type { ComponentProps } from "react";
import App from "../App";
import { createMemoryAuth } from "../auth/memoryAuth";

/** The app as a guest in a test: no login screen, no network. */
export function GuestApp(props: ComponentProps<typeof App>) {
  return <App authClient={createMemoryAuth()} startAsGuest {...props} />;
}
