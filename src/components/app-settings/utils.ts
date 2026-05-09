type MuiColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

export function getEnvironmentColor(environment: string): MuiColor {
  switch (environment) {
    case "development":
      return "info";
    case "staging":
      return "warning";
    case "production":
      return "success";
    default:
      return "default";
  }
}

export function getEnvironmentLabel(environment: string): string {
  switch (environment) {
    case "development":
      return "Développement";
    case "staging":
      return "Staging";
    case "production":
      return "Production";
    default:
      return environment;
  }
}

export function getFeatureStatus(enabled: boolean): string {
  return enabled ? "Activé" : "Désactivé";
}

export function getFeatureColor(enabled: boolean): MuiColor {
  return enabled ? "success" : "default";
}
