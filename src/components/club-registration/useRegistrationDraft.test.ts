import { registrationDraftReducer } from "./useRegistrationDraft";
import { buildDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import { createEmptyDraft, createEmptyRepresentative } from "./registration-defaults";

const defaultConfig = buildDefaultRegistrationConfig();

describe("registrationDraftReducer", () => {
  it("PATCH_FIELDS fusionne les champs", () => {
    const s = createEmptyDraft();
    const next = registrationDraftReducer(s, {
      type: "PATCH_FIELDS",
      patch: { firstName: "Olivier", city: "Guyancourt" },
    });
    expect(next.firstName).toBe("Olivier");
    expect(next.city).toBe("Guyancourt");
  });

  it("SET_ADHERENT_ROLE vers minor_dependent ajoute un représentant si vide", () => {
    const s = { ...createEmptyDraft(), adherentEmail: "parent@example.com" };
    const next = registrationDraftReducer(s, {
      type: "SET_ADHERENT_ROLE",
      role: "minor_dependent",
    });
    expect(next.adherentRole).toBe("minor_dependent");
    expect(next.adherentEmail).toBe("");
    expect(next.representatives).toHaveLength(1);
  });

  it("SET_ADHERENT_ROLE vers minor_dependent ne touche pas si représentants déjà présents", () => {
    const s = {
      ...createEmptyDraft(),
      representatives: [
        {
          role: "mother" as const,
          firstName: "Marie",
          lastName: "X",
          email: "marie@example.com",
          phone: "0612345678",
        },
      ],
    };
    const next = registrationDraftReducer(s, {
      type: "SET_ADHERENT_ROLE",
      role: "minor_dependent",
    });
    expect(next.representatives).toHaveLength(1);
    expect(next.representatives[0].firstName).toBe("Marie");
  });

  it("SET_ADHERENT_ROLE vers self vide les représentants existants", () => {
    const s = {
      ...createEmptyDraft(),
      adherentRole: "minor_dependent" as const,
      representatives: [
        {
          role: "mother" as const,
          firstName: "Marie",
          lastName: "X",
          email: "marie@example.com",
          phone: "0612345678",
        },
      ],
    };
    const next = registrationDraftReducer(s, {
      type: "SET_ADHERENT_ROLE",
      role: "self",
    });
    expect(next.adherentRole).toBe("self");
    expect(next.representatives).toHaveLength(0);
  });

  it("SET_ADHERENT_ROLE vers other_adult vide les représentants existants", () => {
    const s = {
      ...createEmptyDraft(),
      adherentRole: "minor_dependent" as const,
      representatives: [
        {
          role: "mother" as const,
          firstName: "Marie",
          lastName: "X",
          email: "marie@example.com",
          phone: "0612345678",
        },
      ],
    };
    const next = registrationDraftReducer(s, {
      type: "SET_ADHERENT_ROLE",
      role: "other_adult",
    });
    expect(next.adherentRole).toBe("other_adult");
    expect(next.representatives).toHaveLength(0);
  });

  it("SET_SEX à autre que female reset firstFemaleRegistrationSqy", () => {
    const s = { ...createEmptyDraft(), firstFemaleRegistrationSqy: true };
    const next = registrationDraftReducer(s, { type: "SET_SEX", sex: "male" });
    expect(next.firstFemaleRegistrationSqy).toBeUndefined();
  });

  it("SET_SEX à female initialise firstFemaleRegistrationSqy à false", () => {
    const s = createEmptyDraft();
    expect(s.firstFemaleRegistrationSqy).toBeUndefined();
    const next = registrationDraftReducer(s, { type: "SET_SEX", sex: "female" });
    expect(next.firstFemaleRegistrationSqy).toBe(false);
  });

  it("ADD_REPRESENTATIVE ajoute jusqu'à 2", () => {
    let s = createEmptyDraft();
    s = registrationDraftReducer(s, { type: "ADD_REPRESENTATIVE" });
    s = registrationDraftReducer(s, { type: "ADD_REPRESENTATIVE" });
    expect(s.representatives).toHaveLength(2);
    s = registrationDraftReducer(s, { type: "ADD_REPRESENTATIVE" });
    expect(s.representatives).toHaveLength(2);
  });

  it("UPDATE_REPRESENTATIVE met à jour les champs ciblés", () => {
    let s = registrationDraftReducer(createEmptyDraft(), {
      type: "ADD_REPRESENTATIVE",
      representative: createEmptyRepresentative(),
    });
    s = registrationDraftReducer(s, {
      type: "UPDATE_REPRESENTATIVE",
      index: 0,
      patch: { firstName: "Marie", lastName: "Dupont" },
    });
    expect(s.representatives[0].firstName).toBe("Marie");
    expect(s.representatives[0].lastName).toBe("Dupont");
  });

  it("REMOVE_REPRESENTATIVE retire l'élément ciblé", () => {
    let s = registrationDraftReducer(createEmptyDraft(), {
      type: "ADD_REPRESENTATIVE",
      representative: { ...createEmptyRepresentative(), firstName: "A" },
    });
    s = registrationDraftReducer(s, {
      type: "ADD_REPRESENTATIVE",
      representative: { ...createEmptyRepresentative(), firstName: "B" },
    });
    s = registrationDraftReducer(s, { type: "REMOVE_REPRESENTATIVE", index: 0 });
    expect(s.representatives).toHaveLength(1);
    expect(s.representatives[0].firstName).toBe("B");
  });

  it("HYDRATE normalise les représentants incomplets (brouillon local)", () => {
    const s = createEmptyDraft();
    const hydrated = {
      ...createEmptyDraft(),
      representatives: [
        {
          role: "mother" as const,
          firstName: "Marie",
          lastName: "Dupont",
          email: "marie@example.com",
        },
      ],
    };
    const next = registrationDraftReducer(s, {
      type: "HYDRATE",
      draft: hydrated,
      config: defaultConfig,
    });
    expect(next.representatives[0].phone).toBe("");
  });

  it("ADD_REPRESENTATIVE normalise un représentant partiel", () => {
    let s = createEmptyDraft();
    s = registrationDraftReducer(s, {
      type: "ADD_REPRESENTATIVE",
      representative: {
        role: "father",
        firstName: "Paul",
        lastName: "Dupont",
        email: "paul@example.com",
      },
    });
    expect(s.representatives[0].phone).toBe("");
  });

  it("HYDRATE remplace tout l'état par le draft fourni", () => {
    const s = createEmptyDraft();
    const hydrated = { ...createEmptyDraft(), firstName: "Camille" };
    const next = registrationDraftReducer(s, {
      type: "HYDRATE",
      draft: hydrated,
      config: defaultConfig,
    });
    expect(next.firstName).toBe("Camille");
  });

  it("RESET ramène à un draft vide", () => {
    const s = { ...createEmptyDraft(), firstName: "X" };
    const next = registrationDraftReducer(s, { type: "RESET" });
    expect(next.firstName).toBe("");
  });
});
