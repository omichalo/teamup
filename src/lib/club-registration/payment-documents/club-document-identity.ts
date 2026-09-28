import { SQYPING_SECRETARIAT_EMAIL } from "@/lib/email/brand";
import { SQYPING_COLORS } from "@/theme/sqyping-theme";

/** Identité club figée pour les PDF facture / reçu (alignée sur les factures Stripe). */
export const CLUB_PAYMENT_DOCUMENT_IDENTITY = {
  legalName: "Association SQY PING",
  shortName: "SQY Ping",
  addressLines: [
    "Gymnase des Pyramides",
    "Mail de Schenefield",
    "78960 Voisins le Bretonneux",
    "France",
  ],
  phone: "+33 6 64 36 53 72",
  email: SQYPING_SECRETARIAT_EMAIL,
  website: "www.sqyping.fr",
  legalLines: [
    "Agréée « jeunesse et sports » sous le N°APS 78-1126.",
    "N° SIRET : 47872639100012.",
    "Numéro d'affiliation FFTT : 08781477.",
  ],
  primaryColor: SQYPING_COLORS.primary.main,
  secondaryColor: SQYPING_COLORS.secondary.main,
  logoPathRelative: ["public", "sqyping-logo.png"],
} as const;
