import { buildMemberProfileHref, buildTreatDossierHref } from "./urls";

describe("member-profile urls", () => {
  it("encode l'id dans la fiche", () => {
    expect(buildMemberProfileHref("abc/def")).toBe("/club/adherents/abc%2Fdef");
  });

  it("construit le lien file de traitement", () => {
    expect(buildTreatDossierHref("reg-1")).toBe(
      "/club/demandes-adhesion?status=actionable&id=reg-1"
    );
  });
});
