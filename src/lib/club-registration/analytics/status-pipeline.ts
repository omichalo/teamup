import {
  REGISTRATION_STATUS_LABELS,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";
import type { CountBucket } from "./types";

/** Parcours principal vers l'approbation (ordre chronologique métier). */
export const PIPELINE_MAIN_PATH: readonly RegistrationStatus[] = [
  "submitted",
  "in_review",
  "payment_requested",
  "paid",
  "approved",
] as const;

export type StatusPipelineStage = {
  id: RegistrationStatus;
  label: string;
  /** Dossiers actuellement à cette étape. */
  stock: number;
  /** Dossiers ayant atteint cette étape ou une étape plus avancée (hors refus). */
  cumulativeReached: number;
  stockPct: number;
  cumulativePct: number;
};

export type StatusPipeline = {
  stages: StatusPipelineStage[];
  rejected: number;
  rejectedPct: number;
  mainPathTotal: number;
  total: number;
  /** Part des dossiers hors refus validés sans paiement (statut approved). */
  completionPct: number;
};

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Construit un parcours de campagne à partir du bucket statut.
 * Le cumul « atteint ou dépassé » donne une lecture type entonnoir même si
 * on ne dispose que du statut courant (pas de transitions historiques).
 */
export function buildStatusPipeline(statusBucket: CountBucket): StatusPipeline {
  const stagesStock = PIPELINE_MAIN_PATH.map((id) => statusBucket[id] ?? 0);
  const mainPathTotal = stagesStock.reduce((sum, n) => sum + n, 0);
  const rejected = statusBucket.rejected ?? 0;
  const total = mainPathTotal + rejected + (statusBucket.unknown ?? 0);

  let suffixSum = 0;
  const cumulativeFromEnd = [...stagesStock].reverse().map((stock) => {
    suffixSum += stock;
    return suffixSum;
  });
  const cumulativeReached = cumulativeFromEnd.reverse();

  const stages: StatusPipelineStage[] = PIPELINE_MAIN_PATH.map((id, index) => ({
    id,
    label: REGISTRATION_STATUS_LABELS[id],
    stock: stagesStock[index] ?? 0,
    cumulativeReached: cumulativeReached[index] ?? 0,
    stockPct: pct(stagesStock[index] ?? 0, total),
    cumulativePct: pct(cumulativeReached[index] ?? 0, mainPathTotal),
  }));

  const approved = statusBucket.approved ?? 0;

  return {
    stages,
    rejected,
    rejectedPct: pct(rejected, total),
    mainPathTotal,
    total,
    completionPct: pct(approved, mainPathTotal),
  };
}
