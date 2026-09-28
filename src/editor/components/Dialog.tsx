import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import "./Dialog.css";
import { XIcon } from "./icons";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

/** Shared chrome (overlay, box, title, close button) for every modal dialog in the app, so
 *  AuthModal and ConfirmDialog look and behave the same way. Built on Radix's Dialog primitive
 *  for focus trapping, Escape-to-close, and scroll locking. */
export function Dialog({ open, onOpenChange, title, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog__overlay" />
        <RadixDialog.Content className="dialog" aria-describedby={undefined}>
          <RadixDialog.Close className="dialog__close" aria-label="Cerrar">
            <XIcon size={18} />
          </RadixDialog.Close>
          <RadixDialog.Title className="dialog__title">{title}</RadixDialog.Title>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
