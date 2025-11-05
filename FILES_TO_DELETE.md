# Fichiers à supprimer

## Dossiers complets

### 1. temp-sqyping-theme/
- Dossier temporaire de développement
- Non utilisé par l'application

### 2. sqyping-theme-package/
- Package local non utilisé
- Le package @omichalo/sqyping-mui-theme est publié sur npm (version 0.2.8)
- Aucune référence dans le code source

## Scripts de debug/test obsolètes

### 3. scripts/debug-player-match.js
- Script de debug non utilisé
- Non référencé dans package.json

### 4. scripts/sync-matches.js
- Script de synchronisation obsolète
- Remplacé par sync-matches-direct.ts
- Non référencé dans package.json

### 5. scripts/sync-matches-direct.ts
- Script de sync non utilisé par src/ ou functions/
- Non référencé dans package.json

### 6. scripts/test-functions.js
- Script de test non utilisé
- Non référencé dans package.json

## Fichiers de backup/old

### 7. src/app/layout.tsx.bak
- Fichier de backup
- Non utilisé par l'application

### 8. src/pages/api/fftt/real-matches-old.ts
- Version obsolète de l'API
- Remplacée par real-matches-optimized.ts
- Non référencée dans le code

## Fichiers de test/setup obsolètes (racine)

### 9. create-test-data.js
- Script de création de données de test
- Non référencé dans package.json

### 10. setup-real-data.js
- Script de setup de données réelles
- Non référencé dans package.json

### 11. test-fftt-api.js
- Script de test API FFTT
- Non référencé dans package.json

### 12. test-real-data.tsx
- Composant de test
- Non utilisé par l'application

### 13. test-rules-compatibility.js
- Script de test de compatibilité des règles
- Non référencé dans package.json

## Fichiers de build (à supprimer et ajouter dans .gitignore)

### 14. functions/lib/
- Dossier de build output
- Doit être régénéré avec `npm run build`

### 15. functions/*.js (fichiers compilés à la racine de functions/)
- index.js
- sync-wrappers.js
- Et leurs fichiers .map correspondants

### 16. functions/*.js.map
- Source maps des fichiers compilés

### 17. functions/tsconfig.tsbuildinfo
- Fichier TypeScript build info

### 18. sqyping-theme-package/dist/
- Build output du package local (sera supprimé avec le dossier)

### 19. temp-sqyping-theme/dist/
- Build output temporaire (sera supprimé avec le dossier)

### 20. *.tsbuildinfo (racine)
- tsconfig.tsbuildinfo

## Fichiers à conserver

### Scripts utilisés (à garder)
- scripts/deploy-functions.js (utilisé par `npm run functions:deploy`)
- scripts/setup-functions-config.js (utilisé par `npm run functions:setup`)
- scripts/test-functions-local.js (utilisé par `npm run functions:test`)

### Fichiers de configuration
- firebase.json
- firestore.*.rules
- .firebaserc
- tsconfig.json
- package.json
- etc.

