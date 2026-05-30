/** Couleurs MUI autorisées pour les listes de l’éditeur de config. */
export const CONFIG_EDITOR_ACCENTS = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
] as const;

export type ConfigEditorAccent = (typeof CONFIG_EDITOR_ACCENTS)[number];

/** Libellés français pour les sélecteurs admin. */
export const CONFIG_EDITOR_ACCENT_LABELS: Record<ConfigEditorAccent, string> = {
  primary: "Principal (bleu)",
  secondary: "Secondaire (violet)",
  info: "Info (cyan)",
  success: "Succès (vert)",
  warning: "Attention (orange)",
};
