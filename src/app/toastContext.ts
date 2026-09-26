import { createContext, useContext } from "react";

export type ToastVariant = "info" | "success" | "error";

export interface ToastOptions {
  variant?: ToastVariant;
  title: string;
  description?: string;
  /** Milliseconds before the toast auto-dismisses. Defaults to 5000. */
  duration?: number;
}

export interface ToastContextValue {
  /** Queues a toast in the bottom-right corner; it auto-dismisses after `duration` unless the
   *  user hovers/focuses it or closes it manually. */
  showToast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de ToastProvider.");
  return context;
}
