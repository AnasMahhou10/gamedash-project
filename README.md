# GameDash

GameDash est une plateforme web gaming orientee competition, progression et contenu communautaire.

Le projet permet :

- aux joueurs de creer et gerer leur compte
- de rejoindre un matchmaking multi-modes
- de suivre leur MMR, leur rang, leur niveau et leur historique
- d'explorer et publier des maps communautaires
- au studio de piloter un backoffice admin avec analytics, moderation et configuration live
- UX mobile first et notifications in-app
- mise en avant des maps et createurs
- saisons competitives et recompenses createurs
- boutique / economie virtuelle / inventaire

## Equipe projet

Projet realise par :

- Amina LOZI
- Mariya ABBAKIL
- Anas MAHHOU

## Fonctionnalites principales

Bloc fonctionnel porte par Amina:

- authentification email / mot de passe
- login Google OAuth
- reset password par email Gmail
- profil joueur complet avec avatar, bio, region, langue et preferences matchmaking
- matchmaking multi-files : `ranked`, `unranked`, `fun`
- gestion des etats joueurs : `online`, `queue`, `in_game`
- historique de matchs avec filtres et details enrichis
- systeme de MMR, rangs et divisions
- progression compte : XP, niveau, monnaie virtuelle, quetes
- dashboard joueur avec analytics competitives
- admin panel avec monitoring, sanctions, reglages MMR/rangs/recompenses
- module maps / UGC avec versions, votes, favoris, commentaires, tests, signalements
- boutique / economie virtuelle / inventaire

### Produit / UX

Bloc fonctionnel porte par Anas :

- parcours mobile first plus pousse
- mise en avant des maps et createurs
- notifications in-app
- saisons competitives
- saisons / recompenses createurs
- AWS publication

### Unity

Bloc fonctionnel porte par Mariya:

- Création du jeu réel sous Unity
- Développement de la base du jeu dans Unity.
- Mise en place de l’environnement jouable.
- Intégration des mécaniques principales du jeu.
- Préparation du projet Unity pour être connecté au reste de la plateforme.
- Création des maps
- Conception et création des maps dans Unity.
- Mise en place des éléments nécessaires à la navigation dans les maps.
- Gestion des paramètres propres à chaque map.
- Génération d’un fichier JSON contenant les informations de la map créée.
- Création des objets
- Création des objets utilisables dans le jeu.
- Intégration des objets dans l’environnement Unity.
- Préparation des objets pour qu’ils puissent être équipés ou utilisés par les joueurs.
- Association des objets aux fonctionnalités d’inventaire et d’équipement.
- Mise en place du lien entre le frontend et Unity
- Connexion entre l’interface frontend et le projet Unity.
- Transmission des données entre le frontend et Unity.
- Récupération du JSON généré lors de la création d’une map.
- Utilisation de ce JSON dans la partie Community Maps pour permettre au joueur de recréer sa propre map avec les paramètres définis.
- pass de saison
- inventaire
- equiper des objets
- journal des transactions
- reglages economie cote admin


## Stack technique

- Frontend : React, Vite, Tailwind CSS, Recharts, Framer Motion
- Backend : FastAPI, SQLAlchemy, PostgreSQL, WebSocket, JWT
- Auth : JWT, Google OAuth, SMTP Gmail

## Structure du projet

```text
gamedash-project/
|-- backend/
|-- frontend/
|-- docs/
`-- README.md
```

## Lancer le projet

### 1. Cloner le projet

```bash
git clone <repo-url>
cd gamedash-project
```

### 2. Lancer le backend

Depuis le dossier `backend` :

```bash
cd backend
python -m venv venv or py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Le backend demarre par defaut sur :

```text
http://127.0.0.1:8000
```

### 3. Lancer le frontend

Depuis le dossier `frontend` :

```bash
cd frontend
npm install
npm run dev
```

Le frontend demarre par defaut sur :

```text
http://localhost:5173
```

## Variables d'environnement

Le backend utilise notamment :

- `DATABASE_URL`
- `SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FRONTEND_URL`
- `BACKEND_URL`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM`
- `MAIL_SERVER`
- `MAIL_PORT`

## Documentation

La documentation projet est centralisee dans le dossier [docs](https://github.com/loziamina/gamedash-project/blob/main/docs).

Document deja present :

- [matchmaking-algorithm.md](https://github.com/loziamina/gamedash-project/blob/main/docs/matchmaking-algorithm.md)
- [boutique-economie.md](https://github.com/loziamina/gamedash-project/blob/main/docs/boutique-economie.md)

## README par couche

- Frontend : [frontend/README.md](https://github.com/loziamina/gamedash-project/blob/main/frontend/README.md)
- Backend : [backend/README.md](https://github.com/loziamina/gamedash-project/blob/main/backend/README.md)

## Demonstration rapide

Parcours conseille pour une demo :

1. creer un compte ou se connecter avec Google
2. completer le profil joueur
3. lancer un match en `ranked` puis en `fun`
4. consulter le dashboard, l'historique et la courbe ELO
5. creer une map communautaire avec captures
6. tester, voter et commenter la map
7. ouvrir l'admin panel pour voir les KPIs, la moderation et les reglages
