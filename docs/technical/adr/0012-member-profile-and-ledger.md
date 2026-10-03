# ADR-0012: Fiche adhérent et projection ledger (préparation Sage)

## Statut

Accepté — 2026-10-02

## Contexte

Le secrétariat a besoin d’une **vue 360°** par adhérent (créneaux, présences, finances) en
quelques secondes. L’adhérent doit pouvoir consulter la même fiche en lecture seule.

Aujourd’hui :

- créneaux et pointage sont déjà rattachés au dossier `clubRegistrations` ;
- les finances d’adhésion vivent dans `pricingQuote` + `payment` + PDF FAC/REC (ADR-0011) ;
- Mes dossiers reste le parcours paiement / téléchargement des justificatifs ;
- aucun modèle n’anticipe stages, matériel, ni export Sage.

La numérotation FAC/REC était attribuée au **premier téléchargement PDF**, ce qui laisse
des dossiers payés sans numéro tant qu’aucun PDF n’a été ouvert — incompatible avec un
export comptable fiable.

## Décision

1. **Fiche adhérent** ancrée sur `clubRegistrations/{registrationId}` (dossier saisonnier).
   Route `/club/adherents/[registrationId]`. Lecture seule pour tous ; le staff conserve
   les actions d’édition via les écrans existants (lien « Traiter le dossier »).

2. **Rôle des écrans**
   - **Mes dossiers** : parcours inscription / paiement / PDF (liens e-mails inchangés).
   - **Dossiers à valider / Tableau** : traitement secrétariat.
   - **Fiche adhérent** : agrégation lecture (créneaux, présences, synthèse financière).

3. **Bounded contexts**
   - `member-profile` : agrégation lecture (API profile).
   - `member-ledger` : contrat de projection financière (types + adapter cotisation).
   - Pas d’extension de `clubRegistrations.payment` pour stages / matériel.

4. **Projection ledger** (`MemberLedgerView`)
   - Charge ≠ paiement (aligné facture ≠ reçu).
   - v1 : adapter `projectRegistrationPaymentToLedger` (kind `membership` uniquement).
   - Extensible : `kind` `camp` | `equipment` | `other` ; `LedgerPartyRef.memberAccountId`
     optionnel pour un futur tiers multi-saisons.
   - Montants en cents, EUR, timezone `Europe/Paris`.
   - Champs optionnels d’export : `accountingAccountCode`, `thirdPartyCode`, `journalCode`,
     `exportedAt` / `exportBatchId`.
   - Une fois exporté : pas d’édition destructive (soft-void + contrepassation — futur).

5. **Numérotation FAC / REC à l’événement métier** (remplace le lazy-download d’ADR-0011)
   - **FAC** : dès que la facture est disponible (même critère qu’`isInvoiceDocumentAvailable`).
   - **REC** : **amendé par ADR-0013** — un numéro **par encaissement**
     (`receivedPayments[].documentNumber`), plus un seul REC dossier.
   - Attribution via compteur `clubPaymentDocumentCounters`.
   - Consultation fiche / export : **lecture seule** des numéros — ne mintent jamais un n°.
   - Routes PDF : filet de sécurité idempotent sur facture / reçu unitaire.
   - Script de rattrapage pour les dossiers / encaissements déjà éligibles sans numéro.

6. **Collections futures** (documentées, pas d’écriture v1) : `memberCharges`,
   `memberPayments` (Admin SDK uniquement).

## Conséquences

### Positives

- Vue globale cohérente member / staff sans dupliquer le workflow d’adhésion.
- Modèle prêt pour export Sage et charges hors cotisation.
- Numéros comptables présents dès l’événement métier, pas seulement après un PDF.

### Négatives

- Bascule de politique de numérotation + script de rattrapage à exécuter.
- Nouvelle route / API à maintenir en cohérence avec `canViewClubRegistration`.

### Neutres

- Les PDF et Mes dossiers restent la source des justificatifs téléchargeables.
- Pas de saisie stage / matériel dans cette livraison.

## Alternatives considérées

### Alternative 1: Onglets dans le panel détail existant

- **Pourquoi rejetée** : panel déjà volumineux ; partage member/staff plus complexe ;
  plafonds de taille de fichiers.

### Alternative 2: Compte personne multi-saisons dès v1

- **Pourquoi rejetée** : slots / présences / cotisation sont déjà sur le dossier ;
  surcoût sans bénéfice immédiat. Le ledger prévoit `memberAccountId` pour plus tard.

### Alternative 3: Garder la numérotation au premier téléchargement

- **Pourquoi rejetée** : export Sage incomplet pour les dossiers jamais téléchargés.

## Références

- ADR-0011 (facture / reçu) — point 6 de numérotation **amendé** par cette ADR
- `src/lib/member-ledger/`
- `src/lib/member-profile/`
- `src/app/club/adherents/[registrationId]/`
- `scripts/backfill-payment-document-numbers.ts`
