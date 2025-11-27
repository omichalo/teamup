# Tests de non-régression - Modifications sécurité et améliorations

## 📋 Checklist de validation

### 🔐 1. Authentification et sessions

#### 1.1 Création de session (`POST /api/session`)
- [ ] **Test normal** : Connexion avec un token Firebase valide → Cookie créé avec `SameSite=strict` en prod, `lax` en dev
- [ ] **Test erreur 400** : Token manquant → Message d'erreur clair
- [ ] **Test erreur 401** : Token expiré → Message "Token expired"
- [ ] **Test erreur 401** : Token invalide → Message "Invalid token"
- [ ] **Test erreur 403** : Email non vérifié → Message approprié
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
- [ ] **Vérification cookie** : Cookie `__session` avec `httpOnly: true`, `secure: true` en prod

#### 1.2 Vérification de session (`GET /api/session/verify`)
- [ ] **Test normal** : Cookie valide → Retourne les données utilisateur
- [ ] **Test sans cookie** : Pas de cookie → Retourne `{ user: null }`
- [ ] **Test cookie invalide** : Cookie expiré → Retourne `{ user: null }`
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store`

#### 1.3 Déconnexion (`DELETE /api/session`)
- [ ] **Test normal** : Déconnexion réussie → Cookie supprimé, tokens révoqués
- [ ] **Vérification cookie** : Cookie supprimé avec mêmes paramètres que création (SameSite, Secure)
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store`
- [ ] **Test après déconnexion** : Tentative d'accès avec ancien cookie → 401

#### 1.4 Token Firebase (`POST /api/session/firebase-token`)
- [ ] **Test normal** : Génération de token → Token valide retourné
- [ ] **Test CSRF** : Requête sans origine valide → 403 "Invalid origin"
- [ ] **Test GET** : Méthode GET → 405 Method Not Allowed (si implémenté)

---

### 📧 2. Envoi d'emails (Rate limiting et validation)

#### 2.1 Envoi email de vérification (`POST /api/auth/send-verification`)
- [ ] **Test normal** : Email valide → Email envoyé, réponse 200
- [ ] **Test erreur 400** : Format email invalide → Message "Format d'email invalide"
- [ ] **Test erreur 400** : Email manquant → Message "Email requis"
- [ ] **Test erreur 404** : Utilisateur non trouvé → Message "Utilisateur non trouvé"
- [ ] **Test rate limiting** : 4 requêtes rapides avec même email → 3ème OK, 4ème → 429 "Trop de requêtes"
- [ ] **Test rate limiting** : Message 429 contient temps d'attente
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store`
- [ ] **Test logs** : Vérifier que les logs sensibles (liens) ne sont pas affichés en production

#### 2.2 Réinitialisation mot de passe (`POST /api/auth/send-password-reset`)
- [ ] **Test normal** : Email valide → Email envoyé, réponse 200 (même si utilisateur n'existe pas - sécurité)
- [ ] **Test erreur 400** : Format email invalide → Message "Format d'email invalide"
- [ ] **Test rate limiting** : 4 requêtes rapides → 3ème OK, 4ème → 429
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store`
- [ ] **Test logs** : Vérifier que les liens de reset ne sont pas loggés en production

---

### 👥 3. Gestion des utilisateurs et rôles

#### 3.1 Liste des utilisateurs (`GET /api/admin/users`)
- [ ] **Test admin** : Admin connecté → Liste complète des utilisateurs (pagination testée)
- [ ] **Test coach** : Coach connecté → 403 "Accès refusé"
- [ ] **Test joueur** : Joueur connecté → 403 "Accès refusé"
- [ ] **Test non authentifié** : Pas de session → 401
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store`
- [ ] **Test pagination** : Vérifier que tous les utilisateurs sont récupérés (> 1000 si applicable)

#### 3.2 Modification de rôle (`POST /api/admin/users/set-role`)
- [ ] **Test admin** : Admin modifie un rôle → Succès, audit log créé
- [ ] **Test CSRF** : Requête sans origine valide → 403 "Invalid origin"
- [ ] **Test coach** : Coach tente de modifier → 403 "Accès refusé"
- [ ] **Test joueur** : Joueur tente de modifier → 403 "Accès refusé"
- [ ] **Test erreur 400** : Paramètres invalides → Message d'erreur clair
- [ ] **Vérification audit log** : Vérifier que l'action est loggée avec masquage des données sensibles
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store`

