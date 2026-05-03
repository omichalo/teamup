## 2025-05-15 - [PII exposure in FFTT players API]
**Vulnerability:** The `/api/fftt/players` endpoint was publicly accessible and returned sensitive player data including emails and phone numbers.
**Learning:** The Next.js middleware in `middleware.ts` was configured to exclude all routes starting with `/api`, leading to an assumption that these routes might be protected when they were actually open.
**Prevention:** Each API route must manually implement authentication and authorization checks, especially when dealing with PII. Always verify that Firebase Admin is initialized before using its services.
