# Documentation Technique GameDash

## 1. Vue d'ensemble

GameDash est une plateforme web gaming composee de deux couches principales :

- un frontend React/Vite pour l'experience utilisateur
- un backend FastAPI/SQLAlchemy pour la logique metier, la persistance et l'API
- un client Unity pour la scene de jeu et le test des maps communautaires

Le projet couvre trois grands domaines :

- experience joueur
- competition / matchmaking / progression
- contenu communautaire et backoffice studio

Deux axes complementaires sont aussi integres au cadre fonctionnel du projet :

- produit / UX avancee
- boutique / economie virtuelle

## 2. Architecture generale

```text
Frontend React/Vite
    |
    | HTTP / WebSocket
    v
Backend FastAPI
    |
    v
PostgreSQL

Frontend React/Vite
    |
    | deeplink gamedash://
    v
Client Unity
```

## 3. Architecture frontend

Le frontend est organise dans `frontend/src` avec trois zones principales :

- `pages/` : ecrans de l'application
- `components/` : composants reutilisables
- `services/` : appels API et acces aux endpoints

### Pages principales

- `Login.jsx`
- `Register.jsx`
- `Profile.jsx`
- `Dashboard.jsx`
- `Matchmaking.jsx`
- `Game.jsx`
- `History.jsx`
- `EloGraph.jsx`
- `Maps.jsx`
- `Admin.jsx`

### Composants

- `UserMenu.jsx`
- `BackToDashboardButton.jsx`
- `PageWrapper.jsx`

### Services

- `api.js`
- `matchmaking.js`
- `game.js`
- `match.js`
- `elo.js`
- `dashboard.js`
- `maps.js`
- `admin.js`

## 4. Architecture backend

Le backend est organise dans `backend/app` :

- `core/` : securite, dependances, Google OAuth, mail, WebSocket
- `models/` : modeles SQLAlchemy
- `routes/` : endpoints FastAPI
- `schemas/` : schemas Pydantic
- `utils/` : logique metier reutilisable

### Fichiers centraux

- `main.py` : point d'entree FastAPI
- `database.py` : connexion base et gestion schema
- `config.py` : configuration applicative

## 5. Modules fonctionnels

### Authentification

- inscription / connexion email + mot de passe
- JWT
- login Google OAuth
- reset password par email
- route `/auth/me`

### Profil joueur

- pseudo
- avatar
- bio
- region
- langue
- preferences matchmaking
- suppression de compte

### Matchmaking et competition

- files `ranked`, `unranked`, `fun`
- etats joueur `online`, `queue`, `in_game`
- creation de match
- ouverture de la scene Unity `Game` via deeplink `gamedash://match`
- calcul MMR
- historique de matchs
- progression ELO / MMR
- leaderboard
- rangs + divisions

### Progression

- XP apres match
- niveau
- monnaie virtuelle
- quetes quotidiennes / hebdomadaires

### Produit / UX

- navigation gaming coherente
- retour dashboard sur les pages connectees
- feedback utilisateur avec notifications in-app
- mise en avant des maps et createurs dans les interfaces communautaires
- base exploitable pour une experience mobile first plus poussee
- base exploitable pour des saisons competitives et saisons createurs

### Boutique / Economie

Le domaine economie du cahier des charges inclut :

- soft currency
- hard currency
- boutique
- packs
- pass de saison
- inventaire
- equipement d'objets
- journal des transactions
- paiement simule Stripe / PayPal
- reglages economie cote admin

Dans l'etat actuel du projet, la base economie comprend deja :

- monnaie virtuelle
- recompenses parametrees cote admin
- transactions virtuelles

Le reste constitue une extension naturelle du projet, identifiee comme bloc fonctionnel porte par Mariya.

### Maps communautaires

- publication de map
- upload de contenu
- captures d'ecran
- votes
- favoris
- commentaires
- tests dans Unity via deeplink `gamedash://testmap`
- signalements
- stats createur

### Integration Unity

Le projet distingue deux flux Unity :

- `gamedash://match` : lance la scene Unity `Game` pour un match issu du matchmaking. Cette scene correspond au gameplay par defaut cree dans Unity.
- `gamedash://testmap` : lance la scene Unity `MapTest` pour charger et tester une map communautaire publiee depuis le web.

Le protocole Windows `gamedash://` doit pointer vers le build Unity `GameDash.exe`. Il est enregistre avec le script `unity-setup/register_deeplink.bat` apres avoir genere le build Unity.

Exemples de deeplinks :

```text
gamedash://match?match_id=50&opponent=7&mode=ranked&token=<jwt>
gamedash://testmap?map_id=9&token=<jwt>
```

Le matchmaking ne choisit pas automatiquement une map communautaire : il lance la scene de jeu par defaut. Les maps publiees servent au hub communautaire et au test Unity.

### Backoffice admin

- KPIs globaux
- monitoring matchmaking
- reglages MMR / rangs
- reglages recompenses
- reglages economie
- moderation utilisateurs
- historique sanctions
- moderation maps
- analytics maps

## 6. Base de donnees

Les principales entites sont :

- `User`
- `QueuePlayer`
- `Match`
- `MatchmakingSettings`
- `RankSettings`
- `RewardSettings`
- `VirtualTransaction`
- `SanctionLog`
- `Map`
- `MapVersion`
- `MapVote`
- `MapFavorite`
- `MapComment`
- `MapPlaytest`
- `MapReport`
- `MapTag`

## 7. API

### Routes principales

- `/auth/*`
- `/users/*`
- `/matchmaking/*`
- `/dashboard/*`
- `/maps/*`
- `/admin/*`
- `/ws/matchmaking`

## 8. Temps reel

Le temps reel est implemente via WebSocket pour :

- stats de connexion
- etat joueur
- informations de matchmaking
- notification `match_found`

## 9. Choix techniques

- FastAPI pour une API rapide et lisible
- SQLAlchemy pour l'ORM
- PostgreSQL comme base relationnelle
- React/Vite pour la rapidite de developpement frontend
- Recharts pour les visualisations
- Framer Motion pour les transitions

## 10. Responsabilites fonctionnelles identifiees

Exemple de repartition lisible pour la soutenance :

- competition / matchmaking / MMR
- UX frontend joueur
- backoffice et visualisation des donnees
- boutique / economie virtuelle avec Mariya
- maps communautaires / UGC

## 11. Demarrage technique

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Unity

1. Ouvrir `unity-client/GameDash` dans Unity.
2. Verifier que les scenes `Login`, `Lobby`, `Queue`, `Game`, `Results`, `MapEditor` et `MapTest` sont dans les Build Settings.
3. Generer un build Windows, par exemple dans `unity-client/GameDash/Build`.
4. Modifier `unity-setup/register_deeplink.bat` pour pointer vers `GameDash.exe`.
5. Executer le script en administrateur pour enregistrer `gamedash://`.

## 12. Documents lies

- [matchmaking-algorithm.md](https://github.com/loziamina/gamedash-project/blob/main/docs/matchmaking-algorithm.md)
- [plan-securite-conformite.md](https://github.com/loziamina/gamedash-project/blob/main/docs/plan-securite-conformite.md)
- [guide-utilisateur.md](https://github.com/loziamina/gamedash-project/blob/main/docs/guide-utilisateur.md)
- [boutique-economie.md](https://github.com/loziamina/gamedash-project/blob/main/docs/boutique-economie.md)
- [Partie matchmaking.docs](https://github.com/loziamina/gamedash-project/blob/main/docs/Partie matchmaking.docs)