# TeamUp - Application de gestion d'équipes de ping-pong

Application Next.js pour la gestion des équipes, joueurs, compositions et disponibilités du club SQY Ping.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ et npm
- Compte Firebase
- Compte Discord (pour l'intégration Discord)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/votre-org/teamup.git
cd teamup

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos valeurs

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000).

## 📚 Documentation

### Guides de configuration

- **[Configuration Firebase Dev](./docs/SETUP_DEV_FIREBASE.md)** : Créer et configurer un projet Firebase pour le développement
- **[Configuration Discord](./docs/DISCORD.md)** : Configuration complète de l'intégration Discord
- **[Configuration GitHub Actions](./.github/workflows/SETUP.md)** : Configuration des workflows CI/CD

### Documentation technique

- **[Workflow Git/GitHub](./.github/GIT_WORKFLOW.md)** : Workflow de développement et déploiement
- **[Règles de statut des matchs](./docs/technical/MATCH_STATUS_RULES.md)** : Règles de gestion de l'affichage du statut des matchs
- **[Suppression de code mort](./docs/technical/DEAD_CODE_REMOVAL.md)** : Documentation des suppressions de code mort
- **[Tests de non-régression](./docs/technical/TESTS_NON_REGRESSION.md)** : Checklist des tests de non-régression

### Firebase Functions

- **[README Functions](./functions/README.md)** : Documentation des Firebase Functions

## 🛠️ Scripts disponibles

```bash
# Développement
npm run dev              # Lancer le serveur de développement
npm run check:dev        # Lint + type-check (sans build)
npm run check            # Lint + type-check + build

# Discord
npm run discord:register-command  # Enregistrer les commandes slash Discord

# Build
npm run build            # Build de production
npm run start            # Démarrer le serveur de production
```

## 📁 Structure du projet

```
teamup/
├── src/
│   ├── app/              # Pages Next.js (App Router)
│   ├── components/       # Composants React
│   ├── lib/             # Utilitaires et services
│   ├── hooks/           # Hooks React personnalisés
│   └── types/           # Types TypeScript
├── docs/                # Documentation
│   ├── technical/       # Documentation technique
│   └── ...
├── functions/           # Firebase Functions
├── .github/            # Configuration GitHub Actions
│   └── workflows/      # Workflows CI/CD
└── ...
```

## 🔐 Variables d'environnement

Voir `.env.example` pour la liste complète des variables d'environnement requises.

## 🚢 Déploiement

Le déploiement se fait automatiquement via GitHub Actions lors d'un merge sur `main`.

Voir [Configuration GitHub Actions](./.github/workflows/SETUP.md) pour plus de détails.

## 📝 Contribution

Voir [Workflow Git/GitHub](./.github/GIT_WORKFLOW.md) pour les règles de contribution.

## 📄 Licence

[À définir]

