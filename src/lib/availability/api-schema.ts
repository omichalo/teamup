import { z } from "zod";
import { AvailabilityResponse } from "@/lib/services/availability-service";
import type { PlayerAvailabilityUpdate } from "@/lib/availability/firestore-persistence";

const availabilityResponseSchema = z
  .object({
    available: z.boolean().optional(),
    comment: z.string().optional(),
    fridayAvailable: z.boolean().optional(),
    saturdayAvailable: z.boolean().optional(),
  })
  .strict();

const playerUpdateSchema = z
  .object({
    playerId: z.string().trim().min(1),
    response: availabilityResponseSchema.nullable(),
  })
  .strict();

export const patchAvailabilitiesSchema = z
  .object({
    journee: z.number().int().positive(),
    phase: z.enum(["aller", "retour"]),
    championshipType: z.enum(["masculin", "feminin"]),
    idEpreuve: z.number().int().positive().optional(),
    date: z.string().trim().min(1).optional(),
    playerUpdates: z.array(playerUpdateSchema).min(1).max(100),
  })
  .strict();

export type PatchAvailabilitiesInput = z.infer<typeof patchAvailabilitiesSchema>;

function toAvailabilityResponse(
  response: z.infer<typeof availabilityResponseSchema> | null
): AvailabilityResponse | null {
  if (response === null) {
    return null;
  }

  const normalized: AvailabilityResponse = {};

  if (response.available !== undefined) {
    normalized.available = response.available;
  }
  if (response.comment !== undefined) {
    normalized.comment = response.comment;
  }
  if (response.fridayAvailable !== undefined) {
    normalized.fridayAvailable = response.fridayAvailable;
  }
  if (response.saturdayAvailable !== undefined) {
    normalized.saturdayAvailable = response.saturdayAvailable;
  }

  return normalized;
}

export function toPlayerAvailabilityUpdates(
  playerUpdates: PatchAvailabilitiesInput["playerUpdates"]
): PlayerAvailabilityUpdate[] {
  return playerUpdates.map(({ playerId, response }) => ({
    playerId,
    response: toAvailabilityResponse(response),
  }));
}
