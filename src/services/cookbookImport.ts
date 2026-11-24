import { addCategory, type Category } from '../db/categories';
import { createRecipe, recipeKey } from '../db/recipes';
import type { CookbookParse, CookbookRecipe } from './importers/fromCookbook';
import { parseIngredient } from './parseIngredient';
import type { SQLiteDatabase } from 'expo-sqlite';

const DEFAULT_SERVINGS = 4;
const UNSORTED_CATEGORY = 'Imported';

// Misspellings / alternate names that should land in an existing category.
const ALIASES: Record<string, string> = { desert: 'dessert' };

// "Entrees" and "Entrée" should be the same thing, as should "Marinades" and "Marinade/Sauce".
export function categoryKey(name: string): string {
  const key = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/s$/, '');
  return ALIASES[key] ?? key;
}

export function matchCategory(sectionName: string, categories: Category[]): Category | null {
  const key = categoryKey(sectionName);
  if (!key) return null;
  for (const category of categories) {
    const keys = [
      category.name,
      ...category.name.split(/[/&,]|\band\b/i),
    ].map(categoryKey);
    if (keys.includes(key)) return category;
  }
  return null;
}

export type PlannedRecipe = {
  key: number;
  recipe: CookbookRecipe;
  categoryName: string;
  // null means the category doesn't exist yet and will be created on import.
  categoryId: number | null;
  duplicate: boolean;
};

// Decides which category each recipe goes in and which ones are already saved.
export function planCookbookImport(
  parse: CookbookParse,
  categories: Category[],
  existingKeys: Set<string>,
): PlannedRecipe[] {
  const resolved = new Map<string, { name: string; id: number | null }>();

  return parse.recipes.map((recipe, key) => {
    const section = recipe.section ?? UNSORTED_CATEGORY;
    const cacheKey = categoryKey(section);

    let target = resolved.get(cacheKey);
    if (!target) {
      const match = matchCategory(section, categories);
      target = match ? { name: match.name, id: match.id } : { name: section, id: null };
      resolved.set(cacheKey, target);
    }

    return {
      key,
      recipe,
      categoryName: target.name,
      categoryId: target.id,
      duplicate: target.id !== null && existingKeys.has(recipeKey(target.id, recipe.title)),
    };
  });
}

// Saves the chosen recipes, creating any new categories along the way.
// Returns how many were saved. Safe to re-run: saved recipes are skipped as duplicates.
export async function runCookbookImport(
  db: SQLiteDatabase,
  planned: PlannedRecipe[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const createdCategories = new Map<string, number>();
  let done = 0;

  for (const item of planned) {
    let categoryId = item.categoryId;
    if (categoryId === null) {
      const cacheKey = categoryKey(item.categoryName);
      let id = createdCategories.get(cacheKey);
      if (id === undefined) {
        id = (await addCategory(db, item.categoryName)).id;
        createdCategories.set(cacheKey, id);
      }
      categoryId = id;
    }

    const { recipe } = item;
    await createRecipe(db, {
      categoryId,
      title: recipe.title,
      servings: recipe.servings ?? DEFAULT_SERVINGS,
      ingredients: recipe.ingredients.map(parseIngredient),
      instructions: recipe.instructions,
      notes: recipe.notes,
      sourceUrl: recipe.sourceUrl,
    });

    done += 1;
    onProgress?.(done, planned.length);
  }

  return done;
}
