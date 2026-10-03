type AuthModalAction = "open" | "close" | "authenticated";

/** Keeps the dialog from being resurrected by a later sign-out after a magic-link login. */
export function authModalReducer(_isOpen: boolean, action: AuthModalAction): boolean {
  return action === "open";
}
