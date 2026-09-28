import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { PendingAuthAction } from "./pendingAuthActionStorage";

export interface AuthRequiredContextValue {
  session: Session | null | undefined;
  /** Opens the shared login/register dialog and records an intent for a magic-link return. */
  requireAuthentication: (action?: PendingAuthAction) => void;
}

export const AuthRequiredContext = createContext<AuthRequiredContextValue | null>(null);

export function useAuthRequired(): AuthRequiredContextValue {
  const context = useContext(AuthRequiredContext);
  if (!context) throw new Error("useAuthRequired debe usarse dentro de AuthRequiredProvider.");
  return context;
}
