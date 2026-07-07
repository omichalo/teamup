import {
  formatRegistrationPaymentEmailsForStorage,
  resolveRegistrationContactEmail,
  resolveRegistrationPaymentRecipientEmails,
  resolveRegistrationRepresentativeEmails,
} from "@/lib/club-registration/resolve-registration-contact-email";
import { USER_ROLES } from "@/lib/auth/roles";

describe("resolveRegistrationRepresentativeEmails", () => {
  it("retourne tous les e-mails valides des représentants", () => {
    expect(
      resolveRegistrationRepresentativeEmails({
        representatives: [
          { email: "parent1@example.com" },
          { email: "parent2@example.com" },
        ],
      })
    ).toEqual(["parent1@example.com", "parent2@example.com"]);
  });

  it("déduplique les adresses identiques", () => {
    expect(
      resolveRegistrationRepresentativeEmails({
        representatives: [
          { email: "Parent@Example.com" },
          { email: "parent@example.com" },
        ],
      })
    ).toEqual(["Parent@Example.com"]);
  });
});

describe("resolveRegistrationContactEmail", () => {
  it("privilégie les représentants pour un mineur", () => {
    expect(
      resolveRegistrationContactEmail({
        isMinor: true,
        adherentEmail: "jean@example.com",
        representatives: [{ email: "parent@example.com" }],
        submitterAccountEmail: "staff@club.fr",
      })
    ).toBe("parent@example.com");
  });

  it("utilise l'e-mail adhérent pour un majeur", () => {
    expect(
      resolveRegistrationContactEmail({
        isMinor: false,
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

  it("retombe sur le compte soumettant en dernier recours", () => {
    expect(
      resolveRegistrationContactEmail({
        adherentEmail: "",
        representatives: [],
        submitterAccountEmail: "parent@example.com",
      })
    ).toBe("parent@example.com");
  });
});

describe("resolveRegistrationPaymentRecipientEmails", () => {
  it("envoie au compte soumettant pour un parent inscrivant son mineur", () => {
    expect(
      resolveRegistrationPaymentRecipientEmails({
        submitterRole: USER_ROLES.PLAYER,
        submitterAccountEmail: "parent@example.com",
        isMinor: true,
        adherentEmail: "enfant@example.com",
        representatives: [
          { email: "parent1@example.com" },
          { email: "parent2@example.com" },
        ],
      })
    ).toEqual(["parent@example.com"]);
  });

  it("envoie à tous les représentants si le dossier a été créé par un admin", () => {
    expect(
      resolveRegistrationPaymentRecipientEmails({
        submitterRole: USER_ROLES.ADMIN,
        submitterAccountEmail: "admin@club.fr",
        isMinor: true,
        adherentEmail: "enfant@example.com",
        representatives: [
          { email: "parent1@example.com" },
          { email: "parent2@example.com" },
        ],
      })
    ).toEqual(["parent1@example.com", "parent2@example.com"]);
  });

  it("envoie aux représentants si le dossier a été créé par le secrétariat", () => {
    expect(
      resolveRegistrationPaymentRecipientEmails({
        submitterRole: USER_ROLES.SECRETARY,
        submitterAccountEmail: "secretariat@club.fr",
        isMinor: true,
        representatives: [{ email: "parent@example.com" }],
      })
    ).toEqual(["parent@example.com"]);
  });

  it("retourne l'e-mail du compte soumettant pour un majeur auto-inscrit", () => {
    expect(
      resolveRegistrationPaymentRecipientEmails({
        submitterRole: USER_ROLES.PLAYER,
        submitterAccountEmail: "jean@example.com",
        isMinor: false,
        adherentEmail: "jean@example.com",
        representatives: [],
      })
    ).toEqual(["jean@example.com"]);
  });

  it("retombe sur le contact adhérent si le compte soumettant n'a pas d'e-mail", () => {
    expect(
      resolveRegistrationPaymentRecipientEmails({
        submitterRole: USER_ROLES.PLAYER,
        submitterAccountEmail: null,
        isMinor: false,
        adherentEmail: "jean@example.com",
        representatives: [],
      })
    ).toEqual(["jean@example.com"]);
  });

  it("retombe sur l'e-mail adhérent pour un dossier staff sans représentant", () => {
    expect(
      resolveRegistrationPaymentRecipientEmails({
        submitterRole: USER_ROLES.ADMIN,
        submitterAccountEmail: "admin@club.fr",
        isMinor: true,
        adherentEmail: "enfant@example.com",
        representatives: [{ email: "" }],
      })
    ).toEqual(["enfant@example.com"]);
  });
});

describe("formatRegistrationPaymentEmailsForStorage", () => {
  it("joint les adresses pour l'affichage secrétariat", () => {
    expect(
      formatRegistrationPaymentEmailsForStorage([
        "parent1@example.com",
        "parent2@example.com",
      ])
    ).toBe("parent1@example.com, parent2@example.com");
  });
});
