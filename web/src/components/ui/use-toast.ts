import { useContext } from "react";
import { ToastContext, type ToastApi } from "./toast-context.ts";

export function useToast(): ToastApi {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>.");
  return toast;
}
