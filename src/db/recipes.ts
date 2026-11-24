import type { SQLiteDatabase } from 'expo-sqlite';

import type { IngredientInput, Recipe, RecipeInput, RecipeSummary } from '../types/recipe';

type RecipeRow = {
  id: number;
  categoryId: number;
  title: string;
  servings: number;
  instructions: string;
  notes: string;
  sourceUrl: string | null;
  isFavorite: number;
  isTemp: number;
  parentId: number | null;
  createdAt: number;
  updatedAt: number;
};

type IngredientRow = {
  quantity: number | null;
  unit: string | null;
  name: string;
  rawText: string;
};

function parseSteps(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

async function insertIngredients(
  db: SQLiteDatabase,
  recipeId: number,
  ingredients: IngredientInput[],
): Promise<void> {
  for (const [position, ing] of ingredients.entries()) {
    await db.runAsync(
      'INSERT INTO ingredients (recipeId, position, quantity, unit, name, rawText) VALUES (?, ?, ?, ?, ?, ?)',
      recipeId,
      position,
      ing.quantity,
      ing.unit,
      ing.name,
      ing.rawText,
    );
  }
}

export async function createRecipe(db: SQLiteDatabase, input: RecipeInput): Promise<number> {
  let id = 0;
  const now = Date.now();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const result = await txn.runAsync(
      `INSERT INTO recipes (categoryId, title, servings, instructions, notes, sourceUrl, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      input.categoryId,
      input.title,
      input.servings,
      JSON.stringify(input.instructions),
      input.notes,
      input.sourceUrl,
      now,
      now,
    );
    id = result.lastInsertRowId;
    await insertIngredients(txn, id, input.ingredients);
  });
  return id;
}

export async function updateRecipe(
  db: SQLiteDatabase,
  id: number,
  input: RecipeInput,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `UPDATE recipes SET categoryId = ?, title = ?, servings = ?, instructions = ?,
         notes = ?, sourceUrl = ?, updatedAt = ? WHERE id = ?`,
      input.categoryId,
      input.title,
      input.servings,
      JSON.stringify(input.instructions),
      input.notes,
      input.sourceUrl,
      Date.now(),
      id,
    );
    await txn.runAsync('DELETE FROM ingredients WHERE recipeId = ?', id);
    await insertIngredients(txn, id, input.ingredients);
  });
}

export async function deleteRecipe(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM recipes WHERE id = ?', id);
}

export async function getRecipe(db: SQLiteDatabase, id: number): Promise<Recipe | null> {
  const row = await db.getFirstAsync<RecipeRow>('SELECT * FROM recipes WHERE id = ?', id);
  if (!row) return null;

  const ingredients = await db.getAllAsync<IngredientRow>(
    'SELECT quantity, unit, name, rawText FROM ingredients WHERE recipeId = ? ORDER BY position',
    id,
  );

  return {
    id: row.id,
    categoryId: row.categoryId,
    title: row.title,
    servings: row.servings,
    ingredients,
    instructions: parseSteps(row.instructions),
    notes: row.notes,
    sourceUrl: row.sourceUrl,
    isFavorite: row.isFavorite === 1,
    isTemp: row.isTemp === 1,
    parentId: row.parentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function recipeKey(categoryId: number, title: string): string {
  return `${categoryId}|${title.trim().toLowerCase()}`;
}

// Every saved recipe as a "categoryId|title" key, used to skip duplicates on import.
export async function listRecipeKeys(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ categoryId: number; title: string }>(
    'SELECT categoryId, title FROM recipes',
  );
  return new Set(rows.map((r) => recipeKey(r.categoryId, r.title)));
}

export async function listRecipesByCategory(
  db: SQLiteDatabase,
  categoryId: number,
): Promise<RecipeSummary[]> {
  const rows = await db.getAllAsync<{
    id: number;
    title: string;
    servings: number;
    isFavorite: number;
  }>(
    'SELECT id, title, servings, isFavorite FROM recipes WHERE categoryId = ? ORDER BY title COLLATE NOCASE',
    categoryId,
  );
  return rows.map((r) => ({ ...r, isFavorite: r.isFavorite === 1 }));
}
