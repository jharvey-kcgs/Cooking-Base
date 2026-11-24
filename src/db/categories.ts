import type { SQLiteDatabase } from 'expo-sqlite';

import { forgetRecipeViewed } from './recent';

export type Category = {
  id: number;
  name: string;
  sortOrder: number;
  isDefault: number;
};

export function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT id, name, sortOrder, isDefault FROM categories ORDER BY sortOrder, id',
  );
}

// Returns the existing category with this name (ignoring case) or creates it.
export async function addCategory(db: SQLiteDatabase, name: string): Promise<Category> {
  const trimmed = name.trim();
  const existing = await db.getFirstAsync<Category>(
    'SELECT id, name, sortOrder, isDefault FROM categories WHERE name = ? COLLATE NOCASE',
    trimmed,
  );
  if (existing) return existing;

  const next = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(sortOrder), -1) + 1 AS next FROM categories',
  );
  const sortOrder = next?.next ?? 0;
  const result = await db.runAsync(
    'INSERT INTO categories (name, sortOrder, isDefault) VALUES (?, ?, 0)',
    trimmed,
    sortOrder,
  );
  return { id: result.lastInsertRowId, name: trimmed, sortOrder, isDefault: 0 };
}

export function getCategory(db: SQLiteDatabase, id: number): Promise<Category | null> {
  return db.getFirstAsync<Category>(
    'SELECT id, name, sortOrder, isDefault FROM categories WHERE id = ?',
    id,
  );
}

// recipeCount skips scaled TEMP copies; totalCount includes everything stored in the category.
export type CategoryWithCount = Category & { recipeCount: number; totalCount: number };

export function listCategoriesWithCounts(db: SQLiteDatabase): Promise<CategoryWithCount[]> {
  return db.getAllAsync<CategoryWithCount>(
    `SELECT c.id AS id, c.name AS name, c.sortOrder AS sortOrder, c.isDefault AS isDefault,
            COUNT(CASE WHEN r.isTemp = 0 THEN 1 END) AS recipeCount,
            COUNT(r.id) AS totalCount
     FROM categories c LEFT JOIN recipes r ON r.categoryId = c.id
     GROUP BY c.id ORDER BY c.sortOrder, c.id`,
  );
}

export const MAX_CATEGORY_NAME = 40;

// Returns a user-readable problem with this name, or null if it's fine.
// `ignoreId` lets a category keep its own name when renaming.
export function validateCategoryName(
  name: string,
  existing: Category[],
  ignoreId?: number,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Enter a name for the category.';
  if (trimmed.length > MAX_CATEGORY_NAME) return `Keep the name under ${MAX_CATEGORY_NAME} characters.`;
  const clash = existing.some((c) => c.id !== ignoreId && c.name.toLowerCase() === trimmed.toLowerCase());
  return clash ? `You already have a category called "${trimmed}".` : null;
}

export async function renameCategory(db: SQLiteDatabase, id: number, name: string): Promise<void> {
  const existing = await listCategories(db);
  const problem = validateCategoryName(name, existing, id);
  if (problem) throw new Error(problem);
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', name.trim(), id);
}

// Saves the order of the whole list: position in `orderedIds` becomes sortOrder.
export async function reorderCategories(db: SQLiteDatabase, orderedIds: number[]): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const [index, id] of orderedIds.entries()) {
      await txn.runAsync('UPDATE categories SET sortOrder = ? WHERE id = ?', index, id);
    }
  });
}

export type DeleteCategoryResult = { moved: number; deleted: number };

// Deletes a category. Its recipes (TEMP copies included) are either moved to
// `moveTo` or deleted with it. The last remaining category can't be deleted,
// because every recipe needs a home.
export async function deleteCategory(
  db: SQLiteDatabase,
  id: number,
  moveTo: number | null = null,
): Promise<DeleteCategoryResult> {
  const all = await listCategories(db);
  if (!all.some((c) => c.id === id)) throw new Error('That category no longer exists.');
  if (all.length <= 1) throw new Error("You can't delete your only category.");
  if (moveTo !== null && (moveTo === id || !all.some((c) => c.id === moveTo))) {
    throw new Error('Pick a different category to move the recipes to.');
  }

  const ids = (
    await db.getAllAsync<{ id: number }>('SELECT id FROM recipes WHERE categoryId = ?', id)
  ).map((r) => r.id);

  await db.withExclusiveTransactionAsync(async (txn) => {
    if (moveTo !== null) {
      await txn.runAsync('UPDATE recipes SET categoryId = ? WHERE categoryId = ?', moveTo, id);
    } else {
      await txn.runAsync('DELETE FROM recipes WHERE categoryId = ?', id);
      await txn.runAsync('DELETE FROM tags WHERE id NOT IN (SELECT tagId FROM recipe_tags)');
    }
    await txn.runAsync('DELETE FROM categories WHERE id = ?', id);
    // Close the gap so sortOrder stays 0..n-1.
    const rest = await txn.getAllAsync<{ id: number }>('SELECT id FROM categories ORDER BY sortOrder, id');
    for (const [index, row] of rest.entries()) {
      await txn.runAsync('UPDATE categories SET sortOrder = ? WHERE id = ?', index, row.id);
    }
  });

  if (moveTo === null) for (const recipeId of ids) await forgetRecipeViewed(db, recipeId);
  return moveTo !== null ? { moved: ids.length, deleted: 0 } : { moved: 0, deleted: ids.length };
}