#### 3.3 Demande coach (`PATCH /api/admin/users/coach-request`)
- [ ] **Test admin** : Admin approuve une demande → Succès, audit log créé
- [ ] **Test admin** : Admin rejette une demande → Succès, audit log créé
- [ ] **Test CSRF** : Requête sans origine valide → 403
- [ ] **Test coach** : Coach tente d'approuver → 403
- [ ] **Vérification audit log** : Vérifier que les messages sont masqués dans les logs
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store`

---

### 🔄 4. Synchronisation de données

#### 4.1 Synchronisation joueurs (`POST /api/admin/sync-players`)
- [ ] **Test admin** : Admin lance la sync → Succès, audit log créé
- [ ] **Test CSRF** : Requête sans origine valide → 403
- [ ] **Test coach** : Coach tente de lancer → 403
- [ ] **Vérification audit log** : Vérifier que la sync est loggée
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store`

#### 4.2 Synchronisation équipes (`POST /api/admin/sync-teams`)
- [ ] **Test admin** : Admin lance la sync → Succès, audit log créé
- [ ] **Test CSRF** : Requête sans origine valide → 403
- [ ] **Vérification audit log** : Vérifier que la sync est loggée avec détails (nombre d'équipes)
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store`

#### 4.3 Synchronisation matchs (`POST /api/admin/sync-team-matches`)
- [ ] **Test admin** : Admin lance la sync → Succès, audit log créé
- [ ] **Test CSRF** : Requête sans origine valide → 403
- [ ] **Vérification audit log** : Vérifier que la sync est loggée
- [ ] **Vérification headers** : Réponse contient `Cache-Control: no-store`

---

### 🏆 5. Équipes et matchs

#### 5.1 Liste des équipes (`GET /api/teams`)
- [ ] **Test admin** : Admin accède → Liste des équipes
- [ ] **Test coach** : Coach accède → Liste des équipes
- [ ] **Test joueur** : Joueur accède → 403 "Accès refusé"
- [ ] **Test non authentifié** : Pas de session → 401

#### 5.2 Matchs d'une équipe (`GET /api/teams/[teamId]/matches`)
- [ ] **Test admin** : Admin accède → Liste des matchs
- [ ] **Test coach** : Coach accède → Liste des matchs
- [ ] **Test joueur** : Joueur accède → 403
- [ ] **Test non authentifié** : Pas de session → 401

---

### 💬 6. Discord

#### 6.1 Canaux Discord (`GET /api/discord/channels`)
- [ ] **Test admin** : Admin accède → Liste des canaux avec hiérarchie
- [ ] **Test coach** : Coach accède → Liste des canaux
- [ ] **Test joueur** : Joueur accède → 403
- [ ] **Test logs** : Vérifier qu'aucun log verbeux n'expose la liste complète des canaux

#### 6.2 Vérification message envoyé (`GET /api/discord/check-message-sent`)
- [ ] **Test admin** : Admin vérifie → Statut du message
- [ ] **Test coach** : Coach vérifie → Statut du message
- [ ] **Test joueur** : Joueur vérifie → 403
- [ ] **Test validation** : Plus de 50 teamIds → 400 "Le nombre de teamIds doit être entre 1 et 50"
- [ ] **Test validation** : Format teamId invalide → 400 avec détails

#### 6.3 Lien licence (`POST /api/discord/link-license`)
- [ ] **Test normal** : Secret valide → Association réussie
- [ ] **Test erreur 401** : Secret manquant → 401 "Non autorisé"
- [ ] **Test erreur 401** : Secret invalide → 401 "Non autorisé"
- [ ] **Test erreur 500** : Secret non configuré → 500 avec message approprié

---

### 🛡️ 7. Protection CSRF

#### 7.1 Routes protégées CSRF
- [ ] **Toutes les mutations admin** : POST/PATCH/DELETE sans origine valide → 403
- [ ] **Routes testées** :
  - [ ] `/api/admin/users/set-role` (POST)
  - [ ] `/api/admin/users/coach-request` (PATCH)
  - [ ] `/api/admin/sync-players` (POST)
  - [ ] `/api/admin/sync-teams` (POST)
  - [ ] `/api/admin/sync-team-matches` (POST)
  - [ ] `/api/admin/locations` (POST, DELETE)
  - [ ] `/api/session/firebase-token` (POST)

---

### 📝 8. Audit logging

#### 8.1 Vérification des logs d'audit
- [ ] **Modification de rôle** : Vérifier que l'action est loggée avec format JSON structuré
- [ ] **Approbation coach** : Vérifier que l'action est loggée
- [ ] **Rejet coach** : Vérifier que l'action est loggée
- [ ] **Synchronisations** : Vérifier que chaque sync est loggée
- [ ] **Masquage données** : Vérifier que les emails/tokens sont masqués (ex: `ab***@domain.com`)
- [ ] **Format logs** : Vérifier le format `[AUDIT] {"action": "...", "actor": "...", ...}`

---

### 🔍 9. Logs conditionnels

#### 9.1 Vérification des logs en production
- [ ] **Firebase Admin init** : Vérifier qu'aucun chemin de service account n'est loggé
- [ ] **Envoi emails** : Vérifier qu'aucun lien de reset/vérification n'est loggé
- [ ] **Variables env** : Vérifier qu'aucune variable d'environnement complète n'est loggée
- [ ] **Mode debug** : En dev avec `DEBUG=true`, vérifier que les logs de debug apparaissent

---

### 🍪 10. Cookies et headers

#### 10.1 Configuration des cookies
- [ ] **Création session** : Cookie avec `SameSite=strict` en prod, `lax` en dev
- [ ] **Création session** : Cookie avec `secure=true` en prod
- [ ] **Suppression session** : Cookie supprimé avec mêmes paramètres
- [ ] **Cohérence** : Vérifier que création et suppression utilisent les mêmes paramètres

#### 10.2 Headers Cache-Control
- [ ] **Routes sensibles** : Toutes les routes suivantes ont `Cache-Control: no-store` :
  - [ ] `/api/session/*`
  - [ ] `/api/auth/*`
  - [ ] `/api/admin/*`
- [ ] **Headers complets** : Vérifier présence de `Pragma: no-cache` et `Expires: 0`

---

### 🎭 11. Cohérence client/serveur

#### 11.1 Vérification des rôles
- [ ] **Page admin** : UI protégée par `AuthGuard` avec `[ADMIN]` → API vérifie `[ADMIN]` uniquement
- [ ] **Page compositions** : UI protégée par `AuthGuard` avec `[ADMIN, COACH]` → API vérifie `[ADMIN, COACH]`
- [ ] **Page disponibilités** : UI protégée par `AuthGuard` avec `[ADMIN, COACH]` → API vérifie `[ADMIN, COACH]`
- [ ] **Page équipes** : UI protégée par `AuthGuard` avec `[ADMIN, COACH]` → API vérifie `[ADMIN, COACH]`
- [ ] **Page joueurs** : UI protégée par `AuthGuard` avec `[ADMIN, COACH]` → API vérifie `[ADMIN, COACH]`

---

### ⚡ 12. Performance et limites

#### 12.1 Rate limiting
- [ ] **Email vérification** : 3 requêtes OK, 4ème → 429
- [ ] **Password reset** : 3 requêtes OK, 4ème → 429
- [ ] **Attente** : Après 15 minutes, nouvelle requête OK

#### 12.2 Validation d'entrée
- [ ] **Emails** : Format invalide rejeté avec message clair
- [ ] **TeamIds** : Plus de 50 rejeté
- [ ] **TeamIds** : Format invalide rejeté

---

## 🧪 Tests automatisés recommandés

### Tests unitaires à créer
```typescript
// src/__tests__/api/auth/rate-limit.test.ts
describe('Rate Limiting', () => {
  it('should allow requests within limit', () => {});
  it('should block requests exceeding limit', () => {});
  it('should reset after window expires', () => {});
});

// src/__tests__/api/auth/audit-logger.test.ts
describe('Audit Logging', () => {
  it('should mask sensitive data in logs', () => {});
  it('should log actions with correct format', () => {});
});

// src/__tests__/api/admin/roles.test.ts
describe('Role-based Access Control', () => {
  it('should allow admin on admin routes', () => {});
  it('should deny coach on admin routes', () => {});
  it('should allow coach on coach/admin routes', () => {});
});
```

### Tests d'intégration à créer
```typescript
// src/__tests__/integration/csrf.test.ts
describe('CSRF Protection', () => {
  it('should reject mutations without valid origin', () => {});
  it('should allow mutations with valid origin', () => {});
});

// src/__tests__/integration/session.test.ts
describe('Session Management', () => {
  it('should create secure cookies', () => {});
  it('should revoke tokens on logout', () => {});
  it('should set Cache-Control headers', () => {});
});
```

---

## ✅ Checklist finale

- [ ] Tous les tests manuels passent
- [ ] Aucune régression fonctionnelle détectée
- [ ] Les logs d'audit sont créés correctement
- [ ] Les données sensibles sont masquées dans les logs
- [ ] Les headers de sécurité sont présents
- [ ] Les cookies sont configurés correctement
- [ ] Le rate limiting fonctionne
- [ ] La protection CSRF fonctionne
- [ ] La cohérence client/serveur est respectée
- [ ] Le code passe `npm run check` (lint + type-check + build)

---

## 📝 Notes

- **Environnement de test** : Tester en développement ET en production (ou simulation prod)
- **Données de test** : Utiliser des comptes de test avec différents rôles
- **Logs** : Vérifier les logs console ET les logs d'audit
- **Performance** : Vérifier que le rate limiting ne bloque pas les utilisateurs légitimes

