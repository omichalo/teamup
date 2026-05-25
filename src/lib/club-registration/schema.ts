import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import {
  buildRegistrationPayloadSchema,
  type ClubRegistrationPayload,
} from "./build-payload-schema";

export {
  adherentRoleSchema,
  ffttLicenseLookupSchema,
  medicalQuestionnaireSchema,
  medicalVeteranPathSchema,
  representativeSchema,
  type AdherentRole,
  type MedicalQuestionnairePayload,
  type MedicalVeteranPathPayload,
  type Representative,
} from "./schema-base";

export { buildRegistrationPayloadSchema, type ClubRegistrationPayload };

/** Schéma par défaut (seed) — préférer `buildRegistrationPayloadSchema(config)` côté API. */
export const clubRegistrationPayloadSchema = buildRegistrationPayloadSchema(
  getDefaultRegistrationConfig()
);
