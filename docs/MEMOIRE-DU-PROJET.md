# Mémoire du projet Concours

Dernière mise à jour : 21 octobre 2026

Ce document conserve les choix validés avec le propriétaire de l’application. Il doit être relu avant toute évolution importante et complété au fil des décisions.

## Principes généraux

- L’application doit organiser aussi bien les concours de **belote** que les concours de **boules**.
- Deux formules sont disponibles : **Poules qualificatives + tableau final** et **Rondes Aurard adaptées + tableau final**.
- Un concours accepte jusqu’à **256 équipes inscrites**.
- Toute modification fonctionnelle de la version connectée doit aussi être étudiée pour le mode essai afin de conserver la même présentation et le même fonctionnement.
- Le mode essai ne sauvegarde aucune donnée.
- Les actions qui nécessitent des données durables peuvent rester indisponibles en mode essai. C’est notamment le cas de l’exportation et de la suppression d’un ancien concours.
- Les modifications sont d’abord réalisées et contrôlées en local. La mise en ligne est faite lorsque le propriétaire la demande.
- La publication peut être effectuée directement par Vercel depuis le projet relié, sans dépendre de Git ni des outils développeur Xcode.
- L’environnement macOS dispose actuellement d’environ 10 Go libres, alors que l’installation des outils développeur en demande environ 23,74 Go : ne pas la relancer sans avoir libéré suffisamment d’espace.

## Synchronisation et mise en ligne

Le dépôt de référence est le clone GitHub situé dans :
`/Users/fb/Documents/GitHub/web_app_concours`.

### Avant de commencer sur un Mac

1. Ouvrir GitHub Desktop et sélectionner le dépôt `web_app_concours`.
2. Cliquer sur **Fetch origin**, puis sur **Pull origin** pour récupérer les derniers changements.
3. Vérifier que le travail se fait bien dans le clone GitHub ci-dessus, et non dans une ancienne copie locale.
4. Ne jamais lire, copier, afficher ou publier `.env` ou `.env.local`.

### Après une modification

1. Contrôler l'application en local et vérifier les tests concernés.
2. Dans GitHub Desktop, relire la liste des fichiers modifiés et retirer les fichiers temporaires ou les vidéos de test qui ne doivent pas être publiés.
3. Saisir un message de commit explicite, puis cliquer sur **Commit**.
4. Cliquer sur **Push origin**.

Le projet Vercel `web-app-concours` est relié au dépôt GitHub. La branche de production actuelle est `claude/project-review-x5q6dp` : un push sur cette branche déclenche le déploiement Vercel. Après le push, vérifier dans Vercel que le déploiement est **Ready**, puis contrôler le site public :
`https://web-app-concours.vercel.app/`.

Pour travailler sur l'autre Mac, refaire simplement **Fetch origin**, puis **Pull origin** avant toute nouvelle modification. Les vidéos de test ne doivent pas être ajoutées au dépôt ni au déploiement.

## Belote et boules

- La création d’un concours distingue deux réglages :
  - la **discipline** : Belote ou Boules ;
  - la **formule du concours** : Poules qualificatives ou Rondes Aurard adaptées.
- Les scores automatiques sont adaptés à la discipline :
  - **Belote : 2 000 à 1 000** pour une victoire d’office ;
  - **Boules : 13 à 7**, conformément à l’article 78 du règlement national FFSB.
- La saisie des scores indique l’objectif correspondant à la discipline : 2 000 points à la belote ou 13 points aux boules.
- Pour les concours de boules, l’application doit au minimum prévoir les **doublettes** et les **triplettes**. Le tête-à-tête pourra également être proposé.
- Les affiches et les règles présentées sont adaptées à la discipline choisie.
- Les inscriptions, tirages, rondes, classements, tableaux finaux et exports utilisent une base commune aux deux disciplines.
- Ces choix doivent également être reproduits dans le mode essai.

## Version connectée

- Le tableau de bord permet de créer et d’ouvrir un concours.
- La création et les inscriptions acceptent jusqu’à **256 équipes par concours**. Les concours existants conservent leur propre plafond enregistré.
- Chaque ancien concours possède une action **« Supprimer »**.
- La suppression demande une confirmation explicite.
- La confirmation précise que les équipes, les résultats et toutes les autres données du concours seront supprimés définitivement.
- Aucun dossier d’archives n’est prévu.

## Mode essai

- Le mode essai reprend autant que possible l’esthétique, les rubriques et le contenu de l’application connectée.
- Le formulaire d’inscription propose le choix **Boules** ou **Belote** avant le lancement du concours. Ce choix adapte les libellés, le barème des scores, le classement, les règles et l’aperçu de l’affiche.
- Il permet de démontrer les **Poules qualificatives** et les **Rondes Aurard adaptées**, y compris le choix du nombre de rondes et de la taille du tableau final.
- Il applique le même plafond de **256 équipes**, sans sauvegarder les données.
- Les inscriptions comprennent les noms des deux joueurs, le statut du paiement et le contact facultatif.
- Le tirage, les feuilles de match, le classement, les qualifiés et le tableau final reproduisent le fonctionnement principal.
- Les cinq formats d’export sont visibles mais désactivés.
- L’affiche, le QR code et le formulaire de contact sont présentés comme des démonstrations non modifiables.
- Aucune action **« Supprimer un concours »** n’est ajoutée dans ce mode puisque les données ne sont pas sauvegardées.

## Rondes Aurard adaptées

L’organisateur choisit entre :

1. **Poules qualificatives + élimination directe**.
2. **Rondes Aurard adaptées**, avec plusieurs rondes et un classement général.

