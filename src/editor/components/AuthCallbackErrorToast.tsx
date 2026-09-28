import { useEffect } from "react";
import { readAuthCallbackError } from "../authCallbackError";
import { useToast } from "../toastContext";

/** Shows—and then removes—an Auth error that Supabase returned in a magic-link URL fragment. */
export function AuthCallbackErrorToast() {
  const { showToast } = useToast();

  useEffect(() => {
    const error = readAuthCallbackError(window.location.hash);
    if (!error) return;

    showToast({
      variant: "error",
      title: "No pudimos iniciar sesión",
      description: error,
      duration: 10_000,
    });

    // Do not show the same error again on a refresh, and do not leave auth details in the URL.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, [showToast]);

  return null;
}
