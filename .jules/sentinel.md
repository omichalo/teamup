# 🛡️ Sentinel Security Journal

## 2025-05-14 - [HIGH] Missing Authentication and Authorization on Sensitive API Endpoints
**Vulnerability:** The `/api/fftt/players` and `/api/teams/matches` endpoints were fully public, exposing PII (emails, phone numbers) and internal match data to any unauthenticated requester.
**Learning:** In Next.js App Router, middleware matchers often exclude `/api` routes, meaning every API route must manually implement its own security logic. Forgetting this leads to silent exposure.
**Prevention:** Establish a standard template for API routes that includes `adminAuth.verifySessionCookie` and role checks. Implement automated security regression tests to verify that these endpoints return 401/403 when unauthenticated.