La formule retenue s’appuie sur le règlement de la Fédération Française du Sport-Boules : toutes les équipes jouent pendant la phase de rondes, un nouveau tirage est produit après chaque partie ou ronde et les rencontres déjà jouées sont évitées autant que possible. Elle se termine par un tableau final dont la taille dépend du nombre d’inscrites ou du choix de l’organisateur. Le démarrage progressif à 50 % des résultats permet aux équipes disponibles de commencer la ronde suivante sans attendre les dernières parties.

### Réglages proposés à l’organisateur

- Nombre de parties par équipe : **2, 3 ou 4 rondes**.
- Trois rondes sont recommandées pour obtenir un classement plus fiable.
- Mode de tirage : **aléatoire**, conformément au principe de l’article 78.
- Fin du concours : **classement suivi d’un tableau final**.
- La version connectée utilise un **démarrage progressif à 50 %** : seules les équipes qui ont terminé leur partie précédente peuvent apparaître dans la vague suivante.

### Génération des rencontres

- Une équipe doit avoir terminé sa partie précédente avant de rejouer.
- Une équipe ne peut pas avoir plus d’une ronde d’avance sur les autres.
- L’algorithme évite qu’une équipe rencontre deux fois le même adversaire.
- Les adversaires disponibles sont tirés au sort après chaque partie ou étape de génération.
- Avec un nombre impair d’équipes, une équipe est déclarée exempte et obtient une victoire d’office sur le score de **2 000 à 1 000 à la belote** ou **13 à 7 aux boules**. Une même équipe ne doit pas être exemptée deux fois tant que les autres ne l’ont pas été.
- Avec le démarrage progressif, la ronde suivante peut commencer lorsque la moitié des résultats de la ronde en cours est saisie et qu’au moins deux équipes compatibles sont disponibles.

### Classement Aurard

Le classement actuellement appliqué utilise cet ordre :

1. nombre de parties gagnées ;
2. plus grand nombre de points marqués ;
3. meilleure différence de points ;
4. numéro d’inscription, afin de conserver un ordre stable si les critères précédents sont encore identiques.

Le total des points marqués passe donc avant la différence générale. Les critères de classement ne sont pas modifiés par le réglage du tableau final.

### Tableau final des Rondes

- Il faut au moins **6 équipes inscrites** et toutes les rondes prévues doivent être terminées avant de lancer le tableau final.
- La proposition automatique dépend du nombre d’équipes inscrites :
  - **6 à 15 équipes** : 4 qualifiées, départ en demi-finales ;
  - **16 à 32 équipes** : 8 qualifiées, départ en quarts de finale ;
  - **33 à 64 équipes** : 16 qualifiées, départ en huitièmes de finale ;
  - **65 à 128 équipes** : 32 qualifiées, départ en seizièmes de finale ;
  - **129 à 256 équipes** : 64 qualifiées, départ en trente-deuxièmes de finale.
- Le seuil 128/129 est volontaire : 128 inscrites donnent une proposition de 32 qualifiées, tandis que 129 inscrites donnent une proposition de 64 qualifiées.
- Avant la première ronde, l’organisateur peut choisir **4, 8, 16, 32 ou 64 qualifiées**, à condition que le nombre choisi soit strictement inférieur au nombre d’équipes inscrites. Les tableaux à 128 ou 256 places ne sont pas proposés.
- Tant que la première ronde n’est pas lancée, la proposition automatique suit le nombre d’inscrites. Un choix manuel reste sélectionné tant qu’il est valide. Après un retrait qui le rend invalide, l’organisateur doit choisir à nouveau.
- La taille retenue est figée et enregistrée au lancement de la première ronde. Les premières équipes du classement existant sont qualifiées.
- Pour chaque taille proposée, l’interface indique le premier tour, le nombre de matchs de ce tour et le nombre total de matchs éliminatoires. Aucune durée n’est estimée sans connaître la durée des parties et le nombre de terrains.
- Deux rondes offrent un format rapide, mais produisent davantage d’égalités. Trois ou quatre rondes donnent un classement plus fiable.
- Les concours dont les rondes avaient déjà commencé avant cette évolution conservent l’ancienne règle en l’absence de choix explicite : **4 qualifiées pour 6 à 8 inscrites et 8 qualifiées à partir de 9**.
- Un tableau final déjà créé reste intact.

### Tableau final des Poules

- La formule **Poules qualificatives** conserve un tableau final fixe de **8 places**, avec un départ en quarts de finale.
- La hausse du plafond à 256 équipes et le réglage Aurard ne changent ni ses qualifications ni sa logique de compétition.

## Distinction importante

Le **système Aurard** ne doit pas être confondu avec une **poule de quatre avec barrage**.

Dans une poule de quatre avec barrage, les gagnants se rencontrent, les perdants se rencontrent, puis les deux équipes à une victoire jouent un barrage. Le système Aurard retenu ici organise plusieurs rondes pour l’ensemble des équipes et établit un classement général.

## Références conservées

- `docs/regles/FF Boules.pdf` : règlement sportif de référence pour le Sport-Boules.
- Fédération Française de Belote, règles officielles : https://www.ffbelote.org/wp-content/uploads/2016/01/regles-officielles-de-la-Belote-27-01-2016.pdf
- Fédération Française de Belote, points destinés aux organisateurs : https://www.ffbelote.org/wp-content/uploads/2016/01/Points-cles-des-regles-officielles-a-expliquer-par-les-organisateurs.pdf
- Fédération Française de Belote, charte des clubs : https://www.ffbelote.org/wp-content/uploads/2015/10/CHARTE-FFB-AVEC-LES-CLUBS-v3.pdf

## Décisions restant à prendre

- Déterminer si d’autres critères de départage doivent compléter l’ordre actuel avant le numéro d’inscription.
- Définir précisément le score et les critères à employer pour la belote dans le classement Aurard.
