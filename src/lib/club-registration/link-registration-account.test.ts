import {
  buildLinkedAccountsFirestorePatch,
  normalizeLinkTargetEmail,
} from "./link-registration-account";

describe("normalizeLinkTargetEmail", () => {
  it("normalise un e-mail valide", () => {
    expect(normalizeLinkTargetEmail("  Parent@Example.COM ")).toBe(
      "parent@example.com"
    );
  });

  it("refuse un e-mail invalide", () => {
    expect(normalizeLinkTargetEmail("pas-un-email")).toBeNull();
    expect(normalizeLinkTargetEmail("")).toBeNull();
    expect(normalizeLinkTargetEmail(null)).toBeNull();
  });
});

describe("buildLinkedAccountsFirestorePatch", () => {
  it("remplace par un seul compte lié", () => {
    const patch = buildLinkedAccountsFirestorePatch({
      targetUid: "uid-member",
      targetEmail: "member@ex.com",
      actorUid: "uid-admin",
    });
    expect(patch.linkedAccountUids).toEqual(["uid-member"]);
    expect(patch.linkedAccountEmails).toEqual(["member@ex.com"]);
    expect(patch.linkedAccountsUpdatedByUid).toBe("uid-admin");
    expect(patch.linkedAccountsUpdatedAt).toBeDefined();
  });
});
