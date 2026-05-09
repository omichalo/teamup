export const FEATURE_CONFIG = [
  { key: "enableNotifications", label: "Notifications" },
  { key: "enableAuditLog", label: "Log d'audit" },
  { key: "enableBackup", label: "Sauvegarde" },
  { key: "enableMaintenance", label: "Maintenance" },
  { key: "enableReports", label: "Rapports" },
  { key: "enableUserManagement", label: "Gestion des utilisateurs" },
  { key: "enableThemeCustomization", label: "Personnalisation du thème" },
] as const;

export const CONNECTION_TESTS = [
  { key: "database", label: "Tester la base de données" },
  { key: "api", label: "Tester l&apos;API" },
  { key: "cache", label: "Tester le cache" },
] as const;
