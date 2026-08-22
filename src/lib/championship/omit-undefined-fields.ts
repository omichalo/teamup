/** Firestore Admin refuse `undefined` comme valeur de document. */
export function omitUndefinedFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}
