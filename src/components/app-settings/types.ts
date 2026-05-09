export interface AppSettingsData {
  general: {
    appName: string;
    appVersion: string;
    environment: "development" | "staging" | "production";
    timezone: string;
    language: string;
    currency: string;
    dateFormat: string;
    timeFormat: "12h" | "24h";
  };
  features: {
    enableNotifications: boolean;
    enableAuditLog: boolean;
    enableBackup: boolean;
    enableMaintenance: boolean;
    enableReports: boolean;
    enableUserManagement: boolean;
    enableThemeCustomization: boolean;
  };
  limits: {
    maxUsers: number;
    maxTeams: number;
    maxPlayers: number;
    maxMatches: number;
    maxFileSize: number;
    maxBackups: number;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireTwoFactor: boolean;
    allowedOrigins: string[];
    enableCORS: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    cacheTtl: number;
    maxConcurrentRequests: number;
    requestTimeout: number;
    enableCompression: boolean;
    enableGzip: boolean;
  };
}

export interface AppSettingsProps {
  settings: AppSettingsData;
  onSaveSettings: (settings: AppSettingsData) => Promise<void>;
  onResetSettings: () => Promise<void>;
  onTestConnection: (type: string) => Promise<void>;
}
