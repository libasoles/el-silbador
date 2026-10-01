import { createContext, useContext, type ReactNode } from "react";

export type ToastVariant = "info" | "success" | "error";

export interface ToastOptions {
  variant?: ToastVariant;
  /** Optional artwork shown in place of the variant's standard icon. */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Milliseconds before the toast auto-dismisses. Defaults to 5000. */
  duration?: number;
}

export interface TutorialToastOptions extends ToastOptions {
  /** A durable identifier for a tutorial that is shown until it is closed, then never again in
   *  this browser. */
  tutorialId: string;
}

export interface ToastContextValue {
  /** Queues a toast in the bottom-right corner; it auto-dismisses after `duration` unless the
   *  user hovers/focuses it or closes it manually. */
  showToast: (options: ToastOptions) => void;
  /** Shows a no-time-limit tutorial at most once, recording it only after dismissal. */
  showTutorial: (options: TutorialToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de ToastProvider.");
  return context;
}
