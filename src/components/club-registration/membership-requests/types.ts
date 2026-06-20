import type { MedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import type {
  MedicalQuestionnairePayload,
  MedicalVeteranPathPayload,
  Representative,
} from "@/lib/club-registration/schema";
import type { PaymentAid, RegistrationPayment } from "@/lib/club-registration/payment/types";
import type { PriceQuote } from "@/lib/pricing";

export type FfttLicenseLookup = {
  licence?: string;
  nom?: string;
  prenom?: string;
  nomClub?: string;
  categorie?: string;
  pointsLicence?: number | null;
};

export type RegistrationSummary = {
  id: string;
  firstName?: string;
  lastName?: string;
  submitterAccountEmail?: string;
  mainSectionId?: string;
  medicalCertificateDeclaration?: string;
  medicalCertificateStatus?: MedicalCertificateStatus;
  status?: string;
  paymentAmountCents?: number;
  pricingQuote?: PriceQuote;
  pricingQuoteStatus?: string;
  pricingQuoteComputedAt?: string | null;
  /** Ancien champ — lecture seule pour dossiers déjà enregistrés. */
  handisportPracticeLevel?: "leisure" | "competition";
  paymentStatus?: string;
  payment?: RegistrationPayment;
  submittedAt?: string | null;
  updatedAt?: string | null;
};

export type RegistrationDetail = RegistrationSummary & {
  adherentRole?: "self" | "minor_dependent" | "other_adult";
  ffttLicense?: string;
  ffttLicenseLookup?: FfttLicenseLookup;
  sex?: "female" | "male" | "other";
  birthCity?: string;
  birthDate?: string;
  adherentEmail?: string;
  adherentPhonePrimary?: string;
  adherentPhoneSecondary?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  representatives?: Representative[];
  additionalSectionIds?: string[];
  slotIds?: string[];
  schoolPickupSlotIds?: string[];
  medicalQuestionnaire?: MedicalQuestionnairePayload;
  medicalVeteranPath?: MedicalVeteranPathPayload;
  medicalCertificateStatusUpdatedAt?: string | null;
  medicalCertificateStatusUpdatedBy?: string;
  wantsRegistrationCertificate?: boolean;
  familyRegistrationOrder?: string;
  reductionTypes?: string[];
  reductionReferenceCodes?: Record<string, string>;
  passSportCode?: string;
  firstFemaleRegistrationSqy?: boolean;
  photoConsent?: "accept" | "refuse";
  emergencyMedicalAuthorization?: "yes" | "not_applicable_adult";
  supervisionAcknowledgement?: "yes" | "not_applicable_adult";
  internalRulesAccepted?: boolean;
  wantsCompetitorExtras?: boolean;
  competitionJerseySize?: string;
  wantsOptionalJersey?: boolean;
  optionalJerseySize?: string;
  competitionIds?: string[];
  applicantNotes?: string;
  reviewNotes?: string;
  paymentEmailSentTo?: string;
  stripeCheckoutUrl?: string;
  paymentAids?: PaymentAid[];
};

export type EditableRegistration = {
  adherentRole: "self" | "minor_dependent" | "other_adult";
  ffttLicense: string;
  firstName: string;
  lastName: string;
  sex: "female" | "male" | "other";
  birthCity: string;
  birthDate: string;
  adherentEmail: string;
  adherentPhonePrimary: string;
  adherentPhoneSecondary: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  representatives: Representative[];
  mainSectionId: string;
  additionalSectionIds: string[];
  slotIds: string[];
  schoolPickupSlotIds: string[];
  medicalCertificateDeclaration: string;
  medicalCertificateStatus: MedicalCertificateStatus;
  wantsRegistrationCertificate: boolean;
  familyRegistrationOrder: string;
  reductionTypes: string[];
  reductionReferenceCodes: Record<string, string>;
  firstFemaleRegistrationSqy: boolean | undefined;
  photoConsent: "accept" | "refuse";
  emergencyMedicalAuthorization: "yes" | "not_applicable_adult";
  supervisionAcknowledgement: "yes" | "not_applicable_adult";
  internalRulesAccepted: boolean;
  wantsCompetitorExtras: boolean;
  competitionJerseySize: string;
  wantsOptionalJersey: boolean;
  optionalJerseySize: string;
  competitionIds: string[];
  applicantNotes: string;
  reviewNotes: string;
  amountEuros: string;
  paymentAids: PaymentAid[];
};
