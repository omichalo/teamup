"use client";

import { useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type {
  AttendanceLeadSearchHit,
  AttendanceMemberSearchHit,
} from "@/lib/attendance/types";
import { AttendanceGuestDialog } from "./AttendanceGuestDialog";
import { AttendanceSearchDialog } from "./AttendanceSearchDialog";
import {
  AttendanceSessionDock,
  AttendanceSessionDockSpacer,
} from "./AttendanceSessionDock";

type Props = {
  date: string;
  slotId: string;
  cancelled: boolean;
  onReload: () => Promise<void>;
  onError: (message: string) => void;
};

export function AttendanceTrainingSessionExtras({
  date,
  slotId,
  cancelled,
  onReload,
  onError,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);

  async function handleWalkIn(member: AttendanceMemberSearchHit, addSlot: boolean) {
    onError("");
    const markRes = await fetch("/api/club/attendance/marks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        slotId,
        kind: "walkin",
        registrationId: member.registrationId,
      }),
    });
    const markJson = await readJsonResponse<{ error?: string }>(markRes);
    if (!markRes.ok) {
      throw new Error(markJson.error ?? "Impossible de pointer");
    }
    if (addSlot) {
      const slotRes = await fetch("/api/club/attendance/add-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          slotId,
          registrationId: member.registrationId,
        }),
      });
      const slotJson = await readJsonResponse<{ error?: string }>(slotRes);
      if (!slotRes.ok) {
        throw new Error(slotJson.error ?? "Impossible d'ajouter le créneau");
      }
    }
    await onReload();
  }

  async function handleGuestCreate(payload: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  }) {
    onError("");
    const res = await fetch("/api/club/attendance/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, slotId, ...payload }),
    });
    const json = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) {
      throw new Error(json.error ?? "Impossible d'enregistrer l'essai");
    }
    await onReload();
  }

  async function handleGuestReuse(lead: AttendanceLeadSearchHit) {
    onError("");
    const res = await fetch("/api/club/attendance/marks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        slotId,
        kind: "guest",
        leadId: lead.leadId,
      }),
    });
    const json = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) {
      throw new Error(json.error ?? "Impossible de pointer l'essai");
    }
    await onReload();
  }

  if (cancelled) {
    return null;
  }

  return (
    <>
      <AttendanceSessionDockSpacer />
      <AttendanceSessionDock
        onSearch={() => setSearchOpen(true)}
        onGuest={() => setGuestOpen(true)}
      />
      <AttendanceSearchDialog
        open={searchOpen}
        slotId={slotId}
        onClose={() => setSearchOpen(false)}
        onPick={async (member, addSlot) => {
          try {
            await handleWalkIn(member, addSlot);
          } catch (err) {
            onError(err instanceof Error ? err.message : "Impossible de pointer");
            throw err;
          }
        }}
      />
      <AttendanceGuestDialog
        open={guestOpen}
        date={date}
        slotId={slotId}
        onClose={() => setGuestOpen(false)}
        onCreate={handleGuestCreate}
        onReuse={handleGuestReuse}
      />
    </>
  );
}
