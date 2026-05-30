# Guide PDF — Parcours d'inscription club

## Fichier livrable

- **`Guide-Inscription-Club-SQY-Ping.pdf`** — documentation complète avec captures d'écran.

## Régénérer le PDF

```bash
# Captures authentifiées (Mes inscriptions + Demandes d'adhésion)
node scripts/capture-club-guide-auth-screenshots.mjs

# Assemblage du PDF
node scripts/generate-club-registration-guide-pdf.mjs
```

**Prérequis** : Google Chrome, `npm run dev` sur le port 3000, `.env.local` avec Firebase Admin (`GOOGLE_APPLICATION_CREDENTIALS` ou `FB_*`), et `puppeteer-core` installé.

Le script de capture se connecte via un token Admin (premier compte `admin` / `secretary` dans Firestore, ou `CLUB_GUIDE_UID`).

## Contenu

- Parcours wizard (6/7 étapes), tarif, brouillon local
- Page Mes inscriptions (suivi, paiement, facture)
- Page Demandes d'adhésion (secrétariat, Stripe)
