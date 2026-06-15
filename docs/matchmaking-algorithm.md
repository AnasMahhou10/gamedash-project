# Documentation Matchmaking GameDash

## Objectif

Le matchmaking GameDash a pour but de proposer un appariement simple, lisible et demonstrable pour la soutenance, tout en restant suffisamment proche d'un comportement produit.

Il couvre :

- plusieurs files de jeu
- prise en compte du MMR
- etat explicite des joueurs
- temps d'attente maximum
- configuration live depuis le backoffice admin

## Modes de jeu supportes

Le systeme gere trois files distinctes :

- `ranked`
- `unranked`
- `fun`

Chaque joueur ne peut etre present que dans une seule file d'attente active a la fois.

## Etats joueur

Chaque joueur possede un etat applicatif stocke dans le profil utilisateur :

- `online` : disponible hors file et hors partie
- `queue` : actuellement en file d'attente
- `in_game` : actuellement dans un match

Transitions principales :

1. connexion / retour au dashboard : `online`
2. `POST /matchmaking/join` : `queue`
3. match trouve : `in_game`
4. `POST /matchmaking/finish` ou sortie de file : `online`

## Parametres configurables cote admin

Le studio peut ajuster dynamiquement :

- `max_elo_gap`
- `max_wait_seconds`
- `team_size`
- activation ou desactivation des modes `ranked`, `unranked`, `fun`

Ces parametres sont exposes via :

- `GET /admin/matchmaking-settings`
- `PUT /admin/matchmaking-settings`

## Principe de l'algorithme

### 1. Separation par mode

L'appariement est realise mode par mode.

Un joueur en `ranked` ne peut etre matché qu'avec un autre joueur en `ranked`.

### 2. Recuperation des joueurs en attente

Pour un mode donne, on recupere les entrees de file avec :

- `status = waiting`
- meme `mode`
- tri par `joined_at ASC`

### 3. Evaluation des paires candidates

Pour chaque paire de joueurs possible :

- on calcule la difference d'ELO
- on calcule le temps d'attente de chacun
- on conserve le plus grand temps d'attente de la paire

### 4. Regle d'acceptation

Une paire est acceptee si au moins une des conditions suivantes est vraie :

- `elo_diff <= max_elo_gap`
- `longest_wait >= max_wait_seconds`

Cela permet :

- de privilegier les matchs equilibres quand la file est fournie
- d'eviter qu'un joueur attende trop longtemps quand la population est faible

### 5. Choix de la meilleure paire

Parmi les paires valides, on choisit celle avec le meilleur score :

`score = elo_diff - min(longest_wait, max_wait_seconds)`

Interpretation :

- plus l'ecart ELO est faible, meilleur est le score
- plus l'attente est longue, plus on assouplit la selection

Ce n'est pas un systeme Elo complet multi-contrainte, mais un compromis pedagogique simple a expliquer et a debugger.

## Cycle de vie d'un match

1. le joueur rejoint une file avec `mode`
2. le backend enregistre l'entree dans `queue_players`
3. le backend tente immediatement de construire une paire
4. si une paire valide existe :
   - creation d'un `Match`
   - passage des deux joueurs en `in_game`
   - envoi d'un evenement WebSocket `match_found`
   - redirection frontend vers `/game`
   - ouverture possible du client Unity via `gamedash://match`
5. a la fin du match :
   - mise a jour du resultat
   - mise a jour de l'ELO
   - passage des deux joueurs en `online`
   - nettoyage des entrees `matched`

## Integration Unity

Le matchmaking lance le gameplay Unity par defaut. Il ne selectionne pas une map communautaire.

Flux :

1. deux joueurs sont apparies
2. le frontend stocke les informations du match
3. la page `/game` propose d'ouvrir Unity
4. le deeplink `gamedash://match` transmet `match_id`, `opponent`, `mode` et le token JWT
5. Unity charge le profil joueur puis ouvre la scene `Game`

Les maps communautaires utilisent un flux distinct :

- `gamedash://testmap?map_id=<id>&token=<jwt>`
- scene Unity cible : `MapTest`
- objectif : tester une map publiee dans Community Maps

## Endpoints principaux

### Joueur

- `POST /matchmaking/join`
- `POST /matchmaking/leave`
- `GET /matchmaking/settings`
- `GET /matchmaking/queue-overview`
- `GET /matchmaking/history`
- `GET /matchmaking/elo-history`
- `POST /matchmaking/result`
- `POST /matchmaking/finish`

### Admin

- `GET /admin/matchmaking-settings`
- `PUT /admin/matchmaking-settings`
- `GET /admin/matchmaking-overview`

## Limites actuelles

Le systeme reste volontairement simple :

- MMR unique et non encore segmente par mode
- pas de parties equipees multi-joueurs
- pas de region ou ping dans le calcul
- pas de decay MMR
- pas de priorisation par premade / party

## Evolutions recommandees

Pour une V3 plus proche d'un vrai produit live ops :

- MMR par mode
- contraintes region / serveur / latence
- plages d'ELO progressives selon le temps d'attente
- support team size > 1
- historique filtre par mode et periode
- analytics admin sur temps d'attente moyen et qualite de match

Documentation Matchmaking

- [Partie matchmaking.docs](https://github.com/loziamina/gamedash-project/blob/main/docs/Partie matchmaking.docs)
