import type { CreateUser } from "./types";

export const ROLES = [
  { value: "admin", label: "Administrateur", color: "error" },
  { value: "manager", label: "Gestionnaire", color: "warning" },
  { value: "user", label: "Utilisateur", color: "primary" },
  { value: "viewer", label: "Observateur", color: "default" },
] as const;

export const STATUSES = [
  { value: "active", label: "Actif", color: "success" },
  { value: "inactive", label: "Inactif", color: "default" },
  { value: "suspended", label: "Suspendu", color: "error" },
  { value: "pending", label: "En attente", color: "warning" },
] as const;

export const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
] as const;

export const TIMEZONES = [
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
] as const;

export const DEFAULT_NEW_USER: CreateUser = {
  email: "",
  firstName: "",
  lastName: "",
  role: "user",
  password: "",
  permissions: [],
  profile: {},
  preferences: {
    language: "fr",
    timezone: "Europe/Paris",
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
  },
};
