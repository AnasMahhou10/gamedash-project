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
- Anas Mahhou

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
- module maps / UGC avec votes, favoris, commentaires, tests Unity et signalements

### Produit / UX et deploiement Azure

Bloc fonctionnel porte par Anas Mahhou : refonte **mobile first** du frontend React, industrialisation de la configuration multi-environnement, et **mise en production complete** sur Microsoft Azure (infra + CI/CD + debugging prod).

#### UX mobile first (frontend)

**Architecture UI**

- refonte de la navigation autour de 3 composants dedies :
  - `MobileNav.jsx` : barre inferieure fixe (5 onglets) avec detection d'onglet actif sur plusieurs routes (`/dashboard`, `/history`, `/elo`, `/maps`, `/my-maps`, `/store`, `/checkout`, etc.)
  - `AppLayout.jsx` : shell global (header sticky, zone contenu, footer nav) avec chargement utilisateur via `getMe()`
  - `ProtectedLayout.jsx` : wrapper des routes authentifiees
- integration dans le routeur (`App.jsx`) pour unifier toutes les pages joueur sous le meme layout responsive
- header compact avec `UserMenu`, logo GameDash et fond glassmorphism (`backdrop-blur`) adapte aux ecrans etroits

**Pages adaptees mobile**

- `Dashboard.jsx` : cartes stats, graphiques Recharts et actions rapides reorganises en colonne sur mobile
- `Matchmaking.jsx` : files ranked / unranked / fun, etat queue et WebSocket temps reel
- `Maps.jsx` / `MyMaps.jsx` : grilles de cartes UGC lisibles au pouce
- `Store.jsx` / `Profile.jsx` / `History.jsx` / `EloGraph.jsx` : espacements, typographie et scroll vertical optimises
- `Game.jsx` : connexion WebSocket in-game depuis l'URL API de prod (`wss://`)

**Principes UX retenus**

- **mobile first** : conception depuis 320px, puis breakpoints Tailwind `sm` / `lg`
- navigation principale accessible au pouce (barre basse, zones tactiles genereuses)
- pas d'application native : strategie **PWA-ready** via web responsive uniquement
- coherence visuelle avec le design system existant (Tailwind, Framer Motion, palette cyan/slate)

#### Centralisation de la configuration API (frontend)

Avant le deploiement, l'API etait hardcodee en `localhost:8000` dans chaque service. Refactoring complet :

- creation de `frontend/src/config.js` comme **point unique** de configuration :
  - `API_URL` via `VITE_API_URL` (fallback dev `127.0.0.1:8000`)
  - `getWebSocketUrl()` : conversion automatique `http→ws` / `https→wss` pour matchmaking et parties live
  - utilitaires de diagnostic : `logAppConfig`, `fetchWithLog`, `logError`
- migration de **tous les services** vers `config.js` :
  - `api.js`, `dashboard.js`, `matchmaking.js`, `match.js`, `game.js`, `maps.js`, `elo.js`, `shop.js`, `admin.js`
- migration des pages auth et gameplay : `Login.jsx`, `Register.jsx`, `Dashboard.jsx`, `Matchmaking.jsx`, `Game.jsx`
- boot log au demarrage dans `main.jsx` pour tracer la config en production
- fichier `frontend/.env.example` documente la variable `VITE_API_URL` pour les devs

#### Deploiement Microsoft Azure

**Contexte et contraintes**

