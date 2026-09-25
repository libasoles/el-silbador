import { useState, type FormEvent } from "react";
import { signInWithPassword, signUp } from "../../data/auth";
import "./AuthModal.css";

type Mode = "login" | "register";

interface AuthModalProps {
  onClose: () => void;
  /** Called once a session actually exists (sign-in, or sign-up without email confirmation). */
  onAuthenticated: () => void;
}

/** Login/register dialog opened by the Save button when there's no session yet. Signing in or
 *  registering here doesn't itself save the song — it just produces a session; App's autosave
 *  hook notices `authenticated` flip true and saves right away. */
export function AuthModal({ onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setConfirmationSent(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") {
        await signInWithPassword(email, password);
        onAuthenticated();
      } else {
        const session = await signUp(email, password);
        if (session) {
          onAuthenticated();
        } else {
          setConfirmationSent(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-modal__overlay" role="presentation" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="auth-modal__close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>

        <div className="auth-modal__tabs" role="tablist">
          <button
            type="button"
            className="auth-modal__tab"
            role="tab"
            aria-pressed={mode === "login"}
            onClick={() => switchMode("login")}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className="auth-modal__tab"
            role="tab"
            aria-pressed={mode === "register"}
            onClick={() => switchMode("register")}
          >
            Crear cuenta
          </button>
        </div>

        {confirmationSent ? (
          <p className="auth-modal__message">
            Te enviamos un email para confirmar tu cuenta. Confirmalo y después iniciá sesión para
            terminar de guardar la canción.
          </p>
        ) : (
          <form className="auth-modal__form" onSubmit={handleSubmit}>
            <label className="auth-modal__field">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="auth-modal__field">
              Contraseña
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && <p className="auth-modal__error">{error}</p>}
            <button type="submit" className="auth-modal__submit" disabled={submitting}>
              {submitting ? "Un momento…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
