export function buildSuggestionDetailUrl(appOrigin: string, suggestionId: string): string {
  const base = appOrigin.replace(/\/$/, "");
  return `${base}/club/idees?id=${encodeURIComponent(suggestionId)}`;
}
