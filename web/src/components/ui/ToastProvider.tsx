import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleX, Info } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { ToastContext, type ToastApi, type ToastOptions, type ToastTone } from "./toast-context.ts";

// Prototype toast (all pages): surface card with an accent border and icon; slides up from
// translateY(100px) with opacity over 0.3s, dwells 2500ms.
// Desktop: fixed bottom-right (30px), overshoot easing, --shadow-dropdown.
// Mobile: full width with 16px gutters, above the bottom nav, ease, --shadow-toast.

const DEFAULT_DURATION_MS = 2500;

const TONES: Record<ToastTone, { border: string; icon: ReactNode }> = {
  info: { border: "border-primary", icon: <Info className="size-4 shrink-0 text-primary" aria-hidden="true" /> },
  success: {
    border: "border-success",
    icon: <CircleCheck className="size-4 shrink-0 text-success" aria-hidden="true" />,
  },
  error: { border: "border-danger", icon: <CircleX className="size-4 shrink-0 text-danger" aria-hidden="true" /> },
};

interface ToastState {
  message: string;
  tone: ToastTone;
  visible: boolean;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: "", tone: "info", visible: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast((current) => ({ ...current, visible: false }));
  }, []);

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    clearTimeout(timer.current);
    setToast({ message, tone: options.tone ?? "info", visible: true });
    timer.current = setTimeout(
      () => setToast((current) => ({ ...current, visible: false })),
      options.durationMs ?? DEFAULT_DURATION_MS,
    );
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss]);
  const tone = TONES[toast.tone];

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role={toast.tone === "error" ? "alert" : "status"}
        aria-live={toast.tone === "error" ? "assertive" : "polite"}
        className={cn(
          "fixed inset-x-4 bottom-20 z-[60] flex items-center gap-2 rounded-md border bg-surface px-3.5 py-2.5 text-12 font-semibold text-fg shadow-toast",
          "transition-all duration-300 ease-[ease]",
          "sm:inset-x-auto sm:right-[30px] sm:bottom-[30px] sm:max-w-[420px] sm:gap-2.5 sm:px-5 sm:py-3 sm:text-13 sm:shadow-dropdown sm:ease-toast",
          tone.border,
          toast.visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[100px] opacity-0",
        )}
      >
        {toast.message && tone.icon}
        <span>{toast.message}</span>
      </div>
    </ToastContext.Provider>
  );
}
