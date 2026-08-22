import { AuthGuard } from "@/components/AuthGuard";
import { SlotOccupancyClient } from "@/components/club-slot-occupancy/SlotOccupancyClient";
import { ATTENDANCE_OPERATOR_ROLES } from "@/lib/attendance/access";

export default function ClubCreneauxPage() {
  return (
    <AuthGuard
      allowedRoles={[...ATTENDANCE_OPERATOR_ROLES]}
      redirectWhenUnauthorized="/joueur"
    >
      <SlotOccupancyClient />
    </AuthGuard>
  );
}
