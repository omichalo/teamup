# Firebase Functions — synchro FFTT

Logique métier : **`../src/lib/shared/`** (via `sync-wrappers.ts`). Ne pas dupliquer dans `functions/shared/`.

## Fonctions

| Export | Déclencheur |
|--------|-------------|
| `syncPlayersDaily` | Cron 6h00 Europe/Paris |
| `syncTeamsDaily` | Cron 6h05 |
| `syncTeamMatchesDaily` | Cron 6h10 |
| `syncPlayersManual` | HTTP POST |
| `syncTeamsManual` | HTTP POST |
| `syncTeamMatchesManual` | HTTP POST |
| `getSyncStatus` | HTTP POST |
| `cleanupDuplicatePlayers` | HTTP POST |
| `setUserRole` | HTTP POST (admin) |

## Scripts (racine du repo)

```bash
npm run functions:setup          # functions.config().fftt (secours)
npm run functions:secrets:prod   # Secret Manager ID_FFTT, PWD_FFTT
npm run functions:build
npm run functions:deploy:prod
npm run functions:logs
```

Documentation ops : [`docs/technical/SYNC_CLOUD_FUNCTIONS.md`](../docs/technical/SYNC_CLOUD_FUNCTIONS.md).
