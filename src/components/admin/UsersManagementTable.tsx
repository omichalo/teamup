"use client";

import React from "react";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { COACH_REQUEST_STATUS, USER_ROLES } from "@/lib/auth/roles";
import { User, UserRole } from "@/types";

type CoachRequestChipColor = "default" | "success" | "warning" | "error";

interface UsersManagementTableProps {
  users: User[];
  currentUserId?: string | undefined;
  adminCount: number;
  roleUpdateTarget: string | null;
  onRoleChange: (user: User, newRole: UserRole) => void;
  getRoleLabel: (role: UserRole) => string;
  getCoachStatusLabel: (status: User["coachRequestStatus"]) => string;
  getCoachStatusColor: (status: User["coachRequestStatus"]) => CoachRequestChipColor;
}

export function UsersManagementTable({
  users,
  currentUserId,
  adminCount,
  roleUpdateTarget,
  onRoleChange,
  getRoleLabel,
  getCoachStatusLabel,
  getCoachStatusColor,
}: UsersManagementTableProps) {
  return (
    <Table>
      <TableHead>
        <TableRow sx={{ backgroundColor: "action.hover" }}>
          <TableCell sx={{ fontWeight: 700, minWidth: 280 }}>Utilisateur</TableCell>
          <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Rôle</TableCell>
          <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Email vérifié</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Demande coach</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((targetUser) => {
          const hasDisplayName =
            targetUser.displayName && targetUser.displayName.trim().length > 0;
          const isCurrentUser = targetUser.id === currentUserId;
          const isLastAdmin =
            targetUser.role === USER_ROLES.ADMIN && adminCount <= 1;
          const isRoleUpdateLoading =
            roleUpdateTarget !== null &&
            roleUpdateTarget.startsWith(`${targetUser.id}-`);

          return (
            <TableRow
              key={targetUser.id}
              sx={{
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              <TableCell>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    {...(targetUser.photoURL && { src: targetUser.photoURL })}
                    alt={targetUser.displayName}
                    sx={{ width: 48, height: 48 }}
                  >
                    {targetUser.displayName?.charAt(0) || targetUser.email.charAt(0)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      sx={{
                        lineHeight: 1.2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {hasDisplayName ? targetUser.displayName : targetUser.email}
                    </Typography>
                    {hasDisplayName ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {targetUser.email}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
              </TableCell>

              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Select
                    value={targetUser.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      if (newRole !== targetUser.role) {
                        onRoleChange(targetUser, newRole);
                      }
                    }}
                    disabled={isRoleUpdateLoading || isLastAdmin || isCurrentUser}
                    size="small"
                    sx={{
                      minWidth: 150,
                      textTransform: "none",
                      "& .MuiSelect-select": {
                        fontWeight: 600,
                      },
                    }}
                  >
                    <MenuItem value={USER_ROLES.PLAYER}>
                      {getRoleLabel(USER_ROLES.PLAYER)}
                    </MenuItem>
                    <MenuItem value={USER_ROLES.COACH}>
                      {getRoleLabel(USER_ROLES.COACH)}
                    </MenuItem>
                    <MenuItem
                      value={USER_ROLES.ADMIN}
                      disabled={
                        targetUser.role === USER_ROLES.ADMIN && adminCount <= 1
                      }
                    >
                      {getRoleLabel(USER_ROLES.ADMIN)}
                    </MenuItem>
                  </Select>
                  {isRoleUpdateLoading ? <CircularProgress size={20} /> : null}
                </Box>
              </TableCell>

              <TableCell>
                <Chip
                  label={targetUser.emailVerified ? "Vérifié" : "Non vérifié"}
                  color={targetUser.emailVerified ? "success" : "warning"}
                  variant="outlined"
                  size="small"
                  sx={{
                    fontWeight: 500,
                    textTransform: "none",
                  }}
                />
              </TableCell>

              <TableCell>
                {targetUser.coachRequestStatus !== COACH_REQUEST_STATUS.NONE ? (
                  <Chip
                    label={getCoachStatusLabel(targetUser.coachRequestStatus)}
                    color={getCoachStatusColor(targetUser.coachRequestStatus)}
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: 500,
                      textTransform: "none",
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    —
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
