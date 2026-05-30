"use client";

import { Box } from "@mui/material";
import { DragIndicator } from "@mui/icons-material";
import type { ConfigEditorDragHandleProps } from "./ConfigEditorLayout";
import { configEditorDragHandleSx } from "./config-editor-layout";

type Props = {
  dragHandleProps: ConfigEditorDragHandleProps | null | undefined;
  label: string;
};

export function ConfigEditorDragHandle({ dragHandleProps, label }: Props) {
  if (!dragHandleProps) return null;

  return (
    <Box
      {...dragHandleProps}
      aria-label={`Réordonner ${label}`}
      sx={configEditorDragHandleSx}
    >
      <DragIndicator fontSize="small" />
    </Box>
  );
}
