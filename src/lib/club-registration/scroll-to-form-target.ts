/**
 * Fait défiler la page vers un sélecteur CSS (champ, section) ou exécute un repli.
 */
export function scrollToFormTarget(
  selector: string | null | undefined,
  options?: { fallback?: () => void }
): void {
  const run = () => {
    if (selector) {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable = el.querySelector<HTMLElement>(
          'input:not([type="hidden"]), select, textarea, button, [href], [tabindex]:not([tabindex="-1"])'
        );
        const target = focusable ?? (el.matches("input, select, textarea") ? el : null);
        if (target && typeof target.focus === "function") {
          try {
            target.focus({ preventScroll: true });
          } catch {
            /* ignore */
          }
        }
        return;
      }
    }
    options?.fallback?.();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}
