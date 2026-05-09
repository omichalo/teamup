export interface DataExportImportProps {
  onExport: (options: ExportOptions) => Promise<void>;
  onImport: (file: File, options: ImportOptions) => Promise<void>;
  onBackup: () => Promise<void>;
  onRestore: (file: File) => Promise<void>;
  onDeleteBackup: (backupId: string) => Promise<void>;
  onListBackups: () => Promise<BackupInfo[]>;
  onGetExportHistory: () => Promise<ExportHistoryItem[]>;
  onGetImportHistory: () => Promise<ImportHistoryItem[]>;
  loading?: boolean;
}

export interface ExportOptions {
  format: "csv" | "excel" | "pdf" | "json";
  dataTypes: string[];
  dateRange: {
    start: string;
    end: string;
  };
  includeMetadata: boolean;
  includeHistory: boolean;
  compression: boolean;
  password?: string;
}

export interface ImportOptions {
  format: "csv" | "excel" | "json";
  dataTypes: string[];
  updateExisting: boolean;
  validateData: boolean;
  createBackup: boolean;
  mapping?: Record<string, string>;
}

export interface BackupInfo {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  type: "full" | "incremental";
  status: "completed" | "failed" | "in_progress";
}

export interface ExportHistoryItem {
  id: string;
  format: string;
  dataTypes: string[];
  size: number;
  createdAt: string;
  status: "completed" | "failed" | "in_progress";
  downloadUrl?: string;
}

export interface ImportHistoryItem {
  id: string;
  format: string;
  dataTypes: string[];
  size: number;
  createdAt: string;
  status: "completed" | "failed" | "in_progress";
  recordsProcessed: number;
  recordsFailed: number;
}
