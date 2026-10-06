import { Dialog } from "./Dialog";

interface DesktopOnlyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}

/** Explains that an action the user just tried is only available on a computer for now. Shown on
 *  mobile in place of authoring features that are gated there (see AGENTS.md mobile rules). */
export function DesktopOnlyDialog({ open, onOpenChange, title, description }: DesktopOnlyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} className="desktop-only-dialog">
      <img className="desktop-only-dialog__mark" src="/03-neutral.svg" alt="" />
      <p className="dialog__description">{description}</p>
      <div className="dialog__actions">
        <button
          type="button"
          className="dialog__button dialog__button--primary"
          onClick={() => onOpenChange(false)}
        >
          Entendido
        </button>
      </div>
    </Dialog>
  );
}
