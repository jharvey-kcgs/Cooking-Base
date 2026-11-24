import type { SQLiteDatabase } from 'expo-sqlite';

export const BACKUP_APP = 'cooking-base';
export const BACKUP_FORMAT_VERSION = 1;

export type BackupIngredient = {
  quantity: number | null;
  unit: string | null;
  name: string;
  rawText: string;
};

export type BackupCategory = {
  id: number;
  name: string;
  sortOrder: number;
  isDefault: boolean;
};

export type BackupRecipe = {
  id: number;
  categoryId: number;
  title: string;
  servings: number;
  ingredients: BackupIngredient[];
  instructions: string[];
  notes: string;
  sourceUrl: string | null;
  isFavorite: boolean;
  isTemp: boolean;
  parentId: number | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type Backup = {
  app: typeof BACKUP_APP;
  formatVersion: number;
  exportedAt: number;
  categories: BackupCategory[];
  recipes: BackupRecipe[];
};

export type DataStats = {
  recipes: number;
  categories: number;
  favorites: number;
  temp: number;
};

export async function getDataStats(db: SQLiteDatabase): Promise<DataStats> {
  const row = await db.getFirstAsync<DataStats>(
    `SELECT
       (SELECT COUNT(*) FROM recipes) AS recipes,
       (SELECT COUNT(*) FROM categories) AS categories,
       (SELECT COUNT(*) FROM recipes WHERE isFavorite = 1) AS favorites,
       (SELECT COUNT(*) FROM recipes WHERE isTemp = 1) AS temp`,
  );
  return row ?? { recipes: 0, categories: 0, favorites: 0, temp: 0 };
}

export async function deleteTempRecipes(db: SQLiteDatabase): Promise<number> {
  const result = await db.runAsync('DELETE FROM recipes WHERE isTemp = 1');
  return result.changes;
}

// Removes every recipe (ingredients and tag links cascade). Categories stay.
export async function deleteAllRecipes(db: SQLiteDatabase): Promise<number> {
  const result = await db.runAsync('DELETE FROM recipes');
  await db.runAsync('DELETE FROM tags');
  return result.changes;
}

function parseSteps(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export async function buildBackup(db: SQLiteDatabase): Promise<Backup> {
  const categories = await db.getAllAsync<{
    id: number;
    name: string;
    sortOrder: number;
    isDefault: number;
  }>('SELECT id, name, sortOrder, isDefault FROM categories ORDER BY sortOrder, id');

  const recipeRows = await db.getAllAsync<{
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
  }>('SELECT * FROM recipes ORDER BY id');

  const ingredientRows = await db.getAllAsync<{
    recipeId: number;
    quantity: number | null;
    unit: string | null;
    name: string;
    rawText: string;
  }>('SELECT recipeId, quantity, unit, name, rawText FROM ingredients ORDER BY recipeId, position');

  const tagRows = await db.getAllAsync<{ recipeId: number; name: string }>(
    `SELECT rt.recipeId AS recipeId, t.name AS name
     FROM recipe_tags rt JOIN tags t ON t.id = rt.tagId ORDER BY rt.recipeId, t.name`,
  );

  const ingredientsByRecipe = new Map<number, BackupIngredient[]>();
  for (const { recipeId, ...ing } of ingredientRows) {
    const list = ingredientsByRecipe.get(recipeId) ?? [];
    list.push(ing);
    ingredientsByRecipe.set(recipeId, list);
  }
  const tagsByRecipe = new Map<number, string[]>();
  for (const { recipeId, name } of tagRows) {
    const list = tagsByRecipe.get(recipeId) ?? [];
    list.push(name);
    tagsByRecipe.set(recipeId, list);
  }

  return {
    app: BACKUP_APP,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    categories: categories.map((c) => ({ ...c, isDefault: c.isDefault === 1 })),
    recipes: recipeRows.map((r) => ({
      id: r.id,
      categoryId: r.categoryId,
      title: r.title,
      servings: r.servings,
      ingredients: ingredientsByRecipe.get(r.id) ?? [],
      instructions: parseSteps(r.instructions),
      notes: r.notes,
      sourceUrl: r.sourceUrl,
      isFavorite: r.isFavorite === 1,
      isTemp: r.isTemp === 1,
      parentId: r.parentId,
      tags: tagsByRecipe.get(r.id) ?? [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// Parses and checks backup text. Throws an Error with a user-readable message.
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not a valid Cooking Base backup.');
  }
  if (!isObj(data) || data.app !== BACKUP_APP) {
    throw new Error('That file is not a Cooking Base backup.');
  }
  if (!isNum(data.formatVersion) || data.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error('This backup was made by a newer version of Cooking Base. Update the app first.');
  }
  if (!Array.isArray(data.categories) || !Array.isArray(data.recipes)) {
    throw new Error('The backup is missing its recipes or categories.');
  }
  if (data.categories.length === 0) {
    throw new Error('The backup has no categories.');
  }

  const categoryIds = new Set<number>();
  const categoryNames = new Set<string>();
  const categories: BackupCategory[] = data.categories.map((c: unknown, i: number) => {
    if (!isObj(c) || !isNum(c.id) || !isStr(c.name) || c.name.trim() === '') {
      throw new Error(`Category #${i + 1} in the backup is damaged.`);
    }
    const key = c.name.trim().toLowerCase();
    if (categoryIds.has(c.id) || categoryNames.has(key)) {
      throw new Error(`The backup has a duplicate category: ${c.name}.`);
    }
    categoryIds.add(c.id);
    categoryNames.add(key);
    return {
      id: c.id,
      name: c.name.trim(),
      sortOrder: isNum(c.sortOrder) ? c.sortOrder : i,
      isDefault: c.isDefault === true,
    };
  });

  const recipeIds = new Set<number>();
  const recipes: BackupRecipe[] = data.recipes.map((r: unknown, i: number) => {
    if (!isObj(r) || !isNum(r.id) || !isStr(r.title) || !isNum(r.categoryId)) {
      throw new Error(`Recipe #${i + 1} in the backup is damaged.`);
    }
    if (recipeIds.has(r.id)) throw new Error(`The backup has a duplicate recipe id (${r.id}).`);
    recipeIds.add(r.id);
    if (!categoryIds.has(r.categoryId)) {
      throw new Error(`"${r.title}" points to a category that is not in the backup.`);
    }
    const ingredients: BackupIngredient[] = (Array.isArray(r.ingredients) ? r.ingredients : [])
      .filter(isObj)
      .map((ing) => ({
        quantity: isNum(ing.quantity) ? ing.quantity : null,
        unit: isStr(ing.unit) ? ing.unit : null,
        name: isStr(ing.name) ? ing.name : '',
        rawText: isStr(ing.rawText) ? ing.rawText : '',
      }));
    const now = Date.now();
    return {
      id: r.id,
      categoryId: r.categoryId,
      title: r.title,
      servings: isNum(r.servings) && r.servings > 0 ? Math.round(r.servings) : 4,
      ingredients,
      instructions: Array.isArray(r.instructions) ? r.instructions.filter(isStr) : [],
      notes: isStr(r.notes) ? r.notes : '',
      sourceUrl: isStr(r.sourceUrl) ? r.sourceUrl : null,
      isFavorite: r.isFavorite === true,
      isTemp: r.isTemp === true,
      parentId: isNum(r.parentId) ? r.parentId : null,
      tags: Array.isArray(r.tags) ? r.tags.filter(isStr) : [],
      createdAt: isNum(r.createdAt) ? r.createdAt : now,
      updatedAt: isNum(r.updatedAt) ? r.updatedAt : now,
    };
  });

  return {
    app: BACKUP_APP,
    formatVersion: data.formatVersion,
    exportedAt: isNum(data.exportedAt) ? data.exportedAt : Date.now(),
    categories,
    recipes,
  };
}

export type RestoreResult = { recipes: number; categories: number };

// Replaces everything in the app with the backup, all-or-nothing.
export async function restoreBackup(db: SQLiteDatabase, backup: Backup): Promise<RestoreResult> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM recipes');
    await txn.runAsync('DELETE FROM tags');
    await txn.runAsync('DELETE FROM categories');

    const categoryMap = new Map<number, number>();
    for (const c of backup.categories) {
      const res = await txn.runAsync(
        'INSERT INTO categories (name, sortOrder, isDefault) VALUES (?, ?, ?)',
        c.name,
        c.sortOrder,
        c.isDefault ? 1 : 0,
      );
      categoryMap.set(c.id, res.lastInsertRowId);
    }

    const recipeMap = new Map<number, number>();
    const tagMap = new Map<string, number>();
    for (const r of backup.recipes) {
      const res = await txn.runAsync(
        `INSERT INTO recipes (categoryId, title, servings, instructions, notes, sourceUrl,
           isFavorite, isTemp, parentId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        categoryMap.get(r.categoryId) as number,
        r.title,
        r.servings,
        JSON.stringify(r.instructions),
        r.notes,
        r.sourceUrl,
        r.isFavorite ? 1 : 0,
        r.isTemp ? 1 : 0,
        r.createdAt,
        r.updatedAt,
      );
      const newId = res.lastInsertRowId;
      recipeMap.set(r.id, newId);

      for (const [position, ing] of r.ingredients.entries()) {
        await txn.runAsync(
          'INSERT INTO ingredients (recipeId, position, quantity, unit, name, rawText) VALUES (?, ?, ?, ?, ?, ?)',
          newId,
          position,
          ing.quantity,
          ing.unit,
          ing.name,
          ing.rawText,
        );
      }

      for (const rawTag of new Set(r.tags.map((t) => t.trim()).filter(Boolean))) {
        const tagKey = rawTag.toLowerCase();
        let tagId = tagMap.get(tagKey);
        if (tagId === undefined) {
          const t = await txn.runAsync('INSERT INTO tags (name) VALUES (?)', rawTag);
          tagId = t.lastInsertRowId;
          tagMap.set(tagKey, tagId);
        }
        await txn.runAsync(
          'INSERT OR IGNORE INTO recipe_tags (recipeId, tagId) VALUES (?, ?)',
          newId,
          tagId,
        );
      }
    }

    // Second pass: parents can appear after their children.
    for (const r of backup.recipes) {
      const parent = r.parentId === null ? undefined : recipeMap.get(r.parentId);
      if (parent !== undefined) {
        await txn.runAsync(
          'UPDATE recipes SET parentId = ? WHERE id = ?',
          parent,
          recipeMap.get(r.id) as number,
        );
      }
    }
  });
  return { recipes: backup.recipes.length, categories: backup.categories.length };
}
