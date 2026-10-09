import { USER_ROLES } from "@/lib/auth/roles";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import {
  buildMailingListCsv,
  buildMailingListExportFilename,
  collectMailingListEmails,
  countRegistrationsWithoutMailingEmail,
  formatMailingListForClipboard,
} from "./export-mailing-list";

function row(partial: Record<string, unknown> & { id: string }): RegistrationClientRecord {
  return partial;
}

describe("export mailing list", () => {
  const rows: RegistrationClientRecord[] = [
    row({
      id: "reg-1",
      firstName: "Léa",
      lastName: "DUPONT",
      isMinor: true,
      representatives: [
        { email: "parent1@example.com" },
        { email: "parent2@example.com" },
      ],
    }),
    row({
      id: "reg-2",
      firstName: "Jean",
      lastName: "MARTIN",
      isMinor: false,
      adherentEmail: "jean@example.com",
    }),
    row({
      id: "reg-3",
      firstName: "Paul",
      lastName: "DURAND",
      isMinor: false,
      adherentEmail: "parent1@example.com",
    }),
  ];

  it("collecte les e-mails uniques en conservant l'ordre", () => {
    expect(collectMailingListEmails(rows)).toEqual([
      "parent1@example.com",
      "parent2@example.com",
      "jean@example.com",
    ]);
  });

  it("formate pour le presse-papiers avec point-virgule", () => {
    expect(formatMailingListForClipboard(["a@x.fr", "b@y.fr"])).toBe("a@x.fr; b@y.fr");
  });

  it("génère un CSV avec en-têtes et BOM", () => {
    const csv = buildMailingListCsv(rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Email;Nom adhérent;Prénom adhérent;Type contact;Id dossier");
    expect(csv).toContain("parent1@example.com;DUPONT;Léa;représentant;reg-1");
    expect(csv).toContain("jean@example.com;MARTIN;Jean;adhérent;reg-2");
    expect(csv).not.toContain("reg-3");
  });

  it("compte les dossiers sans e-mail de diffusion", () => {
    expect(
      countRegistrationsWithoutMailingEmail([
        ...rows,
        row({
          id: "reg-empty",
          isMinor: false,
          adherentEmail: "",
          submitterRole: USER_ROLES.SECRETARY,
          submitterAccountEmail: "secretariat@club.fr",
        }),
      ])
    ).toBe(1);
  });

  it("construit un nom de fichier daté", () => {
    expect(buildMailingListExportFilename(new Date("2026-10-09T12:00:00.000Z"))).toBe(
      "liste-diffusion-2026-10-09.csv"
    );
  });
});
