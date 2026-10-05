/**
 * Compare a mutation request's Origin with the host that received it.
 * This remains strict same-origin protection while allowing the configured
 * canonical URL and Vercel/custom-domain aliases to coexist safely.
 */
export function sameOrigin(request: Pick<Request, 'headers' | 'url'>) {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
