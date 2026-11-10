import { useEffect, type RefObject } from "react";

/**
 * After a failed submit, move focus to the first invalid control in the form.
 * `attempt` increments on every submit so repeated failures re-focus.
 */
export function useFocusFirstInvalid(formRef: RefObject<HTMLFormElement | null>, attempt: number) {
  useEffect(() => {
    if (attempt === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [formRef, attempt]);
}
