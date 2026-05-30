"use client";

import { useEffect, useRef, useState } from "react";
import { clientAuth } from "@/lib/firebase.client";

type Status = "idle" | "polling" | "verified" | "timeout" | "error";

type Options = {
  /** Active le polling (typiquement après un signup réussi). */
  enabled: boolean;
  /** Intervalle entre deux checks (ms). Défaut: 5000. */
  intervalMs?: number;
  /** Délai max avant abandon automatique (ms). Défaut: 10 min. */
  timeoutMs?: number;
  /**
   * Callback appelé une fois que l'email est vérifié côté Firebase.
   * Le hook attend la résolution éventuelle d'une Promise (utile pour
   * enchaîner POST /api/session puis la suite du flow appelant).
   */
  onVerified: () => void | Promise<void>;
};

type Result = {
  status: Status;
  /** Dernier check en ms epoch (utile pour afficher "Dernier contrôle il y a Xs"). */
  lastCheckedAt: number | null;
};

/**
 * Polling post-signup pour détecter automatiquement la vérification de l'email.
 *
 * Stratégie :
 * - Tant que `enabled` et que `clientAuth.currentUser` existe et `!emailVerified`,
 *   on appelle `currentUser.reload()` toutes les `intervalMs`, puis on relit
 *   `emailVerified` (Firebase recharge les claims côté client).
 * - Dès que `emailVerified === true`, on stoppe le polling et on appelle
 *   `onVerified()`.
 * - Au-delà de `timeoutMs`, on bascule en `timeout` (le composant parent peut
 *   afficher un message « Le contrôle automatique est suspendu, cliquez pour
 *   réessayer »).
 * - Cleanup garanti à l'unmount (clearInterval + clearTimeout).
 *
 * Note : si l'utilisateur valide son email dans un autre navigateur, ce polling
 * ne le détectera pas (pas de propagation cross-browser via Firebase JS SDK).
 * Le composant parent doit donc proposer un fallback manuel "Je viens de
 * vérifier mon email".
 */
export function usePostSignupVerificationPolling({
  enabled,
  intervalMs = 5_000,
  timeoutMs = 10 * 60_000,
  onVerified,
}: Options): Result {
  const [status, setStatus] = useState<Status>("idle");
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const onVerifiedRef = useRef(onVerified);

  /* Garde la dernière référence de callback sans relancer l'effet à chaque rendu. */
  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("polling");

    const intervalId = setInterval(async () => {
      if (cancelled) return;
      const u = clientAuth.currentUser;
      if (!u) {
        /* Plus d'utilisateur courant côté Firebase JS : on s'arrête proprement. */
        setStatus("idle");
        return;
      }
      try {
        await u.reload();
        setLastCheckedAt(Date.now());
        if (cancelled) return;
        if (clientAuth.currentUser?.emailVerified) {
          setStatus("verified");
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          try {
            await onVerifiedRef.current();
          } catch {
            /* Le composant parent gère les erreurs de bascule de session ; on
               reste en `verified` côté hook pour ne pas masquer la réussite. */
          }
        }
      } catch {
        /* Une erreur réseau ponctuelle ne doit pas tuer le polling :
           on attend simplement le prochain tick. */
      }
    }, intervalMs);

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setStatus((s) => (s === "verified" ? s : "timeout"));
      clearInterval(intervalId);
    }, timeoutMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [enabled, intervalMs, timeoutMs]);

  return { status, lastCheckedAt };
}
