import { Suspense } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { AttendanceSlotSelectClient } from "@/components/attendance/AttendanceSlotSelectClient";
import { ATTENDANCE_OPERATOR_ROLES } from "@/lib/attendance/access";

export default function ClubPresencesPage() {
  return (
    <AuthGuard
      allowedRoles={[...ATTENDANCE_OPERATOR_ROLES]}
      redirectWhenUnauthorized="/joueur"
    >
      <Suspense>
        <AttendanceSlotSelectClient />
      </Suspense>
    </AuthGuard>
  );
}
