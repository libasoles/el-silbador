import { useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { trackEvent } from "./analytics";
import { AuthModal } from "./components/AuthModal";
import { AuthRequiredContext } from "./authRequiredContext";
import {
  savePendingAuthAction,
  type PendingAuthAction,
} from "./pendingAuthActionStorage";

interface AuthRequiredProviderProps {
  session: Session | null | undefined;
  children: ReactNode;
}

/**
 * The one auth-dialog owner for the application. Authenticated actions record a serializable
 * intent here; their owning screen applies and clears that intent after `session` becomes truthy.
 */
export function AuthRequiredProvider({ session, children }: AuthRequiredProviderProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const requireAuthentication = (action?: PendingAuthAction) => {
    if (action) savePendingAuthAction(action);
    trackEvent("auth_modal_open");
    setAuthModalOpen(true);
  };

  return (
    <AuthRequiredContext.Provider value={{ session, requireAuthentication }}>
      {children}
      {authModalOpen && !session && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </AuthRequiredContext.Provider>
  );
}
