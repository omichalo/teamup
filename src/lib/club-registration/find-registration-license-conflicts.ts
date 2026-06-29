import type { Firestore } from "firebase-admin/firestore";
import { COLLECTION } from "@/lib/club-registration/list-registrations";
import {
  formatPersonDisplayName,
} from "@/lib/shared/person-name-format";
import type { RegistrationStatus } from "@/lib/club-registration/registration-status";

export type RegistrationLicenseConflict = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  status: RegistrationStatus;
};

export type RegistrationLicenseConflictResult = {
  blocking: RegistrationLicenseConflict[];
  warnings: RegistrationLicenseConflict[];
};

const BLOCKING_STATUSES = new Set<RegistrationStatus>([
  "submitted",
  "in_review",
  "payment_requested",
  "paid",
  "approved",
]);

function isRegistrationStatus(value: string): value is RegistrationStatus {
  return (
    value === "submitted" ||
    value === "in_review" ||
    value === "payment_requested" ||
    value === "paid" ||
    value === "approved" ||
    value === "rejected"
  );
}

function toConflict(
  id: string,
  data: Record<string, unknown>
): RegistrationLicenseConflict | null {
  const statusRaw = typeof data.status === "string" ? data.status : "";
  if (!isRegistrationStatus(statusRaw) || statusRaw === "rejected") {
    return null;
  }
  const firstName = typeof data.firstName === "string" ? data.firstName : "";
  const lastName = typeof data.lastName === "string" ? data.lastName : "";
  return {
    id,
    firstName,
    lastName,
    displayName: formatPersonDisplayName(firstName, lastName) || "Adhérent",
    status: statusRaw,
  };
}

const LICENSE_QUERY_FIELDS = [
  "ffttLicense",
  "ffttLicenseLookup.licence",
] as const;

async function queryRegistrationsByLicenseField(
  db: Firestore,
  field: (typeof LICENSE_QUERY_FIELDS)[number],
  normalized: string
) {
  return db.collection(COLLECTION).where(field, "==", normalized).limit(25).get();
}

export async function findRegistrationLicenseConflicts(
  db: Firestore,
  license: string,
  excludeRegistrationId?: string | null
): Promise<RegistrationLicenseConflictResult> {
  const normalized = license.replace(/\D/g, "");
  if (!normalized) {
    return { blocking: [], warnings: [] };
  }

  const snapshots = await Promise.all(
    LICENSE_QUERY_FIELDS.map((field) =>
      queryRegistrationsByLicenseField(db, field, normalized)
    )
  );

  const docsById = new Map<string, (typeof snapshots)[number]["docs"][number]>();
  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      docsById.set(doc.id, doc);
    }
  }

  const blocking: RegistrationLicenseConflict[] = [];
  const warnings: RegistrationLicenseConflict[] = [];

  for (const doc of docsById.values()) {
    if (excludeRegistrationId && doc.id === excludeRegistrationId) continue;
    const conflict = toConflict(doc.id, doc.data());
    if (!conflict) continue;
    if (BLOCKING_STATUSES.has(conflict.status)) {
      blocking.push(conflict);
    }
  }

  return { blocking, warnings };
}

export function formatBlockingLicenseConflictMessage(
  conflicts: RegistrationLicenseConflict[]
): string {
  if (conflicts.length === 0) {
    return "Cette licence est déjà utilisée sur un autre dossier.";
  }
  const names = conflicts
    .map((c) => `${c.displayName} (${c.status})`)
    .join(", ");
  return `Cette licence est déjà associée à un dossier existant : ${names}.`;
}
