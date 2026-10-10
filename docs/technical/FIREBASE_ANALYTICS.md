# Firebase Analytics (mesure d’audience)

TeamUp utilise **Google Analytics for Firebase** (GA4) uniquement après **consentement explicite** de l’utilisateur (bandeau Accepter / Refuser). Sans consentement ou sans `measurementId`, aucun SDK Analytics n’est chargé.

## Activation console (manuel)

À faire sur **chaque** projet Firebase (`sqyping-teamup` et `sqyping-teamup-dev`) :

1. [Firebase Console](https://console.firebase.google.com/) → projet → **Project settings** → onglet **Integrations** / **Google Analytics**, ou via l’app Web.
2. Activer / lier Google Analytics pour l’application Web TeamUp.
3. Dans **Project settings** → **Your apps** → app Web → noter le **`measurementId`** (`G-XXXXXXXX`).

## Variables d’environnement

| Variable | Où | Rôle |
|----------|-----|------|
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `.env.local`, `apphosting.yaml`, `apphosting.staging.yaml` | Identifiant GA4 ; absent ou vide = no-op |

Valeur actuelle (prod + staging App Hosting) : `G-C1QLGYZYRQ` dans :

- [`apphosting.yaml`](../../apphosting.yaml) (production)
- [`apphosting.staging.yaml`](../../apphosting.staging.yaml) (staging)

Après modification : redéployer App Hosting (merge sur `staging` / `main`).

Localement, ajouter la même variable dans `.env.local` (voir [SETUP_DEV_FIREBASE.md](../SETUP_DEV_FIREBASE.md)).

## Comportement applicatif

- Consentement stocké en `localStorage` (`teamup_analytics_consent` : `granted` | `denied`).
- Page d’information : `/confidentialite`.
- Événements v1 : `page_view` uniquement (pas d’événements métier).

## Vérification

1. Accepter le bandeau → DebugView GA4 / Firebase DebugView : `page_view` à la navigation.
2. Refuser → aucun trafic Analytics (pas de chargement du SDK).
