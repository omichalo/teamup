## 2025-05-15 - API Route Authentication Gap
**Vulnerability:** Publicly accessible API endpoints (`/api/fftt/players`, `/api/teams/matches`) exposing PII and internal club data.
**Learning:** Developers assumed the Next.js `middleware.ts` protected all routes, but the matcher explicitly excluded the `/api` prefix, leaving all API routes open by default unless manually secured.
**Prevention:** Always implement manual session verification (`adminAuth.verifySessionCookie`) and role checks in every API route. Use anti-caching headers for sensitive data.
