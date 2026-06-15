# Guide Utilisateur GameDash

## 1. Introduction

GameDash est une plateforme web qui permet aux joueurs de :

- creer un compte
- rejoindre des matchs
- suivre leur progression
- explorer des maps communautaires
- interagir avec le contenu UGC

Un espace admin permet aussi au studio de suivre l'activite et de configurer le systeme.

Le perimetre complet du projet inclut egalement :

- une orientation UX gaming avec navigation fluide et notifications in-app
- la mise en avant des maps et createurs
- une base pour des saisons competitives
- un domaine boutique / economie virtuelle

## 2. Connexion et inscription

### Creer un compte

1. Ouvrir l'application
2. Aller sur la page d'inscription
3. Renseigner pseudo, email et mot de passe
4. Valider l'inscription

### Se connecter

Deux options :

- connexion classique email / mot de passe
- connexion avec Google

### Mot de passe oublie

1. Cliquer sur `Mot de passe oublie`
2. Entrer son email
3. Ouvrir l'email recu
4. Cliquer sur le lien
5. Definir un nouveau mot de passe

## 3. Profil joueur

Depuis le menu utilisateur, il est possible de :

- acceder au profil
- importer un avatar
- modifier le pseudo
- ajouter une bio
- renseigner la region
- renseigner la langue
- definir des preferences matchmaking
- supprimer le compte

## 4. Dashboard

Le dashboard affiche :

- etat du joueur
- MMR
- rang
- niveau
- XP
- monnaie
- winrate
- leaderboard
- distribution des rangs
- quetes

Le dashboard est pense comme base d'une UX plus riche avec :

- parcours mobile first
- insights competitifs
- saisons et progression continue

Depuis le dashboard, on peut acceder a :

- matchmaking
- historique
- progression ELO
- maps communautaires
- admin panel pour les admins

## 5. Matchmaking

Le joueur peut choisir un mode :

- `Classe`
- `Non classe`
- `Fun`

Ensuite :

1. selectionner un mode
2. cliquer sur rejoindre la file
3. attendre l'appariement
4. etre redirige vers la session de jeu web
5. ouvrir Unity avec le bouton `Ouvrir Unity` ou `Relancer Unity`

Le systeme affiche aussi :

- etat joueur
- parametres matchmaking actifs
- vue des files en cours

## 6. Session de jeu

Dans la page `Game` :

- le match est affiche avec l'adversaire
- la scene Unity `Game` peut etre lancee via `Ouvrir Unity`
- le joueur peut simuler une victoire ou une defaite
- a la fin, le systeme met a jour :
  - le MMR
  - l'historique
  - l'XP
  - la progression

## 7. Historique

La page historique permet de :

- filtrer par mode
- filtrer par periode
- rechercher un joueur
- consulter :
  - resultat
  - duree
  - gain / perte MMR
  - XP gagnee
  - details du match

## 8. Progression ELO

La page ELO permet de :

- choisir un mode
- afficher la courbe MMR correspondante
- suivre l'evolution competitive du compte

## 9. Maps communautaires

Depuis `Maps`, un joueur peut :

- rechercher des maps
- filtrer par tag, statut ou auteur
- publier une map
- ajouter des captures d'ecran
- importer un contenu map
- voter
- mettre en favori
- commenter
- lancer un test dans Unity
- signaler une map

Chaque map affiche :

- score
- likes
- favoris
- tests
- note moyenne
- retention
- stats createur

Le bouton `Test` ouvre Unity sur la scene `MapTest`. La map publiee est recuperee depuis l'API, decodee, puis reconstruite dans Unity pour etre testee.

Le matchmaking et les maps communautaires sont separes :

- matchmaking : ouvre la scene Unity `Game` par defaut
- test de map : ouvre la scene Unity `MapTest` avec la map selectionnee

Le hub communautaire sert aussi a :

- mettre en avant les createurs
- faire remonter les maps en croissance
- poser les bases de futures recompenses createurs et saisons UGC

## 10. Boutique et economie

Le cahier des charges prevoit aussi un espace economie / boutique, porte fonctionnellement par Mariya, avec :

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

Dans l'etat actuel de l'application, la base economie visible pour l'utilisateur repose deja sur :

- la monnaie virtuelle
- les gains apres match
- la progression

Cette partie est prevue pour etre etendue vers une vraie boutique complete.

## 11. Admin panel

Un administrateur peut :

- consulter les KPIs globaux
- voir les matchs par jour
- consulter les revenus virtuels
- suivre la distribution des rangs
- regler le matchmaking
- regler les seuils de rang
- regler les recompenses
- regler l'economie
- surveiller les files de jeu
- bannir / debannir un utilisateur
- consulter les sanctions
- moderer les maps

## 12. Navigation

Sur les pages connectees, un bouton `Retour Dashboard` est disponible pour faciliter le parcours utilisateur.

Le menu utilisateur permet aussi :

- acces profil
- deconnexion

## 13. Conseils de demonstration

Pour une demonstration complete :

1. se connecter
2. montrer le dashboard
3. lancer un match
4. ouvrir la scene Unity `Game`
5. terminer le match
6. ouvrir l'historique
7. montrer la courbe ELO
8. creer une map
9. tester la map dans Unity via `MapTest`
10. commenter / voter la map
11. ouvrir l'admin panel

## 14. Documentation detaillee boutique

Pour une description detaillee du module economie, consulter :

- [boutique-economie.md](https://github.com/loziamina/gamedash-project/blob/main/docs/boutique-economie.md)
