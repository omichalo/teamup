const LEGACY_PASS_SPORT_AID_ID = "pass_sport";

export type ReductionReferenceCodes = Record<string, string>;

export function normalizeReductionReferenceCodes(
  codes: ReductionReferenceCodes | undefined,
  legacyPassSportCode?: string | null
): ReductionReferenceCodes {
  const normalized: ReductionReferenceCodes = { ...(codes ?? {}) };
  const legacy = legacyPassSportCode?.trim();
  if (legacy && !normalized[LEGACY_PASS_SPORT_AID_ID]) {
    normalized[LEGACY_PASS_SPORT_AID_ID] = legacy;
  }
  return normalized;
}

export function stripUnselectedReductionReferenceCodes(
  codes: ReductionReferenceCodes,
  selectedReductionIds: ReadonlySet<string>
): ReductionReferenceCodes {
  const next: ReductionReferenceCodes = {};
  for (const [aidId, value] of Object.entries(codes)) {
    if (selectedReductionIds.has(aidId) && value.trim() !== "") {
      next[aidId] = value.trim();
    }
  }
  return next;
}

export function getReductionReferenceCode(
  codes: ReductionReferenceCodes | undefined,
  aidId: string
): string {
  return codes?.[aidId]?.trim() ?? "";
}

export function setReductionReferenceCode(
  codes: ReductionReferenceCodes | undefined,
  aidId: string,
  value: string
): ReductionReferenceCodes {
  const next = { ...(codes ?? {}) };
  const trimmed = value.trim();
  if (trimmed === "") {
    delete next[aidId];
  } else {
    next[aidId] = trimmed;
  }
  return next;
}

export function preprocessRegistrationPayloadInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const record = { ...(input as Record<string, unknown>) };
  const reductionTypes = Array.isArray(record.reductionTypes)
    ? (record.reductionTypes as string[])
    : [];
  const selected = new Set(reductionTypes);
  const codes = stripUnselectedReductionReferenceCodes(
    normalizeReductionReferenceCodes(
      record.reductionReferenceCodes as ReductionReferenceCodes | undefined,
      typeof record.passSportCode === "string" ? record.passSportCode : undefined
    ),
    selected
  );
  record.reductionReferenceCodes = codes;
  delete record.passSportCode;
  return record;
}

export function reductionReferenceCodeFieldKey(aidId: string): string {
  return `reductionReferenceCodes.${aidId}`;
}

export function resolveRegistrationFieldStepKey(fieldKey: string): string {
  if (fieldKey.startsWith("reductionReferenceCodes.")) {
    return "reductionReferenceCodes";
  }
  return fieldKey;
}
