# OpenChessGuessr

Mini-jeu mobile (web app pour Safari, installable sur l'écran d'accueil) : une position d'ouverture s'affiche, il faut trouver son nom parmi quatre propositions.

## Pages

- **Jouer** : choix du répertoire (Top 25, 50, 100, 250, 500 ou toutes les ouvertures, classées par popularité sur Lichess) et de la difficulté (progressive, facile, moyenne, difficile).
- **Partie** : les coups sont joués depuis la position de départ, puis la question est posée (on peut passer l'animation). 10 positions, 100 / 200 / 300 pts selon le niveau, série jusqu'à x2. Après la réponse, relecture des coups et comparaison avec les autres propositions.
- **Classement** : meilleures parties, records par réglage, dernières parties (sur l'appareil).
- **Catalogue** : les 2 772 ouvertures groupées par famille, avec réussites, erreurs et confusions pour chacune. Recherche, filtres « vues », « à revoir », « jamais vues », et fiche avec relecture de la ligne.

Direction artistique : noir, blanc, touches de beige et de gris. Les états se lisent par les motifs (plein = réussi, hachuré = raté ; pointillé, hachuré, plein = facile, moyen, difficile).

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
- Pièces : jeu « Caliente » par [avi](https://github.com/avi-0/caliente) (CC BY-NC-SA 4.0), via Lichess.
- Polices : Instrument Serif, Inter Tight, JetBrains Mono (SIL Open Font License).
