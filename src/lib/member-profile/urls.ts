export const MY_MEMBER_PROFILE_HREF = "/club/ma-fiche";

export function buildMemberProfileHref(registrationId: string): string {
  return `/club/adherents/${encodeURIComponent(registrationId)}`;
}

export function buildTreatDossierHref(registrationId: string): string {
  const params = new URLSearchParams({
    status: "actionable",
    id: registrationId,
  });
  return `/club/demandes-adhesion?${params.toString()}`;
}
