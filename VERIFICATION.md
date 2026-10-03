# Verification — 2026-10-03

- `npm run build`: PASS, Next.js 16.3.8 / webpack, all routes compiled and TypeScript validated.
- `npm run typecheck`: PASS.
- `npm test`: PASS (5 tests).
  1. PostgreSQL migration, RLS, atomic publication, inquiry update, shared rate limiting.
  2. Dimension filtering, including unknown/null dimensions.
  3. Combined filters, rent sorting, 47-prefecture validation.
  4. Lead validation: contact alternatives, consent, spam field, malformed input.
  5. Null numeric fields and server schema whitelisting.

Database test executes the actual migrations using PGlite with minimal mock Supabase auth/storage schemas. Tested anonymous and authenticated non-admin isolation; admin registration, permission-gated publication and withdrawal; public image row/object visibility; lead confidentiality and status changes; rate limit exhaustion.

Not yet verified: real Supabase Auth sign-in/session refresh, live Storage upload and signed URLs, actual PostgREST queries, real lead endpoint through DB, Vercel runtime, browser responsive rendering. The local supervised preview could not be reached reliably. The browser test did not pass and is not represented as completed.

No credentials, actual properties, customer details, or production resources are included. No live deployment or GitHub push was performed.
