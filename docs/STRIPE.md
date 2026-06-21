# Stripe

Cette application utilise Stripe Checkout pour demander le paiement d'une
adhesion apres relecture d'un dossier par le secretariat.

## Variables d'environnement

En local, ajouter ces variables dans `.env.local` :

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

En production, les definir dans le gestionnaire de secrets de l'environnement
d'hebergement.

Ne jamais committer de vraies valeurs de cles Stripe.

## Cle secrete Stripe

La cle `STRIPE_SECRET_KEY` se trouve dans le Dashboard Stripe :

1. Ouvrir le Dashboard Stripe.
2. Choisir le mode test ou live selon l'environnement.
3. Aller dans `Developers` puis `API keys`.
4. Copier la cle secrete, au format `sk_test_...` ou `sk_live_...`.

## Webhook local

Installer Stripe CLI si necessaire :

```bash
brew install stripe/stripe-cli/stripe
```

Se connecter :

```bash
stripe login
```

Puis lancer l'ecoute locale :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

La commande affiche une cle `whsec_...`. C'est la valeur a mettre dans
`STRIPE_WEBHOOK_SECRET`.

Garder cette commande active pendant les tests de paiement locaux.

## Webhook production

Dans le Dashboard Stripe :

1. Aller dans `Developers` puis `Webhooks`.
2. Creer un endpoint vers :

```text
https://<domaine-app>/api/stripe/webhook
```

3. Activer au minimum l'evenement :

```text
checkout.session.completed
```

4. Copier le `Signing secret`, au format `whsec_...`, dans
   `STRIPE_WEBHOOK_SECRET`.

## Parcours applicatif

1. Un utilisateur envoie un dossier d'adhesion.
2. Une secretaire ou un admin relit et corrige le dossier depuis
   `/club/demandes-adhesion`.
3. La secretaire renseigne le montant, puis clique sur
   `Valider et demander le paiement`.
4. Le serveur recalcule le devis (`pricingQuote`), verifie que le montant
   saisi correspond au total, puis cree une session Stripe Checkout **multi-lignes**
   (adhésion nette, licence FFTT, compétitions) avec facture Stripe activee.
   Les remises catalogue sont integrees au net de la ligne « Adhésion club (net
   apres remises) », avec description detaillee (brut, remises, net facture) et
   un champ personnalise facture « Remises sur adhesion » (Stripe n'accepte pas de
   montants negatifs sur les line_items).
5. Un e-mail contenant le lien de paiement est envoye a l'adherent, au premier
   representant legal, ou au compte soumetteur selon les donnees disponibles.
6. Lorsque Stripe envoie `checkout.session.completed`, le webhook marque le
   dossier comme paye.

## Paiement en plusieurs fois (BNPL)

Pour les dossiers en **carte bancaire**, un seul lien Stripe Checkout est
envoye. L'adherent peut alors :

- payer en **une fois** par carte ;
- ou choisir un **partenaire BNPL** sur la page Stripe (Alma, Klarna, etc. —
  2x, 3x ou 4x sans frais selon eligibilite).

Le club est credite du montant integral a la validation ; le partenaire BNPL
gere les echeances cote adherent.

### Activer le BNPL

1. Dashboard Stripe → **Settings** → **Payment methods**.
2. Activer **Alma**, **Klarna** et/ou les autres BNPL souhaites (mode test
   puis live apres validation metier).
3. Aucun changement de code : les *dynamic payment methods* affichent les
   options eligibles automatiquement sur Checkout.

### Tests locaux BNPL

Apres activation en mode test, ouvrir le lien Checkout et verifier qu'une
option BNPL apparait pour un montant typique (200–300 €). Utiliser les
scenarios de test documentes par Stripe et le prestataire actif.

### Points d'attention

- Montant restant a payer **inferieur au minimum BNPL** (ex. Alma : 50 €) :
  seule la carte classique s'affiche.
- Verifier l'**eligibilite metier** SQY Ping pour chaque prestataire active.
- Ajouter les **mentions CGV** requises par le(s) prestataire(s) BNPL retenu(s)
  (retractation, refus = annulation possible, etc.).

## Test de bout en bout

1. Demarrer l'application :

```bash
npm run dev
```

2. Demarrer Stripe CLI :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Demander un paiement depuis `/club/demandes-adhesion`.
4. Ouvrir le lien Stripe envoye par e-mail.
5. Utiliser une carte de test Stripe, par exemple :

```text
4242 4242 4242 4242
```

avec une date future, un CVC quelconque et un code postal quelconque.

6. Verifier que le dossier passe au statut `Payé` / `paid`.
7. Sur `/club/mes-inscriptions`, utiliser **Télécharger la facture** (API
   `GET /api/club/registration/[id]/invoice`, lien PDF ou page Stripe).
   Accès : **admin**, **secrétariat**, ou **soumettant** du dossier (`submitterUid`).
