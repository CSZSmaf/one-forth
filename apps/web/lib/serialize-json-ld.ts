/** Keep JSON data inside its script element, including authored text. */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) throw new Error("JSON-LD requires a serializable value");
  return json.replaceAll("<", "\\u003c");
}
