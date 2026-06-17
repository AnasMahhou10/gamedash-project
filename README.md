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
- Anas MAHHO

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

### Produit / UX

Bloc fonctionnel porte par Anas :

- parcours mobile first plus pousse
- mise en avant des maps et createurs
- notifications in-app
- saisons competitives
- saisons / recompenses createurs
- choix de l'architecture AWS adaptee :
  - backend : EC2 / ECS / Fargate / Lambda
  - base de donnees : RDS PostgreSQL ou MySQL
  - frontend : S3 + CloudFront
  - stockage de fichiers / maps : S3
- configuration de l'infrastructure reseau :
  - VPC, sous-reseaux publics / prives
  - security groups pour l'API, la base de donnees et les services
- preparation de la base de donnees :
  - creation de l'instance RDS
  - configuration des acces
  - execution des migrations SQL / SQLAlchemy
- gestion des secrets et de la configuration :
  - AWS Secrets Manager ou Parameter Store
  - variables d'environnement pour le backend et le frontend
- deploiement du backend :
  - containerisation de l'application ou packaging de l'API
  - lancement sur ECS / Fargate ou EC2
  - configuration d'un load balancer si necessaire
- deploiement du frontend :
  - build du site React
  - publication dans S3
  - distribution avec CloudFront
- configuration du domaine et du HTTPS :
  - Route 53 pour le DNS
  - certificat ACM pour TLS
- mise en place CI/CD :
  - pipeline GitHub Actions / CodePipeline
  - build, tests et deploiement automatique
- logs et monitoring :
  - CloudWatch logs et metriques
  - alarmes de disponibilite et d'erreurs
- tests en staging :
  - verification des flux map / test, matchmaking et profil
  - validation ELO / MMR / coins / victoires avant production

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
