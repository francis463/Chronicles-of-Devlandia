import { maskRude } from "../chat/filter";
import { validateName as validateShape } from "../../supabase/functions/account/rules";

export {
  INTERNAL_EMAIL_DOMAIN,
  accountKey,
  internalEmail,
  isInternalEmail,
  validatePassword,
} from "../../supabase/functions/account/rules";

export type NameProblem = "invalid-name" | "rude-name";

/** The server's shape rule plus the chat filter: nobody registers a name chat would mask. */
export function validateName(name: string): NameProblem | null {
  return validateShape(name) ?? (maskRude(name) !== name ? "rude-name" : null);
}
