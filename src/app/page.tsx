"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { RoleHomeDashboard } from "@/components/home/RoleHomeDashboard";
import { USER_ROLES } from "@/lib/auth/roles";

export default function DashboardPage() {
  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH, USER_ROLES.SECRETARY]}
    >
      <RoleHomeDashboard />
    </AuthGuard>
  );
}
