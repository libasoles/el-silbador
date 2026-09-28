import { useState, type FormEvent } from "react";
import { signInWithMagicLink } from "../../data/auth";
import "./AuthModal.css";
import { AlertCircleIcon, MailIcon } from "./icons";
import { Dialog } from "./Dialog";

interface AuthModalProps {
  onClose: () => void;
}

/** Shared magic-link login/register dialog. It deliberately knows nothing about the action that
 *  opened it: the caller resumes that action after the session becomes available. */
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
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={
        linkSent ? (
          <span className="auth-modal__sent-title">
            <MailIcon aria-hidden="true" />
            Enviado
          </span>
        ) : (
          "Entrá o creá tu cuenta"
        )
      }
    >
      {linkSent ? (
        <p className="auth-modal__message">
          Abrí el enlace para iniciar sesión y continuar.
        </p>
      ) : (
        <form className="auth-modal__form" onSubmit={handleSubmit}>
          <div className="auth-modal__hint">
            <p>
              Login y registro funcionan sin contraseña: ingresá tu email y te mandamos un
              enlace.
            </p>
            <p>
              Si ya tenés cuenta, te iniciamos sesión. Si es la primera vez, te la creamos al
              toque.
            </p>
          </div>
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
          {error && (
            <p className="dialog__error" role="alert">
              <AlertCircleIcon />
              {error}
            </p>
          )}
          <button type="submit" className="auth-modal__submit" disabled={submitting}>
            {submitting ? "Un momento…" : "Enviarme el enlace"}
          </button>
        </form>
      )}
    </Dialog>
  );
}
