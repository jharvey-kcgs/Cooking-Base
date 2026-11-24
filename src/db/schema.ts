import type { SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'cooking-base.db';

// Bump this and add an `if (version === N)` block in migrateDb for every schema change.
const DATABASE_VERSION = 1;

export const DEFAULT_CATEGORIES = [
  'Breakfast',
  'Dessert',
  'Entrée',
  'Vegetables',
  'Marinade/Sauce',
];

export const SCHEMA_V1 = `
CREATE TABLE categories (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isDefault INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE recipes (
  id INTEGER PRIMARY KEY NOT NULL,
  categoryId INTEGER NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL,
  servings INTEGER NOT NULL DEFAULT 4,
  instructions TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  sourceUrl TEXT,
  isFavorite INTEGER NOT NULL DEFAULT 0,
  isTemp INTEGER NOT NULL DEFAULT 0,
  parentId INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX idx_recipes_category ON recipes(categoryId);

CREATE TABLE ingredients (
  id INTEGER PRIMARY KEY NOT NULL,
  recipeId INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  quantity REAL,
  unit TEXT,
  name TEXT NOT NULL,
  rawText TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_ingredients_recipe ON ingredients(recipeId);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE recipe_tags (
  recipeId INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tagId INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipeId, tagId)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  // Foreign keys are a per-connection setting, so this runs on every launch.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync("PRAGMA journal_mode = 'wal';");
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(SCHEMA_V1);
      for (const [index, name] of DEFAULT_CATEGORIES.entries()) {
        await txn.runAsync(
          'INSERT INTO categories (name, sortOrder, isDefault) VALUES (?, ?, 1)',
          name,
          index,
        );
      }
    });
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
