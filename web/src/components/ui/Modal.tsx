import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn.ts";

// Desktop = 13D centred modal: page/75 overlay + 6px blur, surface panel, border-light,
//   radius-xl, shadow-modal, modalSlideUp 0.3s. Header/footer bands at surface/60.
// Mobile  = 13M bottom sheet: anchored bottom (60px top gap), handle bar, sheetSlideUp 0.3s.
// Unlike the prototypes, Esc and backdrop clicks close it and focus is trapped/restored.

const WIDTHS = {
  sm: "sm:max-w-[480px]", // 16D receipt modal
  md: "sm:max-w-[520px]", // 08D transaction modal
  lg: "sm:max-w-[560px]", // 13D order modal
} as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof WIDTHS;
  /** auto = bottom sheet below 640px, centred above; or force one presentation. */
  presentation?: "auto" | "sheet" | "center";
  /** Hide the close button and ignore Esc/backdrop (e.g. while a payment request is in flight). */
  dismissible?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  presentation = "auto",
  dismissible = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissibleRef.current) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0]!;
      const lastItem = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const sheet = presentation === "sheet";
  const center = presentation === "center";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-center bg-page/75 backdrop-blur-[6px]",
        sheet ? "items-end" : center ? "items-center p-4" : "items-end sm:items-center sm:p-6",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "flex w-full flex-col overflow-hidden bg-surface outline-none",
          sheet &&
            "max-h-[calc(100dvh-60px)] animate-sheet-in rounded-t-xl border-t border-border-light shadow-sheet",
          center && cn("max-h-[calc(100dvh-32px)] animate-modal-in rounded-xl border border-border-light shadow-modal", WIDTHS[size]),
          !sheet &&
            !center &&
            cn(
              "max-h-[calc(100dvh-60px)] animate-sheet-in rounded-t-xl border-t border-border-light shadow-sheet",
              "sm:max-h-[calc(100dvh-48px)] sm:animate-modal-in sm:rounded-xl sm:border sm:shadow-modal",
              WIDTHS[size],
            ),
        )}
      >
        {!center && (
          <div
            aria-hidden="true"
            className={cn("mx-auto mt-2.5 mb-1 h-1 w-9 shrink-0 rounded-[2px] bg-border-light", !sheet && "sm:hidden")}
          />
        )}

        <div className="flex items-start justify-between gap-4 border-b border-border px-5 pt-3 pb-4 sm:bg-surface/60 sm:px-7 sm:pt-6 sm:pb-5">
          <div className="min-w-0">
            <h2 id={titleId} className="flex items-center gap-2 text-16 font-extrabold tracking-[-0.2px] sm:text-18">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-13 text-fg-muted">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex cursor-pointer items-center justify-center rounded-sm p-1 text-fg-muted transition-all duration-200 hover:bg-white/6 hover:text-fg"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 sm:gap-5 sm:px-7 sm:py-6">{children}</div>

        {footer && (
          <div className="flex flex-col gap-2.5 border-t border-border bg-surface/80 px-5 pt-4 pb-6 sm:gap-3 sm:bg-surface/60 sm:px-7 sm:pt-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
