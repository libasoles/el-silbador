import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import "./Dialog.css";
import { XIcon } from "./icons";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  /** Extra class applied to the dialog box, e.g. to widen it for a specific dialog. */
  className?: string;
  /** Covers the whole screen, with the editor's own top-right close button instead of the box's. */
  fullScreen?: boolean;
}

/** Shared chrome (overlay, box, title, close button) for every modal dialog in the app, so
 *  AuthModal and ConfirmDialog look and behave the same way. Built on Radix's Dialog primitive
 *  for focus trapping, Escape-to-close, and scroll locking. */
export function Dialog({ open, onOpenChange, title, children, className, fullScreen = false }: DialogProps) {
  const boxClassName = ["dialog", fullScreen ? "dialog--full-screen" : null, className]
    .filter(Boolean)
    .join(" ");
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog__overlay" />
        <RadixDialog.Content className={boxClassName} aria-describedby={undefined}>
          <RadixDialog.Close
            className={fullScreen ? "dialog__close dialog__close--full-screen" : "dialog__close"}
            aria-label="Cerrar"
          >
            <XIcon size={fullScreen ? 26 : 18} />
          </RadixDialog.Close>
          <RadixDialog.Title className="dialog__title">{title}</RadixDialog.Title>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
