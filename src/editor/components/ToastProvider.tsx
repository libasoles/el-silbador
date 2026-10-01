import * as RadixToast from "@radix-ui/react-toast";
import { useCallback, useRef, useState, type ReactNode } from "react";
import "./Toast.css";
import {
  ToastContext,
  type ToastOptions,
  type ToastVariant,
  type TutorialToastOptions,
} from "../toastContext";
import { AlertCircleIcon, CheckCircleIcon, InfoIcon, XIcon } from "./icons";
import { hasSeenTutorial, markTutorialSeen } from "../tutorialStorage";

interface ToastItem extends Required<Omit<ToastOptions, "description" | "icon">> {
  icon?: ReactNode;
  id: number;
  description?: string;
  open: boolean;
  tutorialId?: string;
}

const DEFAULT_DURATION = 5000;
// Kept in sync with the slide/fade-out animation length in Toast.css, so a closed toast stays
// mounted long enough to finish animating before it's dropped from the list.
const EXIT_ANIMATION_MS = 200;

const VARIANT_ICONS: Record<ToastVariant, ReactNode> = {
  info: <InfoIcon />,
  success: <CheckCircleIcon />,
  error: <AlertCircleIcon />,
};

/** The one toast queue for the app: mounts a Radix Toast.Provider/Viewport in the bottom-right
 *  corner and lets any descendant queue a toast via `useToast().showToast(...)`. Each toast
 *  carries its own countdown bar and auto-dismisses after `duration`, pausing while hovered or
 *  focused. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((options: ToastOptions) => {
    const id = ++nextId.current;
    setToasts((current) => [
      ...current,
      {
        id,
        variant: options.variant ?? "info",
        icon: options.icon,
        title: options.title,
        description: options.description,
        duration: options.duration ?? DEFAULT_DURATION,
        open: true,
      },
    ]);
  }, []);

  const showTutorial = useCallback(
    (options: TutorialToastOptions) => {
      if (hasSeenTutorial(options.tutorialId)) return;
      setToasts((current) => {
        if (current.some((toast) => toast.tutorialId === options.tutorialId)) return current;
        const id = ++nextId.current;
        return [
          ...current,
          {
            id,
            variant: options.variant ?? "info",
            icon: options.icon,
            title: options.title,
            description: options.description,
            // Radix treats Infinity as an explicitly non-expiring toast.
            duration: Infinity,
            tutorialId: options.tutorialId,
            open: true,
          },
        ];
      });
    },
    [],
  );

  const handleOpenChange = useCallback((id: number, open: boolean) => {
    if (open) return;
    setToasts((current) => {
      const dismissed = current.find((toast) => toast.id === id);
      if (dismissed?.tutorialId) markTutorialSeen(dismissed.tutorialId);
      return current.map((toast) => (toast.id === id ? { ...toast, open } : toast));
    });
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, EXIT_ANIMATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showTutorial }}>
      <RadixToast.Provider swipeDirection="right" duration={DEFAULT_DURATION}>
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            className={`toast toast--${toast.variant}`}
            open={toast.open}
            duration={toast.duration}
            onOpenChange={(open) => handleOpenChange(toast.id, open)}
          >
            <div className={toast.icon ? "toast__icon toast__icon--artwork" : "toast__icon"}>
              {toast.icon ?? VARIANT_ICONS[toast.variant]}
            </div>
            <div className="toast__body">
              <RadixToast.Title className="toast__title">{toast.title}</RadixToast.Title>
              {toast.description && (
                <RadixToast.Description className="toast__description">
                  {toast.description}
                </RadixToast.Description>
              )}
            </div>
            <RadixToast.Close className="toast__close" aria-label="Cerrar">
              <XIcon size={16} />
            </RadixToast.Close>
            {!toast.tutorialId && (
              <div className="toast__timer" style={{ animationDuration: `${toast.duration}ms` }} />
            )}
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="toast-viewport" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
