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

export function getCategory(db: SQLiteDatabase, id: number): Promise<Category | null> {
  return db.getFirstAsync<Category>(
    'SELECT id, name, sortOrder, isDefault FROM categories WHERE id = ?',
    id,
  );
}
