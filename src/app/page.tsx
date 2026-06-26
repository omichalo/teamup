"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { CoachAdminHomeDashboard } from "@/components/home/CoachAdminHomeDashboard";
import { USER_ROLES } from "@/lib/auth/roles";

export default function DashboardPage() {
  return (
    <AuthGuard allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH]}>
      <CoachAdminHomeDashboard />
    </AuthGuard>
  );
}
