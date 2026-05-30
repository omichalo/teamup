"use client";

import { Button, Tooltip } from "@mui/material";
import { Delete } from "@mui/icons-material";

type Props = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string | undefined;
};

export function ConfigEditorRemoveAction({
  label,
  onClick,
  disabled = false,
  disabledReason,
}: Props) {
  const button = (
    <Button
      size="small"
      color="error"
      variant="text"
      startIcon={<Delete fontSize="small" />}
      onClick={onClick}
      disabled={disabled}
      sx={{ alignSelf: "flex-end" }}
    >
      {label}
    </Button>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip title={disabledReason}>
        <span>{button}</span>
      </Tooltip>
    );
  }

  return button;
}
