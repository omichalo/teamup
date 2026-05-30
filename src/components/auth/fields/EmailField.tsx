"use client";

import {
  InputAdornment,
  TextField,
  type TextFieldProps,
} from "@mui/material";
import { Email as EmailIcon } from "@mui/icons-material";

type Props = Omit<TextFieldProps, "type" | "InputProps"> & {
  /** Texte d'aide affiché sous le champ. */
  helperText?: string;
};

/**
 * Champ email factorisé (icône email + autoComplete + type="email").
 *
 * Délibérément non contrôlé : laisse le composant parent décider de la stratégie
 * (FormData / state contrôlé). Le parent fournit `name`, `value`, `onChange`, etc.
 */
export function EmailField({
  label = "Email",
  required = true,
  fullWidth = true,
  margin = "normal",
  autoComplete = "email",
  variant = "outlined",
  helperText,
  ...rest
}: Props) {
  return (
    <TextField
      label={label}
      type="email"
      required={required}
      fullWidth={fullWidth}
      margin={margin}
      autoComplete={autoComplete}
      variant={variant}
      helperText={helperText}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <EmailIcon />
          </InputAdornment>
        ),
      }}
      {...rest}
    />
  );
}
