/**
 * @jest-environment jsdom
 */

import { submitRegistration } from "./submit";
import type { ClubRegistrationPayload } from "./schema";

function makePayload(): ClubRegistrationPayload {
  return {
    adherentRole: "self",
    firstName: "Olivier",
    lastName: "Dupont",
    sex: "male",
    birthCity: "Paris",
    birthDate: "1985-04-12",
    adherentEmail: "olivier@example.com",
    adherentPhonePrimary: "0612345678",
    addressLine1: "12 rue Victor Hugo",
    postalCode: "78280",
    city: "Guyancourt",
    representatives: [],
    mainSectionId: "voisins",
    additionalSectionIds: [],
    slotIds: ["voisins-mar-2030-adultes-loisirs"],
    medicalCertificateDeclaration: "under_40_all_no",
    wantsRegistrationCertificate: false,
    familyRegistrationOrder: "none",
    reductionTypes: [],
    photoConsent: "accept",
    emergencyMedicalAuthorization: "not_applicable_adult",
    supervisionAcknowledgement: "not_applicable_adult",
    internalRulesAccepted: true,
    wantsCompetitorExtras: false,
    competitionIds: [],
  } as unknown as ClubRegistrationPayload;
}

describe("submitRegistration", () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it("retourne ok=true avec l'id en cas de 200", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, id: "reg_abc" }),
    });
    const r = await submitRegistration(makePayload());
    expect(r).toEqual({ ok: true, id: "reg_abc" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/club/registration",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });

  it("retourne ok=false avec fieldErrors en cas de 400", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: "Données invalides",
        fieldErrors: { firstName: ["Le prénom est obligatoire"] },
      }),
    });
    const r = await submitRegistration(makePayload());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.error).toBe("Données invalides");
      expect(r.fieldErrors).toEqual({ firstName: ["Le prénom est obligatoire"] });
    }
  });

  it("retourne ok=false en cas de 401", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Authentification requise" }),
    });
    const r = await submitRegistration(makePayload());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
      expect(r.error).toBe("Authentification requise");
    }
  });

  it("retourne ok=false en cas de network error", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("network"));
    const r = await submitRegistration(makePayload());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(0);
      expect(r.error).toMatch(/connexion/i);
    }
  });
});
