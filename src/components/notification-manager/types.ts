export interface NotificationManagerProps {
  notifications: Notification[];
  onSendNotification: (notification: CreateNotification) => Promise<void>;
  onUpdateNotification: (
    id: string,
    notification: UpdateNotification
  ) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onGetNotificationSettings: () => Promise<NotificationSettings>;
  onUpdateNotificationSettings: (
    settings: NotificationSettings
  ) => Promise<void>;
  loading?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  priority: "low" | "medium" | "high" | "urgent";
  status: "draft" | "scheduled" | "sent" | "failed";
  recipients: {
    type: "all" | "players" | "teams" | "specific";
    ids: string[];
  };
  channels: ("email" | "sms" | "push" | "in_app")[];
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  createdBy: string;
  readBy: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateNotification {
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  priority: "low" | "medium" | "high" | "urgent";
  recipients: {
    type: "all" | "players" | "teams" | "specific";
    ids: string[];
  };
  channels: ("email" | "sms" | "push" | "in_app")[];
  scheduledAt?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateNotification {
  title?: string;
  message?: string;
  type?: "info" | "warning" | "error" | "success";
  priority?: "low" | "medium" | "high" | "urgent";
  recipients?: {
    type: "all" | "players" | "teams" | "specific";
    ids: string[];
  };
  channels?: ("email" | "sms" | "push" | "in_app")[];
  scheduledAt?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    templates: Record<string, string>;
  };
  sms: {
    enabled: boolean;
    provider: string;
    apiKey: string;
    templates: Record<string, string>;
  };
  push: {
    enabled: boolean;
    firebase: {
      serverKey: string;
      projectId: string;
    };
  };
  inApp: {
    enabled: boolean;
    retention: number;
    maxPerUser: number;
  };
  scheduling: {
    enabled: boolean;
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
  };
  limits: {
    maxPerDay: number;
    maxPerUser: number;
    maxMessageLength: number;
  };
}
