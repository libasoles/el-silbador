import { useState, type FormEvent } from "react";
import "./YoutubeLinkDialog.css";
import { partituraUrlOf } from "../../core/partituraLink";
import { AlertCircleIcon } from "./icons";
import { Dialog } from "./Dialog";

interface PartituraLinkDialogProps {
  open: boolean;
  /** The link currently in the song, or `null` if none. */
  currentUrl: string | null;
  onOpenChange: (open: boolean) => void;
  /** The validated link to put in the song, or `null` to remove it. */
  onSave: (url: string | null) => void;
}

/** Admin-only dialog for pasting (or changing, or removing) the Partitura link that becomes a
 *  banner in the song. Shares its chrome with the YouTube dialog. */
export function PartituraLinkDialog({ open, currentUrl, onOpenChange, onSave }: PartituraLinkDialogProps) {
  const [url, setUrl] = useState(currentUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setUrl(currentUrl ?? "");
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const valid = partituraUrlOf(url);
    if (url.trim() !== "" && !valid) {
      setError("Ese link no parece ser de partitura.com.ar.");
      return;
    }
    onSave(valid);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} title="Link de Partitura" className="youtube-link-dialog">
      <form className="youtube-link-dialog__form" onSubmit={handleSubmit}>
        <label className="youtube-link-dialog__field">
          URL de la partitura
          <input
            type="url"
            placeholder="https://partitura.com.ar/…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            autoFocus
          />
        </label>
        <p className="youtube-link-dialog__hint">
          Se muestra como un banner al final de la letra, para cualquiera que la vea.
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
              onClick={() => {
                onSave(null);
                setUrl("");
                onOpenChange(false);
              }}
            >
              Quitar link
            </button>
          )}
          <button type="submit" className="dialog__button dialog__button--primary">
            Guardar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
