/**
 * Extracts an Auth error returned by Supabase's implicit-flow redirect. Supabase puts these
 * values in the URL fragment, which Next's server never receives, so this has to run in the
 * browser after hydration.
 */
export function readAuthCallbackError(hash: string): string | null {
  const parameters = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  if (!parameters.get("error")) return null;

  return parameters.get("error_description") ?? "No se pudo completar el inicio de sesión.";
}
