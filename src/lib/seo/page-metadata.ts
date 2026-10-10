import type { Metadata } from "next";

/**
 * Titre de page court. Le layout racine applique le template `%s — Team Up`.
 */
export function pageMetadata(title: string): Metadata {
  return { title };
}
