import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting } from './settings';

const KEY = 'recentlyViewed';
const KEEP = 10;

async function readIds(db: SQLiteDatabase): Promise<number[]> {
  try {
    const parsed: unknown = JSON.parse((await getSetting(db, KEY)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

// Newest first, no duplicates, capped.
export async function recordRecipeViewed(db: SQLiteDatabase, recipeId: number): Promise<void> {
  const ids = [recipeId, ...(await readIds(db)).filter((id) => id !== recipeId)].slice(0, KEEP);
  await setSetting(db, KEY, JSON.stringify(ids));
}

export async function forgetRecipeViewed(db: SQLiteDatabase, recipeId: number): Promise<void> {
  const ids = await readIds(db);
  if (ids.includes(recipeId)) {
    await setSetting(db, KEY, JSON.stringify(ids.filter((id) => id !== recipeId)));
  }
}

export async function clearRecentlyViewed(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM settings WHERE key = ?', KEY);
}

export async function listRecentlyViewedIds(db: SQLiteDatabase): Promise<number[]> {
  return readIds(db);
}
