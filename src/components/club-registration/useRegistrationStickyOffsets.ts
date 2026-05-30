"use client";

import { useEffect, useState, type RefObject } from "react";

export type RegistrationStickyOffsets = {
  topPx: number;
  bottomPx: number;
};

const VIEWPORT_TOP_GAP_PX = 24;
const VIEWPORT_BOTTOM_GAP_PX = 16;
const DEFAULT_BOTTOM_PX = 96;

/**
 * Mesure la barre d’actions (Retour / Continuer) pour borner le panneau « Mon dossier »
 * (`position: sticky` + `max-height`) sans rognage en haut ou en bas.
 */
export function useRegistrationStickyOffsets(
  navRef: RefObject<HTMLElement | null>,
  /** Force une nouvelle mesure quand la barre d’actions change (ex. bouton Retour). */
  remeasureKey: number = 0
): RegistrationStickyOffsets {
  const [offsets, setOffsets] = useState<RegistrationStickyOffsets>({
    topPx: VIEWPORT_TOP_GAP_PX,
    bottomPx: DEFAULT_BOTTOM_PX,
  });

  useEffect(() => {
    const measure = () => {
      const navHeight = navRef.current?.getBoundingClientRect().height ?? 0;
      setOffsets({
        topPx: VIEWPORT_TOP_GAP_PX,
        bottomPx:
          navHeight > 0
            ? Math.ceil(navHeight + VIEWPORT_BOTTOM_GAP_PX + 8)
            : DEFAULT_BOTTOM_PX,
      });
    };

    measure();

    const navEl = navRef.current;
    const observer = new ResizeObserver(measure);
    if (navEl) {
      observer.observe(navEl);
    }
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [navRef, remeasureKey]);

  return offsets;
}
