// Prevent HTML script termination while preserving the JSON value.
export function structuredDataJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
