import { useState, type FormEvent } from "react";
import { signInWithMagicLink } from "../../data/auth";
import "./AuthModal.css";

interface AuthModalProps {
  onClose: () => void;
}

/** Magic-link sign-in dialog opened by the Save button when there's no session yet. Entering an
 *  email sends a link; there's no password and no separate register step — following the link
 *  signs the person in, creating an account first if none exists yet. Once a session appears,
 *  App's `useAuth` hook picks it up and closes this modal; its autosave hook then saves the song. */
export function AuthModal({ onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signInWithMagicLink(email);
      setLinkSent(true);
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
        aria-label="Iniciar sesión"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="auth-modal__close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>

        <h2 className="auth-modal__title">Iniciar sesión</h2>

        {linkSent ? (
          <p className="auth-modal__message">
            Te enviamos un enlace a {email}. Abrilo para iniciar sesión y terminar de guardar la
            canción.
          </p>
        ) : (
          <form className="auth-modal__form" onSubmit={handleSubmit}>
            <p className="auth-modal__hint">
              Ingresá tu email y te mandamos un enlace para iniciar sesión, sin contraseña.
            </p>
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
            {error && <p className="auth-modal__error">{error}</p>}
            <button type="submit" className="auth-modal__submit" disabled={submitting}>
              {submitting ? "Un momento…" : "Enviarme el enlace"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
