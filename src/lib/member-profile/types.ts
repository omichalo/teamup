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

export type MemberProfileCampItem = {
  id: string;
  campId: string;
  siteLabel: string;
  formulaId: string;
  formulaLabel: string;
  status: string;
  totalCents: number;
  invoiceNumber: string | null;
  slotCount: number;
  submittedAt: string;
};

export type MemberProfileResponse = {
  identity: MemberProfileIdentity;
  slots: MemberProfileSlot[];
  attendance: MemberProfileAttendanceItem[];
  camps: MemberProfileCampItem[];
  finance: MemberLedgerView;
  documents: PaymentDocumentsAvailability;
  viewer: {
    isOwner: boolean;
    canManage: boolean;
  };
};
