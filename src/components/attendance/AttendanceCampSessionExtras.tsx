"use client";

import { useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { AttendanceMemberSearchHit } from "@/lib/attendance/types";
import { AttendanceSearchDialog } from "./AttendanceSearchDialog";
import {
  AttendanceSessionDock,
  AttendanceSessionDockSpacer,
} from "./AttendanceSessionDock";
import {
  CampExternalMarkDialog,
  type CampExternalMarkPayload,
} from "./CampExternalMarkDialog";

type Props = {
  date: string;
  slotId: string;
  cancelled: boolean;
  onReload: () => Promise<void>;
  onError: (message: string) => void;
};

export function AttendanceCampSessionExtras({
  date,
  slotId,
  cancelled,
  onReload,
  onError,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [externalOpen, setExternalOpen] = useState(false);

  async function handleWalkIn(member: AttendanceMemberSearchHit) {
    onError("");
    const res = await fetch("/api/club/attendance/marks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "camp",
        date,
        slotId,
        kind: "member_walkin",
        clubRegistrationId: member.registrationId,
        registrationId: member.registrationId,
      }),
    });
    const json = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) {
      throw new Error(json.error ?? "Impossible de pointer");
    }
    await onReload();
  }

  async function handleExternal(payload: CampExternalMarkPayload) {
    onError("");
    const res = await fetch("/api/club/attendance/marks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "camp",
        date,
        slotId,
        kind: "external",
        external: payload,
      }),
    });
    const json = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) {
      throw new Error(json.error ?? "Impossible d'ajouter l'extérieur");
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
        searchLabel="Adhérent hors inscription"
        onSearch={() => setSearchOpen(true)}
        onExternal={() => setExternalOpen(true)}
      />
      <AttendanceSearchDialog
        open={searchOpen}
        slotId={slotId}
        mode="camp"
        onClose={() => setSearchOpen(false)}
        onPick={async (member) => {
          try {
            await handleWalkIn(member);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Impossible de pointer";
            onError(message);
            throw err;
          }
        }}
      />
      <CampExternalMarkDialog
        open={externalOpen}
        onClose={() => setExternalOpen(false)}
        onSubmit={handleExternal}
      />
    </>
  );
}
