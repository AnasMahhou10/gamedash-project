# Backend GameDash

Le backend GameDash est une API FastAPI qui gere l'authentification, le matchmaking, la progression, les analytics, le backoffice admin et le module UGC maps.

## Lancer le backend

Depuis le dossier `backend` :

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

API disponible par defaut sur :

```text
http://127.0.0.1:8000
```

## Configuration

Le backend charge ses variables depuis `.env`.

Variables importantes :

- `DATABASE_URL`
- `SECRET_KEY`
- `FRONTEND_URL`
- `BACKEND_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM`
- `MAIL_SERVER`
- `MAIL_PORT`

## Architecture du backend

```text
backend/
|-- app/
|   |-- core/
|   |-- models/
|   |-- routes/
|   |-- schemas/
|   |-- utils/
|   |-- config.py
|   |-- database.py
|   `-- main.py
`-- README.md
```

## Dossiers principaux

### `app/core`

Composants transverses du backend.

- `dependencies.py` : dependances FastAPI, auth user courant, admin guard
- `security.py` : JWT, hash/password helpers
- `google.py` : integration OAuth Google
- `mail.py` : envoi d'emails SMTP
- `reset_tokens.py` : tokens de reset password
- `ws_manager.py` : gestion des connexions WebSocket

### `app/models`

Modeles SQLAlchemy.

Principaux modeles :

- `user.py` : joueur, profil, statuts, progression, MMR
- `queue.py` : file de matchmaking
- `match.py` : matches, resultats, gains MMR/XP
- `matchmaking_settings.py` : configuration matchmaking
- `rank_settings.py` : seuils des rangs
- `reward_settings.py` : regles de recompenses
- `virtual_transaction.py` : revenus virtuels / journaux de gains
- `sanction_log.py` : historique de sanctions admin

Modele UGC maps :

- `map.py`
- `map_version.py`
- `map_vote.py`
- `map_comment.py`
- `map_favorite.py`
- `map_playtest.py`
- `map_report.py`
- `map_tag.py`

### `app/routes`

Routes API par domaine.

- `auth.py` : inscription, login, Google OAuth, forgot/reset password, `/me`
- `user.py` : profil joueur, edition, suppression de compte
- `matchmaking.py` : join/leave queue, historique, ELO history, resultats, finish match
- `matchmaking_ws.py` : websocket stats + statut joueur + infos competitives
- `dashboard.py` : leaderboard, rank distribution, quests, winrate, summary joueur
- `maps.py` : publication et exploitation des maps communautaires
- `admin.py` : backoffice studio, moderation, stats, sanctions, settings

### `app/schemas`

Schemas Pydantic.

- `user.py` : payloads auth et profil

### `app/utils`

Logique metier reutilisable.

- `rank.py` : calcul du rang, des divisions et du mapping MMR -> rank
- `progression.py` : XP, niveaux, progression compte

## Particularites du backend

- `database.py` appelle `ensure_schema()` pour ajouter certaines colonnes automatiquement si elles n'existent pas encore
- `main.py` cree aussi les tables via `Base.metadata.create_all(bind=engine)`
- le matchmaking supporte plusieurs modes et un monitoring temps reel minimal

## Domaines fonctionnels couverts

### Authentification

- email / mot de passe
- JWT
- Google OAuth
- reset password email

### Matchmaking / Competition

- files `ranked`, `unranked`, `fun`
- etats joueur
- creation de match pour la scene Unity `Game`
- historique, MMR, rank, divisions
- leaderboard
- winrate
- quetes

### Backoffice

- KPIs globaux
- matchs par jour
- distribution des rangs
- revenus virtuels
- moderation utilisateurs
- historique des sanctions
- parametres live ops

### UGC Maps

- publication
- votes
- favoris
- commentaires
- tests dans Unity via la scene `MapTest`
- signalements
- stats createurs
- moderation admin

### Integration Unity

Le backend fournit les donnees consommees par Unity :

- `/matchmaking/current` retourne le match courant pour la scene `Game`
- `/matchmaking/finish` cloture le match et applique progression / recompenses
- `/maps/{map_id}` retourne le contenu d'une map publiee pour la scene `MapTest`
- `/maps/test` enregistre les resultats d'un test de map

Le lancement de Unity est declenche cote frontend via `gamedash://match` ou `gamedash://testmap`.

## Documentation complementaire
Document disponible :

- [matchmaking-algorithm.md](https://github.com/loziamina/gamedash-project/blob/main/docs/matchmaking-algorithm.md)

## Recommandations d'exploitation

- redemarrer le backend apres ajout de nouvelles colonnes/tables pour laisser `create_all()` et `ensure_schema()` s'executer
- verifier les variables Google/Gmail avant de tester OAuth ou reset password
- utiliser PostgreSQL pour rester coherent avec la configuration du projet

## Liens utiles

- README racine : [README.md](https://github.com/loziamina/gamedash-project/blob/main/README.md)
- Frontend : [frontend/README.md](https://github.com/loziamina/gamedash-project/blob/main/frontend/README.md)
