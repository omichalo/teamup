import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { resolveRole, type UserRole } from "@/lib/auth/roles";
import {
  canAccessChampionshipRoster,
  canRecalculateChampionshipRoster,
} from "./access";

export type ChampionshipActor =
  | { ok: true; uid: string; role: UserRole }
  | { ok: false; status: 401 | 403; error: string };

async function requireActor(
  allowed: (role: UserRole) => boolean
): Promise<ChampionshipActor> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) {
    return { ok: false, status: 401, error: "Authentification requise" };
  }
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const role = resolveRole(decoded.role as string | undefined);
  if (!allowed(role)) {
    return { ok: false, status: 403, error: "Accès refusé" };
  }
  return { ok: true, uid: decoded.uid, role };
}

export function requireChampionshipRosterActor(): Promise<ChampionshipActor> {
  return requireActor(canAccessChampionshipRoster);
}

export function requireChampionshipRecalculateActor(): Promise<ChampionshipActor> {
  return requireActor(canRecalculateChampionshipRoster);
}
