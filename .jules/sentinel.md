## 2025-04-19 - [HIGH] Missing API Authentication/Authorization
**Vulnerability:** Multiple API routes (e.g., `/api/fftt/players`, `/api/teams/matches`) were completely unprotected, exposing PII and internal club data.
**Learning:** The Next.js middleware in `middleware.ts` explicitly excludes the `/api` prefix from its protection logic. Developers likely assumed the middleware protected all routes, but because of the `matcher` regex, API routes were open by default unless they manually implemented session verification.
**Prevention:** Every new API route MUST manually implement `adminAuth.verifySessionCookie` and role checks. Future security audits should specifically grep for routes missing these checks.
