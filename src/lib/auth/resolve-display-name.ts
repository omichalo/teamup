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
  const uniqueUids = [...new Set(uids.filter((uid) => uid.length > 0))];
  const result = new Map<string, string | null>();

  if (uniqueUids.length === 0) {
    return result;
  }

  try {
    const refs = uniqueUids.map((uid) => db.collection("users").doc(uid));
    const snapshots = await db.getAll(...refs);
    for (const snapshot of snapshots) {
      result.set(snapshot.id, pickDisplayName(snapshot.exists ? snapshot.data() : null));
    }
  } catch {
    for (const uid of uniqueUids) {
      result.set(uid, null);
    }
  }

  for (const uid of uniqueUids) {
    if (!result.has(uid)) {
      result.set(uid, null);
    }
  }

  return result;
}
