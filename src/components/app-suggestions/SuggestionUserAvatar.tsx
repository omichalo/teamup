"use client";

import { Avatar } from "@mui/material";
import { alpha } from "@mui/material/styles";

function resolveInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

type SuggestionUserAvatarProps = {
  displayName: string;
  size?: number;
};

export function SuggestionUserAvatar({
  displayName,
  size = 32,
}: SuggestionUserAvatarProps) {
  const label = displayName.trim() || "Utilisateur";

  return (
    <Avatar
      aria-hidden
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        fontWeight: 700,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
        color: "primary.main",
      }}
    >
      {resolveInitials(label)}
    </Avatar>
  );
}
