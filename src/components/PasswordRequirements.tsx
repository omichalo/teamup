"use client";

import { Box, Typography, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { CheckCircle, Cancel } from "@mui/icons-material";
import {
  containsFirebaseSpecialCharacter,
  FIREBASE_SPECIAL_CHARACTER_HINT,
  FIREBASE_SPECIAL_CHARACTER_REQUIREMENT_LABEL,
} from "@/lib/auth/password-policy";

interface PasswordRequirementsProps {
  password: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
  hint?: string;
}

const requirements: Requirement[] = [
  {
    label: "Au moins 12 caractères",
    test: (pwd) => pwd.length >= 12,
  },
  {
    label: "Au moins une majuscule",
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    label: "Au moins une minuscule",
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    label: "Au moins un chiffre",
    test: (pwd) => /[0-9]/.test(pwd),
  },
  {
    label: FIREBASE_SPECIAL_CHARACTER_REQUIREMENT_LABEL,
    test: containsFirebaseSpecialCharacter,
    hint: FIREBASE_SPECIAL_CHARACTER_HINT,
  },
];

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  return (
    <Box sx={{ mt: 1, mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
        Exigences du mot de passe :
      </Typography>
      <List dense sx={{ py: 0 }}>
        {requirements.map((req, index) => {
          const isValid = req.test(password);
          return (
            <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {isValid ? (
                  <CheckCircle fontSize="small" color="success" />
                ) : (
                  <Cancel fontSize="small" color="error" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={req.label}
                secondary={req.hint}
                primaryTypographyProps={{
                  variant: "caption",
                  color: isValid ? "text.secondary" : "text.disabled",
                  sx: {
                    textDecoration: isValid ? "none" : "none",
                  },
                }}
                secondaryTypographyProps={{
                  variant: "caption",
                  color: "text.disabled",
                  component: "span",
                  sx: { display: "block", mt: 0.25 },
                }}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

