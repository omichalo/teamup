## 2024-05-22 - Unsecured Sensitive API Endpoints
**Vulnerability:** `/api/fftt/players` and `/api/teams/matches` were accessible without authentication, exposing PII (emails, phone numbers) and internal match data.
**Learning:** Next.js middleware was configured to ignore `/api` routes, meaning every API route must manually implement its own authentication and authorization.
**Prevention:** Sensitive API routes must implement session verification (`verifySessionCookie`) and Role-Based Access Control (RBAC) before processing data. Automated security scans should flag any API route missing these checks.
