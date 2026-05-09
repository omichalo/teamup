export interface Backup {
  id: string;
  name: string;
  type: "full" | "incremental" | "differential";
  status: "completed" | "failed" | "in_progress" | "scheduled";
  size: number;
  createdAt: string;
  createdBy: string;
  description?: string;
  metadata: {
    version: string;
    environment: string;
    dataTypes: string[];
    compression: boolean;
    encryption: boolean;
  };
  scheduleId?: string;
  parentBackupId?: string;
  checksum: string;
  location: string;
  retention: {
    expiresAt?: string;
    autoDelete: boolean;
  };
}

export interface BackupOptions {
  name: string;
  type: "full" | "incremental" | "differential";
  description?: string;
  dataTypes: string[];
  compression: boolean;
  encryption: boolean;
  password?: string;
  scheduleId?: string;
  parentBackupId?: string;
}

export interface BackupSchedule {
  id: string;
  name: string;
  type: "full" | "incremental" | "differential";
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  days: number[];
  enabled: boolean;
  retention: number;
  dataTypes: string[];
  compression: boolean;
  encryption: boolean;
}

export interface BackupSettings {
  storage: {
    type: "local" | "s3" | "azure" | "gcp";
    path: string;
    credentials: {
      [key: string]: string;
    };
  };
  compression: {
    enabled: boolean;
    algorithm: "gzip" | "bzip2" | "lz4";
    level: number;
  };
  encryption: {
    enabled: boolean;
    algorithm: "aes256" | "aes128";
    keyRotation: number;
  };
  retention: {
    maxBackups: number;
    maxAge: number;
    autoDelete: boolean;
  };
  scheduling: {
    enabled: boolean;
    timezone: string;
    maxConcurrent: number;
  };
  notifications: {
    enabled: boolean;
    onSuccess: boolean;
    onFailure: boolean;
    onCompletion: boolean;
  };
}

export interface BackupRestoreProps {
  backups: Backup[];
  onCreateBackup: (options: BackupOptions) => Promise<void>;
  onRestoreBackup: (backupId: string) => Promise<void>;
  onDeleteBackup: (backupId: string) => Promise<void>;
  onDownloadBackup: (backupId: string) => Promise<void>;
  onUploadBackup: (file: File) => Promise<void>;
  onScheduleBackup: (schedule: BackupSchedule) => Promise<void>;
  onGetBackupSettings: () => Promise<BackupSettings>;
  onUpdateBackupSettings: (settings: BackupSettings) => Promise<void>;
  loading?: boolean;
}
