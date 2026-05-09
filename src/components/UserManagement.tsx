"use client";

import { useState } from "react";
import { Add as AddIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { Alert, Box, Button, Typography } from "@mui/material";
import { DEFAULT_NEW_USER } from "@/components/user-management/constants";
import { PermissionsDialog } from "@/components/user-management/PermissionsDialog";
import type { Permission, User, UserManagementProps } from "@/components/user-management/types";
import { UserFormDialog } from "@/components/user-management/UserFormDialog";
import { UsersTableCard } from "@/components/user-management/UsersTableCard";

export function UserManagement({
  users,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onResetPassword,
  onGetUserPermissions,
  onUpdateUserPermissions,
  loading = false,
}: UserManagementProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState(DEFAULT_NEW_USER);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleCreateUser = async () => {
    try {
      setProcessing(true);
      setError(null);
      await onCreateUser(newUser);
      setCreateDialogOpen(false);
      setNewUser(DEFAULT_NEW_USER);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setProcessing(true);
      setError(null);
      await onUpdateUser(selectedUser.id, newUser);
      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (
      window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")
    ) {
      try {
        await onDeleteUser(id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
      }
    }
  };

  const handleResetPassword = async (id: string) => {
    if (
      window.confirm(
        "Êtes-vous sûr de vouloir réinitialiser le mot de passe de cet utilisateur ?"
      )
    ) {
      try {
        await onResetPassword(id);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de la réinitialisation"
        );
      }
    }
  };

  const handleViewPermissions = async (user: User) => {
    try {
      setProcessing(true);
      setError(null);
      const permissions = await onGetUserPermissions(user.id);
      setSelectedUser(user);
      setUserPermissions(permissions);
      setSelectedPermissions(user.permissions);
      setPermissionsDialogOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des permissions"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    try {
      setProcessing(true);
      setError(null);
      await onUpdateUserPermissions(selectedUser.id, selectedPermissions);
      setPermissionsDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la mise à jour des permissions"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setSelectedUser(null);
    setNewUser(DEFAULT_NEW_USER);
    setCreateDialogOpen(true);
  };

  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setNewUser({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      password: "",
      permissions: user.permissions,
      profile: user.profile,
      preferences: user.preferences,
    });
    setEditDialogOpen(true);
  };

  const handleCloseUserFormDialog = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedUser(null);
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Gestion des utilisateurs</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Actualiser
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Nouvel utilisateur
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <UsersTableCard
        users={users}
        loading={loading}
        onEditUser={handleOpenEditDialog}
        onViewPermissions={handleViewPermissions}
        onResetPassword={handleResetPassword}
        onDeleteUser={handleDeleteUser}
      />

      <UserFormDialog
        createDialogOpen={createDialogOpen}
        editDialogOpen={editDialogOpen}
        processing={processing}
        selectedUser={selectedUser}
        newUser={newUser}
        onClose={handleCloseUserFormDialog}
        onNewUserChange={setNewUser}
        onSubmit={createDialogOpen ? handleCreateUser : handleUpdateUser}
      />

      <PermissionsDialog
        open={permissionsDialogOpen}
        processing={processing}
        selectedUser={selectedUser}
        permissions={userPermissions}
        selectedPermissions={selectedPermissions}
        onClose={() => setPermissionsDialogOpen(false)}
        onSelectionChange={setSelectedPermissions}
        onSubmit={handleUpdatePermissions}
      />
    </Box>
  );
}
