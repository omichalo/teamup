# TeamUp — instructions agents

Ce fichier est un point d’entrée portable. La source de vérité détaillée reste `.cursor/rules/`; ne duplique pas ces règles ici.

## Workflow par défaut

- Respecter l’architecture existante et produire le plus petit diff sûr répondant au besoin.
- Utiliser TypeScript strict et les abstractions déjà présentes avant d’en créer de nouvelles.
- Pendant le développement : `npm run check:dev`.
- Avant de considérer le travail terminé ou prêt à pousser : `npm run check`.
- Ne jamais utiliser `--no-verify`, laisser de `TODO` dans le code livré, ni pousser directement sur `main` ou `staging`.
- Flux Git : branche dédiée → PR vers `staging` → release `staging` vers `main`.

## Contexte à charger

- Les règles `.cursor/rules/*.mdc` sont scopées par fichiers ou chargées par l’agent selon leur description.
- Pour une feature verticale TeamUp (adhésion, paiement, présence, API, nouvelle collection), utiliser le skill `.agents/skills/teamup-feature-slice/SKILL.md`.
- Pour une revue indépendante, déléguer à `teamup-reviewer`.
- Pour valider tests et quality gates, déléguer à `teamup-verifier`.

## Références

- `docs/QUALITY_GATES.md`
- `docs/SECURITY.md`
- `.github/GIT_WORKFLOW.md`
