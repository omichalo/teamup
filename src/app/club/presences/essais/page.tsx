import { AuthGuard } from "@/components/AuthGuard";
import { AttendanceLeadsClient } from "@/components/attendance/AttendanceLeadsClient";
import { ATTENDANCE_LEAD_MANAGER_ROLES } from "@/lib/attendance/access";

import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Essais présence");

export default function ClubPresencesEssaisPage() {
  return (
    <AuthGuard
      allowedRoles={[...ATTENDANCE_LEAD_MANAGER_ROLES]}
      redirectWhenUnauthorized="/joueur"
    >
      <AttendanceLeadsClient />
    </AuthGuard>
  );
}
