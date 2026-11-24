import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { AppButton } from '@/components/AppButton';
import {
  deleteAllRecipes,
  deleteTempRecipes,
  getDataStats,
  type Backup,
  type DataStats,
} from '@/services/backup';
import { exportBackup, pickBackup, restoreBackup } from '@/services/backupFiles';
import { useTheme } from '@/theme/ThemeProvider';

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default function DataScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const [stats, setStats] = useState<DataStats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStats(await getDataStats(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      await refresh();
    }
  }

  const onExport = () =>
    run('export', async () => {
      const shared = await exportBackup(db);
      if (!shared) Alert.alert('Not available', 'Sharing is not available on this device.');
    });

  const onRestore = () =>
    run('restore', async () => {
      const backup: Backup | null = await pickBackup();
      if (!backup) return;
      const when = new Date(backup.exportedAt).toLocaleDateString();
      const confirmed = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Restore this backup?',
          `${plural(backup.recipes.length, 'recipe')} in ${plural(backup.categories.length, 'category').replace('categorys', 'categories')}, saved ${when}.\n\nThis REPLACES everything currently in the app.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Replace everything', style: 'destructive', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        ),
      );
      if (!confirmed) return;
      const res = await restoreBackup(db, backup);
      Alert.alert('Backup restored', `${plural(res.recipes, 'recipe')} restored.`);
    });

  const onClearTemp = () => {
    const count = stats?.temp ?? 0;
    if (count === 0) {
      Alert.alert('Nothing to clear', 'There are no TEMP recipes.');
      return;
    }
    Alert.alert('Delete TEMP recipes?', `${plural(count, 'scaled copy')} will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void run('temp', async () => void (await deleteTempRecipes(db))),
      },
    ]);
  };

  const onDeleteAll = () => {
    const count = stats?.recipes ?? 0;
    if (count === 0) {
      Alert.alert('Nothing to delete', 'There are no recipes.');
      return;
    }
    Alert.alert(
      'Delete ALL recipes?',
      `All ${plural(count, 'recipe')} will be permanently deleted. Categories are kept. Export a backup first if you might want them back.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: `Delete ${plural(count, 'recipe')}`,
                style: 'destructive',
                onPress: () => void run('all', async () => void (await deleteAllRecipes(db))),
              },
            ]),
        },
      ],
    );
  };

  const statItems = stats
    ? [
        ['Recipes', stats.recipes],
        ['Categories', stats.categories],
        ['Favorites', stats.favorites],
        ['TEMP', stats.temp],
      ]
    : [];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>YOUR DATA</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {statItems.map(([label, value]) => (
          <View key={label} style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Everything is stored only on this phone. If you delete the app or lose the phone, the recipes
        go with it, so export a backup now and then.
      </Text>

      <Text style={[styles.sectionTitle, styles.gap, { color: colors.textMuted }]}>BACKUP</Text>
      <AppButton label="Export backup" onPress={onExport} loading={busy === 'export'} disabled={!!busy} />
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Creates a file you can save to Files, AirDrop, or email to yourself.
      </Text>
      <AppButton
        variant="secondary"
        label="Restore from backup"
        onPress={onRestore}
        loading={busy === 'restore'}
        disabled={!!busy}
        style={styles.spaced}
      />
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Pick a backup file. It replaces everything currently in the app.
      </Text>

      <Text style={[styles.sectionTitle, styles.gap, { color: colors.textMuted }]}>CLEAN UP</Text>
      <AppButton
        variant="secondary"
        label="Delete TEMP recipes"
        onPress={onClearTemp}
        disabled={!!busy}
      />
      <AppButton
        variant="danger"
        label="Delete all recipes"
        onPress={onDeleteAll}
        loading={busy === 'all'}
        disabled={!!busy}
        style={styles.spaced}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  gap: { marginTop: 28 },
  card: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  hint: { marginTop: 8, marginHorizontal: 4, fontSize: 14, lineHeight: 20 },
  spaced: { marginTop: 16 },
});
