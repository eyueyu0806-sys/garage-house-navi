// Public Google Analytics measurement ID (not a secret or API credential).
export const GA_MEASUREMENT_ID = 'G-28H2BE51SX';
const HOSTS = new Set(['garagehouse-navi.com', 'www.garagehouse-navi.com']);
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    garageAnalytics?: {initialized: boolean; lastPath: string; leads: Set<string>};
    'ga-disable-G-28H2BE51SX'?: boolean;
  }
}

export function isPublicAnalyticsPath(path: string): boolean {
  return /^\/(?:[a-z0-9-]+\/?)*$/.test(path)
    && !/^\/(admin|api|auth|login|_next)(\/|$)/.test(path);
}

export function analyticsAllowed(url: URL): boolean {
  return url.protocol === 'https:' && HOSTS.has(url.hostname)
    && isPublicAnalyticsPath(url.pathname);
}

// Never send arbitrary query strings, fragments, form contents or document titles.
export function analyticsPage(url: URL, referrer = '') {
  let pageReferrer = '';
  try {
    const ref = new URL(referrer);
    if (ref.protocol === 'https:' || ref.protocol === 'http:') {
      pageReferrer = HOSTS.has(ref.hostname)
        ? (isPublicAnalyticsPath(ref.pathname) ? ref.origin + ref.pathname : '')
        : ref.origin + '/';
    }
  } catch { /* Empty or invalid referrers are omitted. */ }
  return {
    page_location: url.origin + url.pathname,
    page_title: 'GARAGE HOUSE NAVI',
    page_referrer: pageReferrer,
  };
}

export function analyticsCampaign(url: URL): Record<string, string> {
  const result: Record<string, string> = {};
  const allowed: Record<string, string[]> = {
    source: ['instagram', 'threads', 'google', 'facebook', 'tiktok'],
    medium: ['organic_social', 'social', 'organic', 'referral', 'cpc'],
    name: ['launch_202610'],
  };
  for (const [key, values] of Object.entries(allowed)) {
    const value = url.searchParams.get(`utm_${key === 'name' ? 'campaign' : key}`);
    if (value && values.includes(value)) result[`campaign_${key}`] = value;
  }
  return result;
}

export function startAnalyticsPage(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  // A test visit stays excluded for this tab until it is closed.
  if (url.searchParams.get('analytics_test') === '1') {
    try { sessionStorage.setItem('garage-analytics-test', '1'); } catch { /* Private browsing. */ }
    window['ga-disable-G-28H2BE51SX'] = true;
    return false;
  }
  try {
    if (sessionStorage.getItem('garage-analytics-test')) {
      window['ga-disable-G-28H2BE51SX'] = true;
      return false;
    }
  } catch { /* Analytics does not require session storage. */ }
  const allowed = analyticsAllowed(url);
  window['ga-disable-G-28H2BE51SX'] = !allowed;
  if (!allowed) return false;
  const state = window.garageAnalytics ??= {initialized: false, lastPath: '', leads: new Set()};
  window.dataLayer ??= [];
  window.gtag ??= function () { window.dataLayer!.push(arguments); };
  const page = analyticsPage(url, state.lastPath || document.referrer);
  if (!state.initialized) {
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ...page,
      ...analyticsCampaign(url),
    });
    state.initialized = true;
  }
  if (state.lastPath !== page.page_location) {
    window.gtag('set', page);
    window.gtag('event', 'page_view', {send_to: GA_MEASUREMENT_ID, ...page});
    state.lastPath = page.page_location;
  }
  return true;
}

// Analytics must never change whether a saved inquiry is shown as successful.
export function trackSavedLead(kind: 'inquiry' | 'request', submissionId: string): void {
  try {
    if (typeof window === 'undefined' || !analyticsAllowed(new URL(window.location.href))) return;
    const state = window.garageAnalytics;
    if (!state?.initialized || !window.gtag || window['ga-disable-G-28H2BE51SX'] || state.leads.has(submissionId)) return;
    const key = `garage-ga-lead:${submissionId}`;
    try { if (sessionStorage.getItem(key)) return; } catch { /* Storage can be blocked. */ }
    state.leads.add(submissionId);
    window.gtag('event', 'generate_lead', {
      send_to: GA_MEASUREMENT_ID,
      lead_type: kind,
      ...analyticsPage(new URL(window.location.href)),
    });
    try { sessionStorage.setItem(key, '1'); } catch { /* In-memory deduplication remains. */ }
  } catch { /* Ad blockers or analytics errors must not break the lead form. */ }
}
