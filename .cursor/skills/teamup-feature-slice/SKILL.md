---
name: teamup-feature-slice
description: >-
  Livrer une feature verticale sur TeamUp (Next.js, Firebase, API routes) : garde-fous
  sécurité, Firestore, extraction UI, sans refactor obligatoire des écrans existants.
  À utiliser pour adhésions, présences, tarifs, paiements, ou toute nouvelle route API / collection.
---

# Livraison d’une feature verticale (TeamUp)

## Quand utiliser ce skill

- Nouvelle route sous `src/app/api/**`, nouvelle page sous `src/app/`, nouvelle collection Firestore, flux métier club (adhésion, présence, paiement, admin).
- Refactor optionnel des gros conteneurs existants **non requis** pour livrer ; préférer **extract alongside** (voir `.cursor/rules/80-club-platform-extension.mdc`).

## Checklist technique (ordre recommandé)

1. **Périmètre** : une slice livrable (ex. workflow sans paiement, puis paiement), pas une « grosse » PR multi-domaines sans découpe.
2. **API** : `runtime = "nodejs"` si Firebase Admin, crypto, Node ; mutations cookie → `validateOrigin` ; données sensibles → `jsonNoStore` / helpers cache ; rate limit sur surfaces sensibles ; validation Zod des entrées ; codes HTTP cohérents.
3. **Rôles** : `AuthGuard` côté page aligné avec `hasAnyRole` / admin-only sur les routes concernées.
4. **Firestore** : nouvelle collection → mettre à jour `firestore.rules` + index si requêtes composées ; principe du moindre privilège.
5. **Paiement / webhook** : signature, idempotence, pas de secrets en logs ; état métier dérivé des événements fiables.
6. **UI** : préférer composants petits + primitives sous `components/ui/` ou domaine ; éviter les pages > ~400 lignes sur le **nouveau** code.
7. **Qualité** : `npm run check:dev` en boucle ; avant push `npm run check` ; pas de `TODO` dans le code (CI).
8. **Tests** : ajouter ou adapter des tests Jest sur la règle métier ou handler la plus risquée si la suite du projet couvre ce périmètre.

## Documents de référence du repo

- Gates locaux et CI : `docs/QUALITY_GATES.md`
- Sécurité API et exceptions CSRF : `docs/SECURITY.md`
- Plan technique et backlog qualité : `docs/technical/AUDIT_NEXTJS_REACT_ACTION_PLAN.md`

## Sortie attendue

- PR sur branche `feature/*` ou `fix/*`, commits Conventional Commits, description qui résume périmètre et risques (Firestore, rôles, paiement).
