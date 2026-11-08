import { useState, type FormEvent } from "react";
import "./YoutubeLinkDialog.css";
import { partituraUrlOf } from "../../core/partituraLink";
import { AlertCircleIcon } from "./icons";
import { Dialog } from "./Dialog";

interface PartituraLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the validated link, to be added to the lyrics as a line of its own. */
  onInsert: (url: string) => void;
}

/** Admin-only dialog for pasting a Partitura link that the editor didn't recognize on its own
 *  (or that is easier to paste than to type into the lyrics). The link becomes a banner. */
export function PartituraLinkDialog({ open, onOpenChange, onInsert }: PartituraLinkDialogProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setUrl("");
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const valid = partituraUrlOf(url);
    if (!valid) {
      setError("Ese link no parece ser de partitura.com.ar.");
      return;
    }
    onInsert(valid);
    handleOpenChange(false);
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
          Se agrega al final de la letra y se muestra como un banner. Para quitarlo, borrá esa línea.
        </p>
        {error && (
          <p className="dialog__error" role="alert">
            <AlertCircleIcon />
            {error}
          </p>
        )}
        <div className="dialog__actions">
          <button type="submit" className="dialog__button dialog__button--primary">
            Agregar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
