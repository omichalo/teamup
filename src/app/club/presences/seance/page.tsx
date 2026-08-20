import { Suspense } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { AttendanceSessionClient } from "@/components/attendance/AttendanceSessionClient";
import { ATTENDANCE_OPERATOR_ROLES } from "@/lib/attendance/access";

export default function ClubPresencesSeancePage() {
  return (
    <AuthGuard
      allowedRoles={[...ATTENDANCE_OPERATOR_ROLES]}
      redirectWhenUnauthorized="/joueur"
    >
      <Suspense>
        <AttendanceSessionClient />
      </Suspense>
    </AuthGuard>
  );
}
