import type {MetadataRoute} from 'next';
import {createClient} from '@supabase/supabase-js';
import {configured, demoMode, siteUrl} from '@/lib/config';
import {regions} from '@/lib/regions';
import {publishedArticles} from '@/lib/journal';
import {collectSitemapProperties} from '@/lib/sitemap-properties';

// Public, cookie-free output is reused between crawls. Failed background
// regeneration preserves the previous complete sitemap.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (demoMode()) return [];
  const base = siteUrl();
  const routes = ['', '/properties', '/areas', '/company', '/contact', '/privacy', '/terms',
    ...Object.keys(regions).map(pref => `/${pref}`),
    ...Object.entries(regions).flatMap(([pref, region]) =>
      Object.keys(region.cities).map(city => `/${pref}/${city}`)),
  ];
  const entries: MetadataRoute.Sitemap = routes.map(path => ({url: base + path}));
  const articles = publishedArticles();
  if (articles.length) {
    entries.push({url: `${base}/journal`});
    entries.push(...articles.map(article => ({
      url: `${base}/journal/${article.slug}`, lastModified: article.updatedAt,
    })));
  }
  if (configured()) {
    // Publishable key and RLS only. Never inherit administrator cookies or
    // service-role privileges into a shared public response.
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
      });
    const rows = await collectSitemapProperties((from, to) => db.from('properties')
      .select('slug,updated_at').eq('status', 'published').order('id').range(from, to)
      .abortSignal(AbortSignal.timeout(10000)));
    entries.push(...rows.map(property => ({
      url: `${base}/properties/${property.slug}`, lastModified: property.updated_at,
    })));
  }
  return entries;
}
