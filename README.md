# Horizon — Minuteur

Application web légère : **chrono**, **minuteur** et **compte à rebours**, avec interface liquid glass inspirée des dernières interfaces Apple.

## Fonctionnalités

- **Chrono** — chronomètre avec centièmes, tours enregistrés dans le stockage local du navigateur (meilleur / pire tour mis en évidence)
- **Minuteur** — durées rapides (1 à 30 min) ou réglage personnalisé
- **Compte à rebours** — décompte visuel avec anneau de progression
- **Stockage local** — tours du chrono et préférences (thème, dernières durées), sans base de données
- **Thème** — sombre, clair ou automatique
- **Raccourcis** — Espace (start/pause), L (tour), R (reset), 1/2/3 (changer de mode)
- **Gestes** — balayage horizontal pour changer de mode sur mobile

## Accès en ligne (GitHub Pages)

**https://bugeddy-cmyk.github.io/outilsPerso/**

Le chrono s’ouvre directement — c’est l’onglet actif par défaut.

## Lancer en local

```bash
# Python
python3 -m http.server 8080

# ou Node
npx serve .
```

Ouvrir [http://localhost:8080](http://localhost:8080)

## Structure

```
index.html
css/app.css
js/
  app.js        — navigation, thème, raccourcis
  chrono.js     — chronomètre + tours
  minuteur.js   — minuteur
  countdown.js  — compte à rebours
  storage.js    — localStorage
  utils.js      — formatage, son, vibration
```
