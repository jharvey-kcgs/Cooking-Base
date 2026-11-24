import type { ImportedRecipe } from '../types/recipe';

// Hands an imported recipe from the import screen to the edit form.
// Kept in memory (not in route params) because recipes can be long.
let draft: ImportedRecipe | null = null;

export function setImportDraft(next: ImportedRecipe): void {
  draft = next;
}

export function takeImportDraft(): ImportedRecipe | null {
  const current = draft;
  draft = null;
  return current;
}
