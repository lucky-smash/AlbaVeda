import { useEffect, useRef } from "react";

/**
 * Modal behaviour for drawers/sheets: Escape closes, page scroll locks,
 * focus moves inside on open, Tab is trapped, and focus returns to the
 * trigger on close.
 */
export function useOverlay<T extends HTMLElement>(open: boolean, onClose: () => void, initialFocus?: string) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const panel = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;

    // Wait a frame so the panel is visible before focusing (keeps the slide-in smooth)
    const raf = requestAnimationFrame(() => {
      const target = (initialFocus && panel?.querySelector<HTMLElement>(initialFocus)) || panel;
      target?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      html.style.overflow = "";
      html.style.paddingRight = "";
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, initialFocus]);

  return ref;
}
