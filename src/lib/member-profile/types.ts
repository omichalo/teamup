import type { AttendanceMarkKind } from "@/lib/attendance/constants";
import type { MemberLedgerView } from "@/lib/member-ledger/types";
import type { PaymentDocumentsAvailability } from "@/lib/club-registration/payment-documents/types";

export type MemberProfileSlot = {
  slotId: string;
  label: string;
};

export type MemberProfileAttendanceItem = {
  id: string;
  date: string;
  slotId: string;
  slotLabel: string;
  kind: AttendanceMarkKind;
  markedAt: string;
};

export type MemberProfileIdentity = {
  registrationId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  seasonLabel: string;
  status: string | null;
  ffttLicense: string | null;
  submitterUid: string | null;
  slotIds: string[];
};

export type MemberProfileResponse = {
  identity: MemberProfileIdentity;
  slots: MemberProfileSlot[];
  attendance: MemberProfileAttendanceItem[];
  finance: MemberLedgerView;
  documents: PaymentDocumentsAvailability;
  viewer: {
    isOwner: boolean;
    canManage: boolean;
  };
};
