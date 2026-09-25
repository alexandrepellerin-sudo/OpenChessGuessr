# OpenChessGuessr

Mini-jeu mobile (web app pour Safari, installable sur l'écran d'accueil) : une position d'ouverture s'affiche, il faut trouver son nom parmi quatre propositions.

## Jouer

- 10 positions par partie : 4 faciles (100 pts), 3 moyennes (200 pts), 3 difficiles (300 pts).
- Répertoire au choix : Top 50, Top 150, Top 500 ou toutes les ouvertures (classées par popularité sur Lichess).
- Difficulté : plus l'ouverture est rare et la position profonde, plus c'est dur. Les mauvaises réponses se rapprochent aussi (même famille, mêmes premiers coups).
- Série : x0,25 par bonne réponse d'affilée, jusqu'à x2.
- Après chaque réponse : relecture des coups, et comparaison avec les lignes des autres propositions.
- Records et historique enregistrés sur l'appareil (localStorage).

Sur iPhone : ouvrir l'URL dans Safari → Partager → « Sur l'écran d'accueil ». L'app fonctionne ensuite hors ligne.

## Développement

Aucun build : HTML/CSS/JS natifs (modules ES).

```bash
npm run serve        # http://localhost:8000
```

### Mettre à jour les données

```bash
npm install
scripts/count-openings.sh 2026-08 2000000   # compte les ouvertures sur 2 M de parties Lichess du mois
npm run data                                # régénère data/openings.json
```

Pense à incrémenter `CACHE` dans `sw.js` après une mise à jour pour que les téléphones récupèrent la nouvelle version.

## Sources

- Noms et coups : [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0).
- Popularité : [base de parties Lichess](https://database.lichess.org) (CC0), août 2026, 2 millions de parties.
- Pièces : jeu « cburnett » de Colin M.L. Burnett (CC BY-SA 3.0), via Lichess.
