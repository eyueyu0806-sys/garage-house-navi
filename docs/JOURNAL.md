# GARAGE LIFE articles

The public journal uses the existing Next.js app and needs no extra service or secrets.

- Content: `lib/journal.ts`. Only `status: 'published'` is public.
- `/journal`: article list; indexable when articles exist and demo mode is off.
- `/journal/[slug]`: prerendered article, canonical, Open Graph, BlogPosting and breadcrumb JSON-LD.
- `/sitemap.xml`: includes published journal routes and their actual content update dates.
- Unknown slugs render Next.js notFound with noindex. The existing root loading boundary can send a streamed HTTP 200 before notFound; no article data is exposed. There is no authoring admin screen or AI generation endpoint in this change.

Article 1 is prepared for publication on 2026-10-09 under the site owner’s instruction. Set publishedAt to the actual publication date if launch is delayed. When adding or changing an article, update the appropriate dates and rebuild/deploy; do not change dates on every request. Set status to draft and redeploy to remove an article from public routes and the sitemap. This does not immediately remove search engine caches.

## Verification

Run `npm run typecheck` and `npm run build` with `DEMO_MODE=false` and `NEXT_PUBLIC_SITE_URL=https://garagehouse-navi.com` (no database needed to verify these new article routes). Start the built server with `npm start -- --port 3111`, then run:

```sh
TEST_BASE_URL=http://127.0.0.1:3111 node scripts/check-journal.mjs
```

Install Playwright Chromium if not available. The browser check covers desktop and mobile article navigation, metadata, structured data, overflow, Osaka preselection in the request form, unknown-route not-found/noindex and sitemap inclusion. It does not send inquiries or email and does not verify live database or SNS connections. Screenshots default to /tmp/garage-journal-qa; override JOURNAL_QA_DIR as needed.

## Next steps

- Confirm Search Console's authenticated sitemap result and inspection status.
- GA4 G-28H2BE51SX is deployed. The owner confirmed generate_lead=1 in Realtime on 2026-10-09. Mark it as a key event once the event list updates.
- Confirm the exact Meta connection screen and permissions before connecting automatic posting. The cause of the earlier connection issue is unconfirmed. SNS posting is not part of this change.
