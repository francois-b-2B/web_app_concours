/**
 * Numérotation des tables physiques : un compteur séquentiel qui repart de 1
 * à chaque ronde / tour (les tables sont réutilisées une fois la ronde
 * terminée). L'appelant fournit les identifiants de match dans l'ordre
 * voulu (ex. poule A avant poule B) pour une ronde donnée, en ayant déjà
 * exclu les matchs "bye" (pas de table nécessaire).
 */
export function assignTableNumbers(matchIdsInOrder: string[]): Map<string, number> {
  const assignment = new Map<string, number>();
  matchIdsInOrder.forEach((id, index) => assignment.set(id, index + 1));
  return assignment;
}
