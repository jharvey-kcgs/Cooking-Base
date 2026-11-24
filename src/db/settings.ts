import type { SQLiteDatabase } from 'expo-sqlite';
import { isUnitSystem, type UnitSystem } from '../services/units';

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

const UNITS_KEY = 'units';

export async function getUnits(db: SQLiteDatabase): Promise<UnitSystem> {
  const saved = await getSetting(db, UNITS_KEY);
  return isUnitSystem(saved) ? saved : 'standard';
}

export function setUnits(db: SQLiteDatabase, units: UnitSystem): Promise<void> {
  return setSetting(db, UNITS_KEY, units);
}