- abonnement **Azure for Students** : politique de regions limitant le deploiement a `italynorth`, `polandcentral`, `germanywestcentral`, `swedencentral`, `uaenorth`
- tentative initiale **Azure Static Web Apps** abandonnee (regions SWA indisponibles sur l'abonnement etudiant)
- **Plan B retenu** : deux App Services Linux dans le meme plan partage `ASP-rggamedash-aac0`, groupe de ressources `rg-gamedash`, region **Italy North**

**Infrastructure provisionnee**

| Ressource | Nom | Role |
|-----------|-----|------|
| PostgreSQL Flexible Server | `gamedash.postgres.database.azure.com` | Base de donnees production |
| App Service (Linux) | `gamedash-api-anas` | API FastAPI Python 3.11 |
| App Service (Linux) | `gamedash-web-anas` | Frontend React (build Vite) |
| Application Insights | lie aux deux App Services | Traces et metriques Azure |

**Backend API (`gamedash-api-anas`)**

- runtime Python 3.11 sur App Service Linux
- commande de demarrage : `gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000`
- ajout de `gunicorn==23.0.0` dans `backend/requirements.txt` pour servir FastAPI + WebSockets en prod
- variables d'environnement : `DATABASE_URL`, `FRONTEND_URL`, `BACKEND_URL`, secrets JWT / OAuth / SMTP
- firewall PostgreSQL configure pour autoriser les IP Azure App Service

**Frontend web (`gamedash-web-anas`)**

- runtime **Node.js 22 LTS**
- build Vite en CI avec `VITE_API_URL` injecte au moment du `npm run build`
- script de demarrage dedie `frontend/scripts/start-azure.mjs` :
  - lecture du port Azure (`PORT` / `WEBSITES_PORT`, defaut 8080)
  - verification de `dist/index.html` avant lancement
  - logs de diagnostic (version Node, presence de `dist`, `serve`)
  - serving SPA via `serve -s dist` (fallback routing React Router)
- dependance `serve` ajoutee dans `package.json`, script `"start": "node scripts/start-azure.mjs"`
- App Settings Azure : `WEBSITES_PORT=8080`, `VITE_API_URL`, `SCM_DO_BUILD_DURING_DEPLOYMENT=true`, **Always On** active (plan B1)

**Authentification de deploiement (OIDC)**

- Publish Profile desactive (Basic Auth off) → bascule vers **OpenID Connect** GitHub ↔ Azure
- creation d'une identite federee Azure AD par App Service
- secrets GitHub Actions generes automatiquement par Azure (noms exacts avec suffixes UUID) :
  - frontend : `AZUREAPPSERVICE_CLIENTID_0CFADCCAE69C4661AD3D59ACFEF5BFB6`, etc.
  - backend : secrets dedies `gamedash-api-anas`
- permissions workflow : `id-token: write` pour le job deploy

#### CI/CD GitHub Actions

**Backend** — `.github/workflows/main_gamedash-api-anas.yml`

- declenchement : push `main` + `workflow_dispatch`
- job `build` : checkout, venv Python 3.11, `pip install -r backend/requirements.txt`, upload artifact
- job `deploy` : `azure/login@v2` (OIDC) + `azure/webapps-deploy@v3` vers `gamedash-api-anas`

**Frontend** — `.github/workflows/main_gamedash-web-anas.yml`

- declenchement : push `main` sur `frontend/**` ou le workflow + `workflow_dispatch`
- job `build` : Node 22, cache npm, `npm ci` + `npm run build` avec `VITE_API_URL` pointant vers l'API Azure
- upload artifact du dossier `frontend/` complet (`dist` + scripts + `package.json`)
- job `deploy` : login OIDC + deploiement ZIP vers `gamedash-web-anas`

**Repository de deploiement** : [AnasMahhou10/gamedash-project](https://github.com/AnasMahhou10/gamedash-project) (fork dedie au deploiement Azure, synchronise avec le repo equipe `loziamina/gamedash-project`)

#### Incidents resolus en production (debugging)

| Probleme | Cause | Resolution |
|----------|-------|------------|
| Frontend appelle `127.0.0.1:8000` en prod | `VITE_API_URL` absent au build | Injection en CI + App Setting Azure + refacto `config.js` |
| Erreur 503 Application Error (frontend) | `serve` / port / Always Off | Script `start-azure.mjs`, `WEBSITES_PORT=8080`, Always On |
| Echec login OIDC GitHub Actions | Mauvais noms de secrets | Alignement exact des suffixes `AZUREAPPSERVICE_*` depuis GitHub |
| ZIP Deploy frontend trop lourd | `node_modules` inclus | Artifact build CI + `npm ci` cote runner, pas en prod |
| WebSocket matchmaking en prod | URL `ws://localhost` | `getWebSocketUrl()` avec bascule `wss://` automatique |

#### URLs de production

- **Frontend** : `https://gamedash-web-anas-f0gkfwgrcmdyf6at.italynorth-01.azurewebsites.net`
- **Backend API** : `https://gamedash-api-anas-dmh6dafyeaemfjhj.italynorth-01.azurewebsites.net`
- **Swagger / OpenAPI** : `/docs` sur l'URL backend
- **WebSockets** : `wss://gamedash-api-anas-.../ws/...` (matchmaking, parties live)

#### Fichiers cles modifies / crees

```text
frontend/src/config.js                    # config API + WebSocket + logs
frontend/scripts/start-azure.mjs          # demarrage App Service
frontend/.env.example                     # doc VITE_API_URL
frontend/src/components/MobileNav.jsx     # nav mobile
frontend/src/components/AppLayout.jsx     # layout global
frontend/src/components/ProtectedLayout.jsx
frontend/src/services/*.js                # 9 services migres
frontend/package.json                     # start Azure + serve
backend/requirements.txt                  # + gunicorn
.github/workflows/main_gamedash-api-anas.yml
.github/workflows/main_gamedash-web-anas.yml
```

### Boutique / Economie

Bloc fonctionnel porte par Mariya:

- soft currency
- hard currency
- boutique
- packs
- pass de saison
- inventaire
- equiper des objets
- journal des transactions
- paiement simule Stripe / PayPal
- reglages economie cote admin

## Stack technique

- Frontend : React, Vite, Tailwind CSS, Recharts, Framer Motion
- Backend : FastAPI, SQLAlchemy, PostgreSQL, WebSocket, JWT
- Client jeu : Unity, scenes `Game` et `MapTest`
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
python -m venv venv
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

### 4. Lancer Unity via deeplink

Le front peut ouvrir Unity avec le protocole `gamedash://` :

- matchmaking : `gamedash://match` ouvre la scene `Game`
- test de map communautaire : `gamedash://testmap` ouvre la scene `MapTest`

Pour l'activer :

1. build le projet Unity `unity-client/GameDash`
2. genere un `GameDash.exe`
3. modifie `unity-setup/register_deeplink.bat` avec le chemin du `.exe`
4. execute le script en administrateur

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
4. ouvrir Unity sur la scene `Game`
5. consulter le dashboard, l'historique et la courbe ELO
6. creer une map communautaire avec captures
7. tester la map dans Unity avec `MapTest`
8. voter et commenter la map
9. ouvrir l'admin panel pour voir les KPIs, la moderation et les reglages
