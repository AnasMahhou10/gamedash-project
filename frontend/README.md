# Frontend GameDash

Le frontend GameDash est une application React/Vite orientee experience joueur et backoffice web gaming.

Il couvre :

- authentification et onboarding
- dashboard joueur
- matchmaking et game flow
- historique et progression competitive
- hub communautaire maps
- panel admin
- gestion des sanctions
- boutique

## Lancer le frontend

Depuis le dossier `frontend` :

```bash
npm install
npm run dev
```

Build de production :

```bash
npm run build
```

Serveur de dev par defaut :

```text
http://localhost:5173
```

## Architecture du dossier

```text
frontend/
|-- src/
|   |-- components/
|   |-- pages/
|   |-- services/
|   |-- App.jsx
|   |-- index.css
|   `-- main.jsx
|-- package.json
`-- README.md
```

## Organisation des dossiers

### `src/components`

Composants UI reutilisables.

- `BackToDashboardButton.jsx` : bouton commun de navigation retour dashboard
- `PageWrapper.jsx` : wrapper anime pour les transitions de pages
- `UserMenu.jsx` : menu utilisateur avec avatar, acces profil et deconnexion

### `src/pages`

Pages principales de l'application.

- `Login.jsx` : connexion email/password + entree Google
- `Register.jsx` : inscription
- `ForgotPassword.jsx` : demande de reinitialisation du mot de passe
- `ResetPassword.jsx` : page de redefintion du mot de passe
- `OAuthSuccess.jsx` : callback frontend apres login Google
- `Profile.jsx` : edition complete du profil joueur
- `Dashboard.jsx` : vue principale joueur avec statistiques, niveau, quetes et leaderboard
- `Matchmaking.jsx` : choix du mode de jeu, etat joueur, monitoring files
- `Game.jsx` : ecran de session de match, ouverture Unity et fin de partie
- `History.jsx` : historique des matchs avec filtres et details
- `EloGraph.jsx` : progression MMR / ELO par mode
- `Maps.jsx` : hub communautaire des maps et creator studio
- `Admin.jsx` : backoffice studio

### `src/services`

Couche d'acces API.

- `api.js` : auth, profil, compte
- `matchmaking.js` : file d'attente, overview matchmaking, settings joueur
- `game.js` : fin de match
- `match.js` : historique des matchs
- `elo.js` : historique ELO / MMR
- `dashboard.js` : leaderboard, summary, winrate, quests
- `maps.js` : maps, votes, favoris, tests Unity, signalements
- `admin.js` : backoffice, moderation, sanctions, reward settings, rank settings

## Fichiers racine importants

- `App.jsx` : declaration des routes React
- `main.jsx` : point d'entree React + toaster global
- `index.css` : styles globaux, ambiance et classes partagees

## Choix frontend

- React + Vite pour la rapidite de developpement
- Tailwind CSS pour le styling utilitaire
- Framer Motion pour les transitions
- Recharts pour les dashboards et KPIs
- React Hot Toast pour les feedbacks utilisateur

## Flux utilisateur principaux

### Auth

`Login` -> `Dashboard`

ou

`Google OAuth` -> `OAuthSuccess` -> `Dashboard`

### Matchmaking

`Dashboard` -> `Matchmaking` -> `Game` -> `Unity Game` -> `History` / `Dashboard`

### UGC maps

`Dashboard` -> `Maps` -> `Test` -> `Unity MapTest`

## Integration Unity

Le frontend ouvre Unity avec le protocole Windows `gamedash://` :

- `gamedash://match` depuis la page `Game`, pour lancer la scene Unity `Game`
- `gamedash://testmap` depuis `Maps`, pour tester une map publiee dans la scene Unity `MapTest`

Le protocole doit etre enregistre localement avec `unity-setup/register_deeplink.bat` apres avoir genere le build Unity `GameDash.exe`.

### Backoffice

`Dashboard` -> `Admin`

## Bonnes pratiques dans ce frontend

- separation claire entre pages et services
- composants reutilisables pour la navigation et la structure
- feedback utilisateur avec toasts
- navigation unifiee avec retour dashboard
- UI gaming coherente sur les pages connectees

## Points d'attention

- certaines grosses pages utilisent beaucoup de composants et de charts, donc le bundle reste assez lourd
- les uploads de captures/avatar/maps sont actuellement geres en `data URL`, pratique pour le MVP mais pas ideal pour une prod a grande echelle

## Liens utiles

- README racine : [README.md](https://github.com/loziamina/gamedash-project/blob/main/README.md)
- Backend : [backend/README.md](https://github.com/loziamina/gamedash-project/blob/main/backend/README.md)
- Documentation : [docs](https://github.com/loziamina/gamedash-project/blob/main/docs)
