import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { buildBackup, parseBackup, restoreBackup, type RestoreResult } from './backup';

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Writes the backup to a temp file and opens the share sheet (Save to Files, AirDrop, email...).
// Returns false if sharing isn't available on this device.
export async function exportBackup(db: SQLiteDatabase): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const backup = await buildBackup(db);
  const file = new File(Paths.cache, `cooking-base-backup-${stamp()}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save Cooking Base backup',
  });
  return true;
}

// Lets the user pick a backup file and validates it. Returns null if they cancel.
export async function pickBackup() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const text = await new File(result.assets[0].uri).text();
  return parseBackup(text);
}

export { restoreBackup, type RestoreResult };
