"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";

interface ViolationDetails {
  currentCount?: number;
  maxCount?: number;
  period?: string;
}

interface Violation {
  rule: string;
  message: string;
  severity: string;
  details?: ViolationDetails;
}

interface BurnoutRulesInfoProps {
  violations?: Violation[];
  warnings?: Array<{ rule: string; message: string; severity: string }>;
  suggestions?: string[];
}

export function BurnoutRulesInfo({
  violations = [],
  warnings = [],
  suggestions = [],
}: BurnoutRulesInfoProps) {
  const rules = [
    {
      id: "player-team-limit",
      title: "Limite de participation par équipe",
      description:
        "Un joueur ne peut pas jouer plus de 2 fois dans une équipe de niveau supérieur",
      type: "TEAM_LIMIT",
      maxCount: 2,
      period: "saison",
    },
    {
      id: "foreign-players-limit",
      title: "Limite de joueurs étrangers",
      description: "Maximum 2 joueurs étrangers par équipe",
      type: "FOREIGN_LIMIT",
      maxCount: 2,
      period: "journée",
    },
    {
      id: "mutation-players-limit",
      title: "Limite de joueurs mutés",
      description: "Maximum 1 joueur muté par équipe",
      type: "MUTATION_LIMIT",
      maxCount: 1,
      period: "journée",
    },
  ];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "ERROR":
        return <ErrorIcon color="error" />;
      case "WARNING":
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "ERROR":
        return "error";
      case "WARNING":
        return "warning";
      default:
        return "info";
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Règles de Brûlage FFTT
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Les règles officielles de brûlage pour les championnats de tennis de
          table
        </Typography>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Règles applicables</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {rules.map((rule) => (
                <ListItem key={rule.id}>
                  <ListItemIcon>
                    <InfoIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary={rule.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {rule.description}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={`Max: ${rule.maxCount}`}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            label={`Période: ${rule.period}`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {violations.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <ErrorIcon color="error" />
                <Typography color="error">
                  Violations des règles ({violations.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {violations.map((violation, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getSeverityIcon(violation.severity)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          color={getSeverityColor(violation.severity)}
                        >
                          {violation.message}
                        </Typography>
                      }
                      secondary={
                        violation.details && (
                          <Box sx={{ mt: 1 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Détails: {violation.details.currentCount}/
                              {violation.details.maxCount}(
                              {violation.details.period})
                            </Typography>
                          </Box>
                        )
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {warnings.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <WarningIcon color="warning" />
                <Typography color="warning.main">
                  Avertissements ({warnings.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {warnings.map((warning, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getSeverityIcon(warning.severity)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography color={getSeverityColor(warning.severity)}>
                          {warning.message}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {suggestions.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Suggestions ({suggestions.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {suggestions.map((suggestion, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <InfoIcon color="info" />
                    </ListItemIcon>
                    <ListItemText primary={suggestion} />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
