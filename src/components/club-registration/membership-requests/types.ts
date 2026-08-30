import type { MedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import type { CriteriumFederalRegistrationStatus } from "@/lib/club-registration/criterium-federal-follow-up";
import type { JerseyFollowUpStatus } from "@/lib/club-registration/jersey-follow-up";
import type { RegistrationCertificateFollowUpStatus } from "@/lib/club-registration/registration-certificate-follow-up";
import type {
  PpsFollowUpEvent,
  PpsFollowUpStatus,
} from "@/lib/club-registration/pps-follow-up";
import type {
  MedicalQuestionnairePayload,
  MedicalVeteranPathPayload,
  Representative,
} from "@/lib/club-registration/schema";
import type { PaymentAid, RegistrationPayment } from "@/lib/club-registration/payment/types";
import type { PriceQuote } from "@/lib/pricing";
import type { QueueAdvanceMode, QueueReloadResult } from "./queue-navigation";

export type MembershipListReloadFn = (
  options?: { advance?: QueueAdvanceMode }
) => Promise<QueueReloadResult | void>;

export type FfttLicenseLookup = {
  licence?: string;
  nom?: string;
  prenom?: string;
  nomClub?: string;
  categorie?: string;
  typeLicence?: string | null;
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
  ppsFollowUpStatus?: PpsFollowUpStatus;
  criteriumFederalRegistrationStatus?: CriteriumFederalRegistrationStatus;
  jerseyFollowUpStatus?: JerseyFollowUpStatus;
  registrationCertificateFollowUpStatus?: RegistrationCertificateFollowUpStatus;
  competitionIds?: string[];
  wantsCompetitorExtras?: boolean;
  wantsOptionalJersey?: boolean;
  status?: string;
  paymentAmountCents?: number;
  voluntaryDonationCents?: number;
  donationDiscountCents?: number;
  pricingQuote?: PriceQuote;
  pricingQuoteStatus?: string;
  pricingQuoteComputedAt?: string | null;
  /** Ancien champ — lecture seule pour dossiers déjà enregistrés. */
  handisportPracticeLevel?: "leisure" | "competition";
  paymentStatus?: string;
  payment?: RegistrationPayment;
  paymentRequestedAt?: string | null;
  paidAt?: string | null;
  paymentEmailSentTo?: string;
  submittedAt?: string | null;
  updatedAt?: string | null;
};

export type RegistrationDetail = RegistrationSummary & {
  adherentRole?: "self" | "minor_dependent" | "other_adult";
  wasSqyMemberLastYear?: boolean;
  ffttLicense?: string;
  ffttLicenseLookup?: FfttLicenseLookup;
  ffttCategorie?: string;
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
  ppsFollowUpUpdatedAt?: string | null;
  ppsFollowUpUpdatedBy?: string;
  ppsFollowUpEvents?: PpsFollowUpEvent[];
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
  criteriumFederalRegistrationStatus?: CriteriumFederalRegistrationStatus;
  jerseyFollowUpStatus?: JerseyFollowUpStatus;
  registrationCertificateFollowUpStatus?: RegistrationCertificateFollowUpStatus;
  applicantNotes?: string;
  reviewNotes?: string;
  paymentEmailSentTo?: string;
  stripeCheckoutUrl?: string;
  paymentAids?: PaymentAid[];
  voluntaryDonationCents?: number;
  donationDiscountCents?: number;
};

export type EditableRegistration = {
  adherentRole: "self" | "minor_dependent" | "other_adult";
  wasSqyMemberLastYear: boolean | undefined;
  ffttLicense: string;
  ffttLicenseLookup: FfttLicenseLookup | undefined;
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
  criteriumFederalRegistrationStatus: CriteriumFederalRegistrationStatus;
  jerseyFollowUpStatus: JerseyFollowUpStatus;
  registrationCertificateFollowUpStatus: RegistrationCertificateFollowUpStatus;
  applicantNotes: string;
  reviewNotes: string;
  amountEuros: string;
  paymentAids: PaymentAid[];
  voluntaryDonationCents: number;
};
