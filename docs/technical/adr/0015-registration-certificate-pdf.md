# ADR-0015: Attestation d’inscription PDF

## Statut

Accepté — 2026-10-03

## Contexte

Jusqu’ici, l’attestation d’inscription était produite hors TeamUp via un classeur
Excel (onglet Attestation + listing des encaissements). Le dossier porte déjà
`wantsRegistrationCertificate` et un suivi secrétariat
(`registrationCertificateFollowUpStatus`), sans génération de document.

Les justificatifs paiement (FAC / REC / situation / AID) utilisent PDFKit avec un
layout « pièce comptable ». L’attestation Excel est un **certificat** (logo
centré, prose, signature scannée, mentions sous-préfecture) — structure différente
du header/footer facture (tél/email, bloc destinataire, agrément APS).

## Décision

1. **PDF attestation** généré côté serveur (PDFKit), route
   `GET /api/club/registration/[id]/registration-certificate`.
2. **Disponibilité** : dossier **soldé** uniquement
   (`isRegistrationPaidRecord` + `remainingAmountCents <= 0` si bloc `payment`).
3. **Moyen de paiement affiché** : encaissement actif au **montant le plus élevé** ;
   égalité → le plus récent.
4. **Layout dédié** (pas `drawPaymentDocHeader` / `Footer`) : logo centré, texte
   Excel, signature importée
   (`public/club-registration/registration-certificate-signature.jpg`), pied avec
   déclaration sous-préfecture / SIRET / FFTT / site.
5. **Pas de n° de pièce** comptable ; **pas d’auto-update** du suivi
   « Attestation envoyée » au téléchargement.
6. **CTA** dans le bloc Justificatifs (fiche adhérent, Mes dossiers, suivi
   paiement) via `registrationCertificateAvailable`.

## Conséquences

- Identité attestation isolée (`REGISTRATION_CERTIFICATE_IDENTITY`) pour ne pas
  altérer FAC/REC.
- Asset signature versionné + tracing standalone / `next.config.ts`.
- Le suivi secrétariat manuel reste la source de vérité pour l’envoi.
