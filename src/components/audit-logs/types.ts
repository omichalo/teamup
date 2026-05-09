export interface AuditLogsProps {
  logs: AuditLog[];
  onSearch: (filters: AuditLogFilters) => Promise<void>;
  onExport: (
    filters: AuditLogFilters,
    format: "csv" | "pdf" | "excel"
  ) => Promise<void>;
  onClearLogs: (olderThan: string) => Promise<void>;
  onGetLogDetails: (id: string) => Promise<AuditLogDetails>;
  loading?: boolean;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  resourceName: string;
  level: "info" | "warning" | "error" | "success";
  category:
    | "user"
    | "team"
    | "match"
    | "player"
    | "system"
    | "security"
    | "data";
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  metadata?: Record<string, unknown>;
}

export interface AuditLogDetails extends AuditLog {
  relatedLogs: AuditLog[];
  impact: {
    affectedUsers: number;
    affectedResources: number;
    severity: "low" | "medium" | "high" | "critical";
  };
  recommendations: string[];
}

export interface AuditLogFilters {
  search?: string;
  level?: string[];
  category?: string[];
  userId?: string;
  resource?: string;
  dateFrom?: string;
  dateTo?: string;
  action?: string[];
  ipAddress?: string;
  sessionId?: string;
}
