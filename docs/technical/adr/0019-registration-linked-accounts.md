# ADR-0019: Comptes liés à un dossier d'adhésion

## Statut

Accepté — 2026-10-12

## Contexte

`submitterUid` mélangeait l'audit (qui a déposé le dossier) et l'accès portail
(Mes dossiers, factures, checkout). Les dossiers créés par admin/secrétariat
restaient rattachés au compte staff : l'adhérent ne pouvait pas se servir du
self-service même après création de son compte TeamUp.

## Décision

1. **`submitterUid` / `submitterAccountEmail` / `submitterRole` immuables** après
   création (audit du dépôt).
2. **`linkedAccountUids: string[]`** = comptes autorisés au portail. Absent →
   legacy = `[submitterUid]`. Présent (y compris `[]`) = liste exclusive.
3. **`linkedAccountEmails: string[]`** = snapshots e-mail pour affichage /
   recherche (tableau, cartes, détail).
4. **v1** : action manager « Associer / réaffecter » remplace la liste par un
   seul compte (`POST .../link-account`). Multi-parents = extensions futures
   sur la même liste.
5. **Stages** : à la création d'une inscription stage depuis un dossier club,
   `ownerUid` = premier `linkedAccountUid` (sinon `submitterUid`).
6. Pas de claim self-service adhérent en v1.

## Conséquences

- Accès API / `viewer.isOwner` / Mes dossiers / règles Firestore basés sur les
  comptes liés.
- E-mails de paiement restent pilotés par `submitterRole` staff → contact
  formulaire (inchangé).
- Affichage : soumettant **et** compte(s) lié(s) visibles côté secrétariat.

## Références

- `src/lib/club-registration/effective-linked-accounts.ts`
- `src/lib/club-registration/link-registration-account.ts`
- `POST /api/club/registration/[id]/link-account`
