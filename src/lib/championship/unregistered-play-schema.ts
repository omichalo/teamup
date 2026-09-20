import { z } from "zod";
import {
  UNREGISTERED_PLAY_COMPETITIONS,
  UNREGISTERED_PLAY_PAYMENT_STATUS_VALUES,
} from "./unregistered-play-follow-up";

export const unregisteredPlayPaymentPatchSchema = z.object({
  competition: z.enum(UNREGISTERED_PLAY_COMPETITIONS),
  paymentStatus: z.enum(UNREGISTERED_PLAY_PAYMENT_STATUS_VALUES),
});

export type UnregisteredPlayPaymentPatch = z.infer<
  typeof unregisteredPlayPaymentPatchSchema
>;
