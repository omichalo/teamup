export type RegistrationCertificateViewModel = {
  registrationId: string;
  title: string;
  clubName: string;
  /** Civilité : M. / Mme / M./Mme */
  civilityLabel: string;
  adherentName: string;
  /** Participe passé accordé : inscrit / inscrite */
  enrolledParticiple: string;
  seasonLabel: string;
  inscriptionAmountCents: number;
  inscriptionAmountLabel: string;
  settledAtLabel: string;
  primaryPaymentMethodLabel: string;
  issuedAtLabel: string;
  signatoryName: string;
  activityLabel: string;
};
