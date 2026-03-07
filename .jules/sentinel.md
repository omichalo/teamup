## 2025-05-15 - Unsecured FFTT Players API Endpoint
**Vulnerability:** The `/api/fftt/players` GET endpoint was accessible without any authentication or authorization, allowing anyone to fetch the entire players collection from Firestore.
**Learning:** API routes in Next.js (App Router) are public by default unless explicitly protected. While the middleware protected most frontend routes, it excluded `/api` routes from its matcher, leaving them vulnerable if they didn't implement their own checks.
**Prevention:** Always implement authentication and authorization checks in API routes that expose sensitive data. Use a consistent pattern (like `verifyApiAuth` or manual `verifySessionCookie` checks) for all non-public API endpoints.
