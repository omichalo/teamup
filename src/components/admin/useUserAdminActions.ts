"use client";

import { useCallback, useState } from "react";
import type { User, UserRole } from "@/types";
import { USER_ROLES } from "@/lib/auth/roles";

type UseUserAdminActionsOptions = {
  currentUserId?: string | undefined;
  adminCount: number;
  fetchUsers: () => Promise<void>;
  setUsersError: (message: string | null) => void;
  setUserActionSuccess: (message: string | null) => void;
};

export function useUserAdminActions({
  currentUserId,
  adminCount,
  fetchUsers,
  setUsersError,
  setUserActionSuccess,
}: UseUserAdminActionsOptions) {
  const [roleUpdateTarget, setRoleUpdateTarget] = useState<string | null>(null);
  const [maintainerUpdateTarget, setMaintainerUpdateTarget] = useState<string | null>(
    null
  );

  const handleRoleChange = useCallback(
    async (targetUser: User, newRole: UserRole) => {
      if (!currentUserId) {
        return;
      }

      if (
        targetUser.role === USER_ROLES.ADMIN &&
        newRole !== USER_ROLES.ADMIN &&
        adminCount <= 1
      ) {
        setUsersError("Impossible de retirer les droits du dernier administrateur.");
        setUserActionSuccess(null);
        return;
      }

      const targetKey = `${targetUser.id}-${newRole}`;
      setRoleUpdateTarget(targetKey);
      setUsersError(null);
      setUserActionSuccess(null);

      try {
        const response = await fetch("/api/admin/users/set-role", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: targetUser.id,
            role: newRole,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "Échec de la mise à jour du rôle");
        }

        setUserActionSuccess("Rôle mis à jour avec succès.");
        await fetchUsers();
      } catch (error) {
        console.error("Erreur lors de la mise à jour du rôle:", error);
        setUsersError(
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour le rôle"
        );
      } finally {
        setRoleUpdateTarget(null);
      }
    },
    [adminCount, currentUserId, fetchUsers, setUserActionSuccess, setUsersError]
  );

  const handleAppMaintainerChange = useCallback(
    async (targetUser: User, appMaintainer: boolean) => {
      if (!currentUserId) {
        return;
      }

      setMaintainerUpdateTarget(targetUser.id);
      setUsersError(null);
      setUserActionSuccess(null);

      try {
        const response = await fetch("/api/admin/users/set-app-maintainer", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: targetUser.id,
            appMaintainer,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error || "Échec de la mise à jour du mainteneur"
          );
        }

        setUserActionSuccess(
          appMaintainer ? "Mainteneur app activé." : "Mainteneur app désactivé."
        );
        await fetchUsers();
      } catch (error) {
        console.error("Erreur lors de la mise à jour du mainteneur:", error);
        setUsersError(
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour le mainteneur"
        );
      } finally {
        setMaintainerUpdateTarget(null);
      }
    },
    [currentUserId, fetchUsers, setUserActionSuccess, setUsersError]
  );

  return {
    roleUpdateTarget,
    maintainerUpdateTarget,
    handleRoleChange,
    handleAppMaintainerChange,
  };
}
