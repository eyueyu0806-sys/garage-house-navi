import type { NextConfig } from 'next';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const config: NextConfig = {
 images: { formats: ['image/avif', 'image/webp'], remotePatterns: supabaseUrl ? [{ protocol: 'https', hostname: new URL(supabaseUrl).hostname, pathname: '/storage/v1/**' }] : [] },
 poweredByHeader: false,
 async headers() { return [{source: '/:path*', headers: [
 {key:'X-Content-Type-Options',value:'nosniff'}, {key:'X-Frame-Options',value:'DENY'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
 {key:'Content-Security-Policy',value:"base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'"}
 ]}]; }
};
export default config;
