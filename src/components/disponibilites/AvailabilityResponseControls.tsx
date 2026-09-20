"use client";

import { Box, Button, Typography } from "@mui/material";
import { Cancel, CheckCircle } from "@mui/icons-material";
import type { AvailabilityResponse } from "@/lib/services/availability-service";

type Props = {
  label?: string;
  availability: AvailabilityResponse | undefined;
  isCommentExpanded: boolean;
  onYes: () => void;
  onNo: () => void;
  onToggleComment: () => void;
};

export function AvailabilityResponseControls({
  label,
  availability,
  isCommentExpanded,
  onYes,
  onNo,
  onToggleComment,
}: Props) {
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      sx={{ flexWrap: "wrap", width: "100%" }}
    >
      {label ? (
        <Typography
          variant="caption"
          sx={{ minWidth: { xs: "100%", sm: 80 }, fontWeight: "medium" }}
        >
          {label}
        </Typography>
      ) : null}
      <Button
        variant={availability?.available === true ? "contained" : "outlined"}
        color="success"
        size="small"
        onClick={onYes}
        sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
      >
        <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />
        Oui
      </Button>
      <Button
        variant={availability?.available === false ? "contained" : "outlined"}
        color="error"
        size="small"
        onClick={onNo}
        sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
      >
        <Cancel fontSize="small" sx={{ mr: 0.5 }} />
        Non
      </Button>
      <Button
        size="small"
        onClick={onToggleComment}
        aria-expanded={isCommentExpanded}
        aria-label={label ? `Commentaire ${label}` : "Commentaire"}
        sx={{
          minWidth: 40,
          position: availability?.comment ? "relative" : undefined,
          ...(availability?.comment
            ? {
                "&::after": {
                  content: "''",
                  position: "absolute",
                  top: 4,
                  right: 6,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: "info.main",
                },
              }
            : {}),
        }}
      >
        💬
      </Button>
    </Box>
  );
}
