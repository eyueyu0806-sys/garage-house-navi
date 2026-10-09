export type SitemapProperty = {slug: string; updated_at: string};
type Page = {data: SitemapProperty[] | null; error: unknown};

// Never return a partial list after a failed page: preserve the healthy cache.
export async function collectSitemapProperties(
  fetchPage: (from: number, to: number) => PromiseLike<Page>,
): Promise<SitemapProperty[]> {
  const rows: SitemapProperty[] = [];
  for (let offset = 0; ; offset += 1000) {
    const {data, error} = await fetchPage(offset, offset + 999);
    if (error || !data) throw new Error('SITEMAP_UNAVAILABLE');
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
