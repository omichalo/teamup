import { formatAttendanceSlotDisplay } from "@/lib/attendance/slot-display";
import type { AttendanceMark } from "@/lib/attendance/types";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { resolvePaymentDocumentsAvailability } from "@/lib/club-registration/payment-documents/availability";
import { projectRegistrationPaymentToLedger } from "@/lib/member-ledger/project-registration-payment";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import type { MemberProfileResponse } from "./types";

function readString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

function resolveSeasonLabel(data: Record<string, unknown>): string {
  return (
    readString(data, "seasonLabel") ||
    readString(data, "season") ||
    String(new Date().getFullYear())
  );
}

function resolveSlotIds(data: Record<string, unknown>): string[] {
  if (!Array.isArray(data.slotIds)) {
    return [];
  }
  return data.slotIds
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim());
}

export function buildMemberProfile(params: {
  registrationId: string;
  data: Record<string, unknown>;
  config: RegistrationConfigV1;
  marks: AttendanceMark[];
  viewerUid: string;
  canManage: boolean;
}): MemberProfileResponse {
  const firstName = readString(params.data, "firstName");
  const lastName = readString(params.data, "lastName");
  const displayName =
    formatPersonDisplayName(firstName || undefined, lastName || undefined) ||
    "Adhérent";
  const slotIds = resolveSlotIds(params.data);
  const submitterUid = readString(params.data, "submitterUid") || null;
  const ffttLicense = readString(params.data, "ffttLicense") || null;
  const status =
    typeof params.data.status === "string" ? params.data.status : null;

  const slots = slotIds.map((slotId) => ({
    slotId,
    label: formatAttendanceSlotDisplay(params.config, slotId),
  }));

  const attendance = [...params.marks]
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return b.markedAt.localeCompare(a.markedAt);
    })
    .map((mark) => ({
      id: mark.id,
      date: mark.date,
      slotId: mark.slotId,
      slotLabel: formatAttendanceSlotDisplay(params.config, mark.slotId),
      kind: mark.kind,
      markedAt: mark.markedAt,
    }));

  return {
    identity: {
      registrationId: params.registrationId,
      firstName,
      lastName,
      displayName,
      seasonLabel: resolveSeasonLabel(params.data),
      status,
      ffttLicense,
      submitterUid,
      slotIds,
    },
    slots,
    attendance,
    finance: projectRegistrationPaymentToLedger(
      params.registrationId,
      params.data
    ),
    documents: resolvePaymentDocumentsAvailability(params.data),
    viewer: {
      isOwner: Boolean(submitterUid && submitterUid === params.viewerUid),
      canManage: params.canManage,
    },
  };
}
