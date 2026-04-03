## 2025-05-15 - [CRITICAL] Sensitive Data Exposure in Firestore Rules
**Vulnerability:** The `clubSettings` collection, which contains sensitive information like Discord webhooks and FFTT API credentials, was readable by all authenticated users.
**Learning:** Defaulting to `isAuthenticated()` for read access on collections that store configuration data can lead to exposure of third-party secrets if those configurations are not strictly partitioned by user.
**Prevention:** Always restrict read access to administrative roles (`isAdmin()`) for collections containing system-wide settings or integration secrets. Ensure that any collection alias (e.g., `club_settings`) also has matching restrictive rules.
