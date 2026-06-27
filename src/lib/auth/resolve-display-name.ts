import type { Firestore } from "firebase-admin/firestore";

type DisplayNameFallbacks = {
  tokenName?: string | null;
  email?: string | null;
};

export function pickDisplayName(
  profile: { displayName?: unknown } | null | undefined,
  fallbacks?: DisplayNameFallbacks
): string | null {
  const fromProfile = profile?.displayName;
  if (typeof fromProfile === "string" && fromProfile.trim().length > 0) {
    return fromProfile.trim();
  }

  const tokenName = fallbacks?.tokenName;
  if (typeof tokenName === "string" && tokenName.trim().length > 0) {
    return tokenName.trim();
  }

  const email = fallbacks?.email;
  if (typeof email === "string" && email.includes("@")) {
    const localPart = email.split("@")[0]?.trim();
    if (localPart) {
      return localPart;
    }
  }

  return null;
}

export async function fetchUserDisplayName(
  db: Firestore,
  uid: string,
  fallbacks?: DisplayNameFallbacks
): Promise<string | null> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    return pickDisplayName(userDoc.exists ? userDoc.data() : null, fallbacks);
  } catch {
    return pickDisplayName(null, fallbacks);
  }
}

export async function fetchUserDisplayNames(
  db: Firestore,
  uids: readonly string[]
): Promise<Map<string, string | null>> {
  const labels = await fetchUserLabels(db, uids);
  const result = new Map<string, string | null>();
  for (const [uid, label] of labels.entries()) {
    result.set(uid, formatUserLabel(label));
  }
  return result;
}

export type UserLabel = {
  displayName: string | null;
  email: string | null;
};

export function formatUserLabel(
  label: UserLabel | null | undefined,
  fallbackEmail?: string | null
): string {
  if (label?.displayName?.trim()) {
    return label.displayName.trim();
  }
  if (label?.email?.trim()) {
    return label.email.trim();
  }
  if (typeof fallbackEmail === "string" && fallbackEmail.trim().length > 0) {
    return fallbackEmail.trim();
  }
  return "";
}

export async function fetchUserLabels(
  db: Firestore,
  uids: readonly string[]
): Promise<Map<string, UserLabel>> {
  const uniqueUids = [...new Set(uids.filter((uid) => uid.length > 0))];
  const result = new Map<string, UserLabel>();

  if (uniqueUids.length === 0) {
    return result;
  }

  try {
    const refs = uniqueUids.map((uid) => db.collection("users").doc(uid));
    const snapshots = await db.getAll(...refs);
    for (const snapshot of snapshots) {
      const data = snapshot.exists ? snapshot.data() : null;
      const displayName =
        typeof data?.displayName === "string" && data.displayName.trim().length > 0
          ? data.displayName.trim()
          : null;
      const email =
        typeof data?.email === "string" && data.email.includes("@") ? data.email.trim() : null;
      result.set(snapshot.id, { displayName, email });
    }
  } catch {
    for (const uid of uniqueUids) {
      result.set(uid, { displayName: null, email: null });
    }
  }

  for (const uid of uniqueUids) {
    if (!result.has(uid)) {
      result.set(uid, { displayName: null, email: null });
    }
  }

  return result;
}
