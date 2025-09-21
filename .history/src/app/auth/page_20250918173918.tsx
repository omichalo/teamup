"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Tabs,
  Tab,
  Container,
} from "@mui/material";
import { SportsTennis as PingPongIcon } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [signInLoading, setSignInLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    try {
      setSignInLoading(true);
      setError(null);
      console.log("Tentative de connexion avec:", formData.email);
      await signIn(formData.email, formData.password);
      console.log("Connexion réussie");
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      console.error("Code d'erreur:", error.code);
      if (error.code === "auth/user-not-found") {
        setError("Aucun compte trouvé avec cet email");
      } else if (error.code === "auth/wrong-password") {
        setError("Mot de passe incorrect");
      } else if (error.code === "auth/invalid-credential") {
        setError("Email ou mot de passe incorrect");
      } else if (error.code === "auth/invalid-email") {
        setError("Email invalide");
      } else {
        setError("Erreur de connexion. Veuillez réessayer.");
      }
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.displayName) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    try {
      setSignInLoading(true);
      setError(null);
      await signUp(formData.email, formData.password, formData.displayName);
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      if (error.code === "auth/email-already-in-use") {
        setError("Un compte existe déjà avec cet email");
      } else if (error.code === "auth/invalid-email") {
        setError("Email invalide");
      } else if (error.code === "auth/weak-password") {
        setError("Le mot de passe est trop faible");
      } else {
        setError("Erreur d'inscription. Veuillez réessayer.");
      }
    } finally {
      setSignInLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
    setFormData({ email: "", password: "", displayName: "" });
  };

  return (
    <AuthGuard requireAuth={false}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1e3a8a 0%, #ea580c 100%)",
        }}
      >
        <Container maxWidth="sm">
          <Card sx={{ maxWidth: 500, width: "100%", mx: "auto" }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <PingPongIcon
                  sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
                />
                <Typography variant="h4" component="h1" gutterBottom>
                  SQY Ping
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Team Up
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Connectez-vous ou créez un compte
                </Typography>
              </Box>

              <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange} centered>
                  <Tab label="Connexion" />
                  <Tab label="Inscription" />
                </Tabs>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TabPanel value={tabValue} index={0}>
                <Box component="form" onSubmit={handleSignIn}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                    disabled={signInLoading}
                  />
                  <TextField
                    fullWidth
                    label="Mot de passe"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                    disabled={signInLoading}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={signInLoading}
                    sx={{ mt: 3, mb: 2 }}
                  >
                    {signInLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Box component="form" onSubmit={handleSignUp}>
                  <TextField
                    fullWidth
                    label="Nom complet"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                    disabled={signInLoading}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                    disabled={signInLoading}
                  />
                  <TextField
                    fullWidth
                    label="Mot de passe"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                    disabled={signInLoading}
                    helperText="Minimum 6 caractères"
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={signInLoading}
                    sx={{ mt: 3, mb: 2 }}
                  >
                    {signInLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Créer un compte"
                    )}
                  </Button>
                </Box>
              </TabPanel>

              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ mt: 2 }}
              >
                En vous connectant, vous acceptez les conditions
                d&apos;utilisation
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </AuthGuard>
  );
}
