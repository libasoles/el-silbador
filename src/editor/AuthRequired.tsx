import { useEffect, useReducer, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { trackEvent } from "./analytics";
import { AuthModal } from "./components/AuthModal";
import { authModalReducer } from "./authModalState";
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
  const [authModalOpen, dispatchAuthModal] = useReducer(authModalReducer, false);

  useEffect(() => {
    if (session) dispatchAuthModal("authenticated");
  }, [session]);

  const requireAuthentication = (action?: PendingAuthAction) => {
    if (action) savePendingAuthAction(action);
    trackEvent("auth_modal_open");
    dispatchAuthModal("open");
  };

  return (
    <AuthRequiredContext.Provider value={{ session, requireAuthentication }}>
      {children}
      {authModalOpen && !session && <AuthModal onClose={() => dispatchAuthModal("close")} />}
    </AuthRequiredContext.Provider>
  );
}
