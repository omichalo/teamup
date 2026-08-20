"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { RoleHomeDashboard } from "@/components/home/RoleHomeDashboard";
import { ALL_USER_ROLES } from "@/lib/auth/roles";

export default function PlayerHomePage() {
  return (
    <AuthGuard allowedRoles={[...ALL_USER_ROLES]}>
      <RoleHomeDashboard />
    </AuthGuard>
  );
}
