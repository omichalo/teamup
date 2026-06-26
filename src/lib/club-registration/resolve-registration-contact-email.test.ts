import { resolveRegistrationContactEmail } from "@/lib/club-registration/resolve-registration-contact-email";

describe("resolveRegistrationContactEmail", () => {
  it("privilégie l'e-mail adhérent", () => {
    expect(
      resolveRegistrationContactEmail({
        adherentEmail: "jean@example.com",
        representatives: [{ email: "parent@example.com" }],
        submitterAccountEmail: "staff@club.fr",
      })
    ).toBe("jean@example.com");
  });

  it("utilise le représentant légal si l'adhérent n'a pas d'e-mail", () => {
    expect(
      resolveRegistrationContactEmail({
        adherentEmail: "",
        representatives: [{ email: "parent@example.com" }],
        submitterAccountEmail: "staff@club.fr",
      })
    ).toBe("parent@example.com");
  });

  it("n'utilise pas l'e-mail du compte soumettant comme contact", () => {
    expect(
      resolveRegistrationContactEmail({
        adherentEmail: "",
        representatives: [],
        submitterAccountEmail: "staff@club.fr",
      })
    ).toBeNull();
  });
});
