"use client";

import {
  Box,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import {
  INVOICE_HEADER_TEMPLATE_VARIABLES,
  invoiceVariableToken,
} from "@/lib/club-registration-config/invoice-template-variables";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  preview?: string;
  previewLength?: number;
};

export function TemplateVariableField({
  label,
  value,
  onChange,
  preview,
  previewLength,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [pickerValue, setPickerValue] = useState("");

  const insertVariable = (key: string) => {
    const token = invoiceVariableToken(key);
    const element = inputRef.current;
    if (!element) {
      onChange(`${value}${token}`);
      return;
    }
    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      element.focus();
      const cursor = start + token.length;
      element.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <Stack spacing={1.5}>
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        multiline
        minRows={2}
        inputRef={inputRef}
        helperText="Syntaxe : {{nomVariable}} — utilisez le menu ou les boutons ci-dessous pour insérer une variable."
      />
      <TextField
        select
        label="Insérer une variable"
        size="small"
        value={pickerValue}
        onChange={(e) => {
          const key = e.target.value;
          if (key) {
            insertVariable(key);
            setPickerValue("");
          }
        }}
      >
        <MenuItem value="">Choisir une variable…</MenuItem>
        {INVOICE_HEADER_TEMPLATE_VARIABLES.map((variable) => (
          <MenuItem key={variable.key} value={variable.key}>
            {variable.label} ({invoiceVariableToken(variable.key)})
          </MenuItem>
        ))}
      </TextField>
      <Box>
        {INVOICE_HEADER_TEMPLATE_VARIABLES.map((variable) => (
          <Typography key={variable.key} variant="caption" color="text.secondary" display="block">
            {invoiceVariableToken(variable.key)} — {variable.description} (ex. {variable.example})
          </Typography>
        ))}
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {INVOICE_HEADER_TEMPLATE_VARIABLES.map((variable) => (
          <Chip
            key={variable.key}
            label={variable.label}
            size="small"
            variant="outlined"
            onClick={() => insertVariable(variable.key)}
          />
        ))}
      </Stack>
      {preview !== undefined && (
        <Typography variant="body2" color="text.secondary">
          Aperçu : {preview}
          {previewLength !== undefined ? ` (${previewLength} car.)` : null}
        </Typography>
      )}
    </Stack>
  );
}
