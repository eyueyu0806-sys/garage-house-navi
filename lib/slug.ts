const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function toAsciiSlug(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    .replace(/-+$/g, '');
}

export function normalizePropertySlugs(slug: string, propertyCode: string, citySlug: string) {
  const normalizedSlug = toAsciiSlug(slug) || toAsciiSlug(propertyCode);
  const normalizedCitySlug = toAsciiSlug(citySlug);

  return {
    slug: SLUG_PATTERN.test(normalizedSlug) ? normalizedSlug : '',
    city_slug: normalizedCitySlug && SLUG_PATTERN.test(normalizedCitySlug) ? normalizedCitySlug : '',
  };
}
