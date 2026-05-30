"use client";

import { useState } from "react";
import {
  IconButton,
  InputAdornment,
  TextField,
  type TextFieldProps,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
} from "@mui/icons-material";

type Props = Omit<TextFieldProps, "type" | "InputProps"> & {
  /** Affiche une icône cadenas en début de champ (utile pour la confirmation). */
  showLockIcon?: boolean;
  /** Texte du toggle (a11y). Défaut: "Afficher / masquer le mot de passe". */
  toggleAriaLabel?: string;
};

/**
 * Champ mot de passe factorisé (toggle visibility + autoComplete adapté).
 *
 * Le parent reste libre de fournir `value` / `onChange` (contrôlé) ou de laisser
 * le navigateur gérer (non contrôlé via `defaultValue` + FormData).
 */
export function PasswordField({
  label = "Mot de passe",
  required = true,
  fullWidth = true,
  margin = "normal",
  autoComplete = "current-password",
  variant = "outlined",
  showLockIcon = false,
  toggleAriaLabel = "Afficher ou masquer le mot de passe",
  ...rest
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <TextField
      label={label}
      type={showPassword ? "text" : "password"}
      required={required}
      fullWidth={fullWidth}
      margin={margin}
      autoComplete={autoComplete}
      variant={variant}
      InputProps={{
        startAdornment: showLockIcon ? (
          <InputAdornment position="start">
            <LockIcon />
          </InputAdornment>
        ) : undefined,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label={toggleAriaLabel}
              onClick={() => setShowPassword((v) => !v)}
              edge="end"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      {...rest}
    />
  );
}
