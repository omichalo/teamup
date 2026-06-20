# Synchronisation FFTT — Cloud Functions et admin

## Architecture (source unique)

Toute la logique métier est dans `src/lib/shared/` :

- `sync-utils.ts` — orchestrateur (`syncPlayers`, `syncTeams`, `syncTeamMatches`)
- `player-sync.ts`, `team-sync.ts`, `team-matches-sync.ts`
- `fftt-config.ts` — credentials (`process.env` puis `functions.config().fftt` en secours)

Les Cloud Functions (`functions/src/`) ne font que :

- déclencher (cron ou HTTP) ;
- appeler les wrappers → `sync-utils` ;
- mettre à jour `metadata/lastSync` (timestamps).

L’admin Next.js appelle les **mêmes** fonctions via `/api/admin/sync-*`.

## Fonctions planifiées (prod)

| Fonction | Horaire (Paris) |
|----------|-----------------|
| `syncPlayersDaily` | 6h00 |
| `syncTeamsDaily` | 6h05 |
| `syncTeamMatchesDaily` | 6h10 |

Projet cible production : **`sqyping-teamup`**.

## Incident connu (nov. 2025)

Les trois fonctions `*Daily` ont été **supprimées** lors d’un `firebase deploy --only functions` (22/11/2025). Seules les fonctions HTTP manuelles restaient déployées, sans secrets FFTT → plus de synchro automatique.

## Remise en service

1. Secrets (mêmes valeurs qu’App Hosting) :
   ```bash
   npm run functions:secrets:prod
   ```
2. Config legacy optionnelle :
   ```bash
   npm run functions:setup
   ```
3. Build + deploy :
   ```bash
   npm run functions:deploy:prod
   ```
4. Vérifier :
   ```bash
   firebase functions:list --project sqyping-teamup
   ```
   Doit afficher **8** fonctions de synchro (3 Daily + 3 Manual + utilitaires).

5. Lendemain 6h ou test manuel HTTP `syncPlayersManual` avec token admin.

## Credentials

Ordre de résolution (`fftt-config.ts`) :

1. `process.env.ID_FFTT` / `PWD_FFTT` (secrets liés via `functions/src/sync-runtime.ts`)
2. `functions.config().fftt.*` (legacy, `npm run functions:setup`)

App Hosting utilise déjà les secrets `fftt-id-secret` / `fftt-pwd-secret` mappés sur `ID_FFTT` / `PWD_FFTT`. Les Cloud Functions attendent des secrets nommés **`ID_FFTT`** et **`PWD_FFTT`** dans Secret Manager.

## Déploiement

- **App Hosting** : ne déploie pas `functions/` (voir `firebase.json` apphosting.ignore).
- **Functions** : déploiement manuel ou CI dédié — pas inclus dans le merge `staging` → App Hosting seul.
