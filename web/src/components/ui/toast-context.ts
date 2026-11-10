import { createContext } from "react";

export type ToastTone = "info" | "success" | "error";

export interface ToastOptions {
  tone?: ToastTone;
  /** Prototype dwell time is 2500ms. */
  durationMs?: number;
}

export interface ToastApi {
  show: (message: string, options?: ToastOptions) => void;
  dismiss: () => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
