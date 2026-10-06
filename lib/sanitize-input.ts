/** Remove characters that PostgreSQL text/jsonb cannot store from request data. */
export function sanitizeInput<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(/\u0000/g, '') as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeInput(item)) as T;
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeInput(item)]),
    ) as T;
  }

  return value;
}
