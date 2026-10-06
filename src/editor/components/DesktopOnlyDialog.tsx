import type { ReactNode } from "react";
import { Dialog } from "./Dialog";

interface DesktopOnlyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Shown under the description, e.g. a sample of what the feature does on a computer. */
  children?: ReactNode;
}

/** Explains, full screen, that an action the user just tried is only available on a computer for
 *  now. Shown on mobile in place of authoring features that are gated there (see AGENTS.md mobile
 *  rules). */
export function DesktopOnlyDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DesktopOnlyDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      className="desktop-only-dialog"
      fullScreen
    >
      <div className="desktop-only-dialog__message">
        <img className="desktop-only-dialog__mark" src="/03-neutral.svg" alt="" />
        <p className="dialog__description">{description}</p>
      </div>
      {children}
    </Dialog>
  );
}
