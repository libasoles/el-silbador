import { useState, type FormEvent } from "react";
import "./YoutubeLinkDialog.css";
import { isValidYoutubeUrl } from "../youtubeUrl";
import { AlertCircleIcon } from "./icons";
import { Dialog } from "./Dialog";

interface YoutubeLinkDialogProps {
  open: boolean;
  /** The link currently attached to the song, or `null` if none. */
  currentUrl: string | null;
  onOpenChange: (open: boolean) => void;
  /** Pass `null` to remove the link. Rejects if the save fails, so the dialog can show the error
   *  inline instead of closing. */
  onSave: (url: string | null) => Promise<void>;
}

/** Admin-only dialog for attaching (or removing) the YouTube link rendered below a song's
 *  lyrics. Shares its chrome with AuthModal/ConfirmDialog via Dialog. */
export function YoutubeLinkDialog({ open, currentUrl, onOpenChange, onSave }: YoutubeLinkDialogProps) {
  const [url, setUrl] = useState(currentUrl ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (submitting) return;
      setUrl(currentUrl ?? "");
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (trimmed !== "" && !isValidYoutubeUrl(trimmed)) {
      setError("Ese link no parece ser de YouTube.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave(trimmed === "" ? null : trimmed);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSave(null);
      setUrl("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Link de YouTube"
      className="youtube-link-dialog"
    >
      <form className="youtube-link-dialog__form" onSubmit={handleSubmit}>
        <label className="youtube-link-dialog__field">
          URL del video
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            autoFocus
          />
        </label>
        <p className="youtube-link-dialog__hint">
          Se va a mostrar debajo de la letra de la canción, para cualquiera que la vea.
        </p>
        {error && (
          <p className="dialog__error" role="alert">
            <AlertCircleIcon />
            {error}
          </p>
        )}
        <div className="dialog__actions">
          {currentUrl && (
            <button
              type="button"
              className="dialog__button dialog__button--secondary"
              disabled={submitting}
              onClick={handleRemove}
            >
              Quitar link
            </button>
          )}
          <button type="submit" className="dialog__button dialog__button--primary" disabled={submitting}>
            {submitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
