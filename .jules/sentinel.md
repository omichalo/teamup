# SQY Ping TeamUp - Sentinel Security Journal

This file contains critical security learnings discovered during the maintenance and protection of this codebase.

## 2025-05-15 - Unprotected FFTT Players API Endpoint
**Vulnerability:** The `/api/fftt/players` endpoint was entirely unprotected, allowing any client with the URL to fetch the full list of club players from Firestore.
**Learning:** Some API routes were implemented without following the established pattern of session and role verification, possibly due to being added during early development or as a quick internal utility.
**Prevention:** Use the centralized `verifyApiAuth` utility in all new API routes. Audit existing routes for similar gaps in authentication and authorization.
