'use client';

import {useEffect, useState} from 'react';
import {usePathname} from 'next/navigation';
import Script from 'next/script';
import {GA_MEASUREMENT_ID, startAnalyticsPage} from '@/lib/analytics';

export function GoogleAnalytics() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(startAnalyticsPage());
    return () => { window['ga-disable-G-28H2BE51SX'] = true; };
  }, [pathname]);
  return enabled ? <Script id="garage-google-analytics" strategy="afterInteractive"
    src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}/> : null;
}
