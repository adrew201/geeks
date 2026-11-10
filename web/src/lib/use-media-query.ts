import { useSyncExternalStore } from "react";

/** Tailwind `lg` (1024px): where AppLayout switches from bottom tabs to the sidebar. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Subscribes to a CSS media query. Used where desktop and mobile are different designs
 * (not just a resized layout), so the page renders one tree instead of two hidden copies.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
