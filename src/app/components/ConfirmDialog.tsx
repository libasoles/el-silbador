import { useState } from "react";
import { Dialog } from "./Dialog";
import { AlertCircleIcon } from "./icons";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

/** A yes/no dialog for actions that need a confirmation step, such as deleting a song. Shares
 *  its chrome with AuthModal via Dialog, so every modal in the app reads as the same component.
 *  `onConfirm` may be async (e.g. a delete request); while it's pending, both buttons disable and
 *  a rejection is shown inline instead of closing the dialog. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !pending) onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} title={title}>
      <p className="dialog__description">{description}</p>
      {error && (
        <p className="dialog__error" role="alert">
          <AlertCircleIcon />
          {error}
        </p>
      )}
      <div className="dialog__actions">
        <button
          type="button"
          className="dialog__button dialog__button--secondary"
          disabled={pending}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className="dialog__button dialog__button--danger"
          disabled={pending}
          onClick={handleConfirm}
        >
          {pending ? "Eliminando…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
