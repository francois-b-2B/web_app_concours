# Stabilisation V1 — premier lot, 1er octobre 2026

## Décisions confirmées

- Le tableau final conserve **8 places** : les huit premières équipes du classement général jouent les quarts de finale, puis les demi-finales et la finale.
- La personnalisation de l'affiche devra être sauvegardée par concours en mode connecté. **À réaliser dans le lot suivant**, avec le stockage en base.
- Les modifications restent locales. Aucune publication demandée ou effectuée pour ce lot.

## Réalisé

- Ajout/retrait d'équipes bloqués après tirage, dans l'interface et dans les actions serveur.
- Noms, contacts et paiements restent modifiables ; effacer le contact d'une équipe fonctionne.
- En essai, corriger un nom met également à jour la liste de la poule et conserve les scores.
- Finales bloquées tant qu'un résultat de poule manque ou reste à égalité.
- Résultats des poules verrouillés après lancement des finales, avec explication.
- Correction d'un vainqueur : propagation du nouveau qualifié et remise à zéro des résultats dépendants uniquement. Confirmation requise si des scores doivent être effacés.
- Une correction qui conserve le même vainqueur ne touche pas les tours suivants.
- Le concours connecté repasse en phase finale si la finale n'a plus de vainqueur.
- Vérification des équipes attendues dans un formulaire de score pour éviter d'attribuer un ancien formulaire à de nouveaux participants.
- Les opérations de structure et de score prennent un verrou transactionnel sur le concours afin de sérialiser les écritures concurrentes.
- Formulaire de score partagé entre connecté et essai ; scores bornés aux entiers acceptés par la base.
- Correction du pied de page PDF qui créait une page parasite.
- Neutralisation des textes ressemblant à des formules dans les exports CSV.
- Dix équipes réellement ajoutées par le bouton « Ajouter 10 équipes d’exemple ».
- Suppression des anciens exports inaccessibles en mode essai.
- Contenu dynamique de l'onglet essai actif calculé à la demande.
- Dossiers de compilation locaux supplémentaires exclus de Git et des transferts Vercel.
- Migration de cohérence username/e-mail préparée, **non appliquée à une base**.

## Vérifications

- **58 tests réussis dans 7 fichiers**, dont 30 tests ajoutés.
- Actions serveur testées avec une base simulée : aucune écriture dans les concours réels.
- TypeScript et compilation de production réussis avec Webpack.
- Turbopack a rencontré une restriction locale d'ouverture de port interne ; utilisation de Webpack sans changer le moteur configuré pour les futurs déploiements.
- ESLint sur les fichiers applicatifs concernés : aucune erreur, un avertissement existant pour l'image QR en essai.
- Navigateur : parcours essai jusqu'à la finale, blocage des finales prématurées, correction de nom après tirage, confirmation affichée lors d'une correction affectant la finale. L'utilisateur a annulé cette dernière confirmation ; l'application a conservé les résultats fictifs.
- Navigateur connecté : tableau de bord et inscriptions d'un concours existant consultés sans écriture ; ajout et retrait correctement désactivés après tirage.
- Serveur local relancé sur http://localhost:4000 avec le build vérifié.

## Reste à traiter

- Sauvegarde des affiches par concours (accord reçu).
- Migration des comptes : validation sur base isolée puis application contrôlée lors d'une prochaine mise à jour.
- Mise à jour des dépendances et protections contre les tentatives/envois répétés.
- Optimisation des images d'affiche, retrait des anciens fichiers après vérification.
- Vérifications mobiles réelles et validation visuelle approfondie des exports longs.

L'audit initial reste conservé dans AUDIT-V1-2026-10-01.md ; le présent fichier indique les corrections intervenues depuis.
