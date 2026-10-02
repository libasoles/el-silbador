interface AuthErrorLike {
  code?: string;
  message?: string;
}

/** Supabase auth error codes we know how to phrase in Spanish. Codes not listed here (or errors
 *  without one, e.g. a network failure) fall back to a generic message. */
const MESSAGES_BY_CODE: Record<string, string> = {
  over_email_send_rate_limit: "Esperá un momento antes de pedir otro enlace.",
  over_request_rate_limit: "Demasiados intentos. Probá de nuevo en unos minutos.",
  email_address_invalid: "Ese email no es válido.",
  validation_failed: "Ese email no es válido.",
  signup_disabled: "El registro de cuentas nuevas está deshabilitado por ahora.",
  email_provider_disabled: "El inicio de sesión por email está deshabilitado por ahora.",
};

const GENERIC_MESSAGE = "No pudimos completar la operación. Probá de nuevo en unos minutos.";

/** A GoTrue "Database error ..." (e.g. "Database error finding user") signals a broken trigger or
 *  other server-side DB issue, not something the user did wrong. Supabase doesn't give it a
 *  dedicated code (it comes back as the generic `unexpected_failure`), so we match on the message
 *  itself, in whichever wording that code happens to carry. */
function isDatabaseError(message: string): boolean {
  return /database error/i.test(message);
}

/** True for errors the user can't act on (server failures, unmapped codes, network errors) — the
 *  ones worth reporting to Sentry. Mapped codes like rate limits or invalid emails are expected. */
export function isUnexpectedAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;
  const { code } = error as AuthErrorLike;
  return !(code && MESSAGES_BY_CODE[code]);
}

/** Translates a Supabase auth error into a Spanish, user-facing message. */
export function translateAuthError(error: unknown): string {
  if (!error || typeof error !== "object") return GENERIC_MESSAGE;
  const { code, message } = error as AuthErrorLike;
  if (code && MESSAGES_BY_CODE[code]) return MESSAGES_BY_CODE[code];
  if (typeof message === "string" && isDatabaseError(message)) {
    return "Hubo un error del servidor al buscar tu cuenta. Probá de nuevo en unos minutos.";
  }
  return GENERIC_MESSAGE;
}
