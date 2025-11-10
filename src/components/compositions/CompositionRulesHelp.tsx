"use client";

import React, { useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  Collapse,
  Tooltip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

export interface CompositionRuleItem {
  id: string;
  label: string;
  scope: "both" | "defaults" | "daily";
  description?: string;
}

interface CompositionRulesHelpProps {
  title?: string;
  rules: CompositionRuleItem[];
  dense?: boolean;
}

const scopeIconMap: Record<CompositionRuleItem["scope"], React.ReactNode> = {
  both: <CheckCircleIcon fontSize="small" color="primary" />,
  defaults: <InfoIcon fontSize="small" color="secondary" />,
  daily: <InfoIcon fontSize="small" color="action" />,
};

const scopeTooltipMap: Record<CompositionRuleItem["scope"], string> = {
  both: "Règle appliquée sur les deux pages de compositions",
  defaults: "Règle spécifique aux compositions par défaut",
  daily: "Règle spécifique aux compositions de journée",
};

type Scope = CompositionRuleItem["scope"];

export const CompositionRulesHelp: React.FC<CompositionRulesHelpProps> = ({
  title = "Règles de validation",
  rules,
  dense = false,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ mb: 2 }}>
      <Button
        size="small"
        startIcon={<HelpOutlineIcon />}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "Masquer les règles" : "Afficher les règles de validation"}
      </Button>
      <Collapse in={open} unmountOnExit>
        <Alert
          severity="info"
          variant="outlined"
          sx={{
            mt: 1,
            alignItems: "flex-start",
          }}
        >
          <AlertTitle>{title}</AlertTitle>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Rappel des règles appliquées lors du drag & drop.
            </Typography>
            <List dense={dense} disablePadding>
              {rules.map((rule) => (
                <ListItem key={rule.id} sx={{ alignItems: "flex-start" }}>
                  <ListItemIcon sx={{ minWidth: 32, mt: dense ? 0.5 : 0 }}>
                    <Tooltip title={scopeTooltipMap[rule.scope]} placement="top">
                      <Box component="span">{scopeIconMap[rule.scope]}</Box>
                    </Tooltip>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" component="span">
                        {rule.label}
                      </Typography>
                    }
                    secondary={
                      rule.description ? (
                        <Typography variant="caption" color="text.secondary">
                          {rule.description}
                        </Typography>
                      ) : undefined
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Alert>
      </Collapse>
    </Box>
  );
};
