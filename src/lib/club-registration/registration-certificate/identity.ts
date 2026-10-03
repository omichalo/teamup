import { SQYPING_COLORS } from "@/theme/sqyping-theme";

/**
 * Identité figée pour l’attestation d’inscription (modèle Excel historique).
 * Distincte de CLUB_PAYMENT_DOCUMENT_IDENTITY (factures / reçus).
 */
export const REGISTRATION_CERTIFICATE_IDENTITY = {
  legalName: "Association SQY PING",
  shortName: "SQY PING",
  addressLine:
    "Centre sportif des Pyramides, 4 mail de Schenefeld (78960) Voisins-Le-Bx",
  legalDeclaration:
    "Déclarée à la sous-préfecture de Rambouillet sous le Numéro 1946, le 7 février 1975 (Journal officiel du 21 février 1975).",
  siret: "N° SIRET : 47872639100012.",
  ffttAffiliation: "Numéro d'affiliation FFTT : 08781477",
  website: "www.sqyping.fr",
  signatoryName: "Salomé NIZAN, Secrétaire",
  activityLabel: "tennis de table",
  primaryColor: SQYPING_COLORS.primary.main,
  logoPathRelative: ["public", "sqyping-logo.png"] as const,
  signaturePathRelative: [
    "public",
    "club-registration",
    "registration-certificate-signature.jpg",
  ] as const,
} as const;
