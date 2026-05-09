import type { CreateNotification } from "./types";

export const DEFAULT_NOTIFICATION: CreateNotification = {
  title: "",
  message: "",
  type: "info",
  priority: "medium",
  recipients: {
    type: "all",
    ids: [],
  },
  channels: ["in_app"],
  metadata: {},
};

export const NOTIFICATION_CHANNELS = ["email", "sms", "push", "in_app"] as const;
