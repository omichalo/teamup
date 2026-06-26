import { stripSubmitterEmailFromRegistrationPayload } from "@/lib/club-registration/strip-submitter-email-from-payload";
import type { ClubRegistrationPayload } from "@/lib/club-registration/schema";

describe("stripSubmitterEmailFromRegistrationPayload", () => {
  const basePayload = {
    adherentEmail: "secretaire@club.fr",
    representatives: [
      {
        role: "legal_guardian" as const,
        firstName: "Marie",
        lastName: "Dupont",
        email: "secretaire@club.fr",
        phone: "06 12 34 56 78",
      },
    ],
  } as ClubRegistrationPayload;

  it("retire l'e-mail du soumettant des contacts adhérent et représentant", () => {
    const sanitized = stripSubmitterEmailFromRegistrationPayload(
      basePayload,
      "Secretaire@club.fr"
    );

    expect(sanitized.adherentEmail).toBe("");
    expect(sanitized.representatives[0]?.email).toBe("");
  });

  it("conserve les e-mails distincts du soumettant", () => {
    const sanitized = stripSubmitterEmailFromRegistrationPayload(
      {
        ...basePayload,
        adherentEmail: "jean.dupont@example.com",
        representatives: [
          {
            ...basePayload.representatives[0]!,
            email: "parent@example.com",
          },
        ],
      },
      "secretaire@club.fr"
    );

    expect(sanitized.adherentEmail).toBe("jean.dupont@example.com");
    expect(sanitized.representatives[0]?.email).toBe("parent@example.com");
  });
});
