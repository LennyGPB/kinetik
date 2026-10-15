/** Rebuild the undo trail from saved versions, including after a page reload. */
export function undoTarget(versions: readonly { number: number; label: string }[]) {
  const trail: number[] = [];
  for (let i = 1; i < versions.length; i++) {
    const undone = /^Annulation · retour à la v(\d+)$/.exec(versions[i].label);
    const target = undone ? trail.lastIndexOf(Number(undone[1])) : -1;
    if (target >= 0) trail.splice(target);
    else trail.push(versions[i - 1].number);
  }
  return trail.at(-1) ?? null;
}
