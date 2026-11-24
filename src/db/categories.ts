import type { SQLiteDatabase } from 'expo-sqlite';

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

export type CategoryWithCount = Category & { recipeCount: number };

// Scaled TEMP copies are not counted.
export function listCategoriesWithCounts(db: SQLiteDatabase): Promise<CategoryWithCount[]> {
  return db.getAllAsync<CategoryWithCount>(
    `SELECT c.id AS id, c.name AS name, c.sortOrder AS sortOrder, c.isDefault AS isDefault,
            COUNT(r.id) AS recipeCount
     FROM categories c LEFT JOIN recipes r ON r.categoryId = c.id AND r.isTemp = 0
     GROUP BY c.id ORDER BY c.sortOrder, c.id`,
  );
}
