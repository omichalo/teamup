# Sentinel Security Journal

## 2024-05-23 - [API Authorization Architecture Gap]
**Vulnerability:** The `/api/fftt/players` endpoint was entirely public, leaking the full list of club players and their points to any unauthenticated client.
**Learning:** The application's `middleware.ts` is configured to ignore all paths starting with `/api`. While this allows for public APIs, it creates a "fail-open" scenario where new sensitive API routes are insecure by default unless the developer explicitly adds auth checks.
**Prevention:** Every sensitive API route must manually implement session cookie verification and role-based access control. A security review of all routes in `src/app/api` should be performed whenever the middleware matcher is updated.
