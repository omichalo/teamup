"use client";

import { Alert, Snackbar } from "@mui/material";

type Props = {
  message: string | null;
  onClose: () => void;
};

export function CompositionSelectionFeedback({ message, onClose }: Props) {
  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={5000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity="warning" variant="filled" onClose={onClose}>
        {message}
      </Alert>
    </Snackbar>
  );
}
