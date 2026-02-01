# Traces DEBUG_JOURNEES

Pour diagnostiquer les problèmes de numérotation des journées et d'affichage des dates (ex. journée 8 au lieu de 1, dates du samedi manquantes), des traces ont été ajoutées.

## Activation

### Sync (serveur)

Pour tracer le recalcul des journées pendant la synchronisation des matchs :

```bash
DEBUG_JOURNEES=true npm run dev
```

Puis lancer une sync via l'admin (ou l’API `/api/admin/sync-team-matches`). Les traces apparaissent dans le terminal du serveur.

### Affichage (client)

Pour tracer la construction des journées côté client (pages disponibilités / compositions) :

1. Ajouter dans `.env.local` :
   ```
   NEXT_PUBLIC_DEBUG_JOURNEES=true
   ```
2. Redémarrer le serveur (`npm run dev`)
3. Ouvrir la console du navigateur (F12 → Console)
4. Aller sur la page Disponibilités ou Compositions

## Sortie des traces

### Sync (`recalculateJourneesByDate`)

- Pour chaque groupe d’équipe : clé de groupement, nombre de matchs, phases présentes, plage de dates
- Pour les 5 premiers matchs de chaque groupe : date, phase, journee assignée

Permet de voir si des matchs Phase 1 et Phase 2 sont mélangés (même teamKey) ou si les journees sont correctement numérotées.

### Affichage (`buildJourneesByEpreuvePhaseDivision`)

- Par équipe : id, division, nombre de matchs, phases, journées, dates par journée
- Par (épreuve, phase, division) : liste des journées avec leurs dates

Permet de voir quelles divisions existent (M vs F séparés ?), quelles dates sont agrégées par journée, et quelle division est sélectionnée par défaut.
