# Google Analytics 4

Measurement ID: `G-28H2BE51SX` (GARAGE HOUSE NAVI).
This is a public identifier, not an API key. It is centrally configured in
`lib/analytics.ts`; no new Vercel environment variable or extra service is required.

## Google Analytics setting — required

管理 → データストリーム → GARAGE HOUSE NAVI → 拡張計測機能をオフにする。
This site sends its own `page_view` on initial load and Next.js pathname changes.
Google's automatic history pageviews must be disabled to avoid duplicate events.
Disabling enhanced measurement also avoids automatic form/outbound events and
automatic collection of raw URLs. `send_page_view: false` alone does not disable
enhanced history measurement. No Google Ads/signals integration is enabled here.

Official reference: https://developers.google.com/analytics/devguides/collection/ga4/views

## What is collected

- Public production pages on `garagehouse-navi.com` or `www.garagehouse-navi.com`.
- `page_view`: clean path, fixed site title, sanitized referrer.
- `generate_lead`: only after `/api/leads` returns a successful response with `ok: true`.
  `lead_type` distinguishes `inquiry` and `request`.
- Duplicate callbacks for a submission are suppressed in memory and session storage.
  Submission IDs stay in the browser and are not sent to Analytics.
- Campaign attribution is allowlisted: sources instagram/threads/google/facebook/tiktok,
  mediums organic_social/social/organic/referral/cpc, campaign launch_202610.
  Contents profile/intro/checklist/request/osaka-guide distinguish placements.
  Add reviewed, non-personal campaign labels to the allowlist when needed.
- Names, email, phone, form contents, search queries and URL fragments are excluded
  from application-generated events. Admin/API/auth/login and preview/local hosts
  are excluded. Analytics failures do not prevent successful form submission.

## Checking it

1. Deploy, disable enhanced measurement above, then open the public site in a normal
   browser without an Analytics-blocking extension. Navigate to a property.
2. Google Analytics → レポート → リアルタイム: check page views on this property.
3. A real successful inquiry sends `generate_lead`. Mark that event as a key event
   in Analytics. Do not infer delivery of an email from Analytics.
4. For operational inquiry tests, open the site with `?analytics_test=1` first;
   that tab stays excluded until closed. Local/preview development never sends data.

DB lead records remain the source of truth. Ad blockers, disabled cookies or a closed
browser can make Analytics counts lower. The deployment check cannot confirm the
owner's Analytics dashboard without access to that account.

## Rollback

Remove `<GoogleAnalytics/>` from `app/layout.tsx` to stop loading the tag.
The form has no dependency on Analytics being available.
