import type { SQLiteDatabase } from 'expo-sqlite';

export type TagCount = { id: number; name: string; count: number };

// "Quick, #Italian , quick" -> ["Quick", "Italian"] (trimmed, deduped ignoring case).
export function parseTagInput(text: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of text.split(/[,\n]/)) {
    const tag = part.trim().replace(/^#+\s*/, '').replace(/\s+/g, ' ');
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags;
}

export async function getRecipeTags(db: SQLiteDatabase, recipeId: number): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT t.name AS name FROM recipe_tags rt JOIN tags t ON t.id = rt.tagId
     WHERE rt.recipeId = ? ORDER BY t.name COLLATE NOCASE`,
    recipeId,
  );
  return rows.map((r) => r.name);
}

// Replaces a recipe's tags. Tags no recipe uses any more are removed.
export async function setRecipeTags(
  db: SQLiteDatabase,
  recipeId: number,
  tags: string[],
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM recipe_tags WHERE recipeId = ?', recipeId);
    for (const name of parseTagInput(tags.join(','))) {
      let row = await txn.getFirstAsync<{ id: number }>(
        'SELECT id FROM tags WHERE name = ? COLLATE NOCASE',
        name,
      );
      if (!row) {
        const res = await txn.runAsync('INSERT INTO tags (name) VALUES (?)', name);
        row = { id: res.lastInsertRowId };
      }
      await txn.runAsync('INSERT OR IGNORE INTO recipe_tags (recipeId, tagId) VALUES (?, ?)', recipeId, row.id);
    }
    await txn.runAsync('DELETE FROM tags WHERE id NOT IN (SELECT tagId FROM recipe_tags)');
  });
}

// Every tag that at least one recipe uses, with how many.
export function listTags(db: SQLiteDatabase): Promise<TagCount[]> {
  return db.getAllAsync<TagCount>(
    `SELECT t.id AS id, t.name AS name, COUNT(rt.recipeId) AS count
     FROM tags t JOIN recipe_tags rt ON rt.tagId = t.id
     GROUP BY t.id ORDER BY t.name COLLATE NOCASE`,
  );
}
