import { useCallback, useState } from 'react';
import { Alert, Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import ReorderableList, { reorderItems, useReorderableDrag } from 'react-native-reorderable-list';

import { AppButton } from '@/components/AppButton';
import { ThemedInput } from '@/components/ThemedInput';
import {
  MAX_CATEGORY_NAME,
  deleteCategory,
  listCategoriesWithCounts,
  renameCategory,
  reorderCategories,
  addCategory,
  validateCategoryName,
  type CategoryWithCount,
} from '@/db/categories';
import { notifyCategoriesChanged } from '@/state/categoryEvents';
import { useTheme } from '@/theme/ThemeProvider';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function CategoryRow({
  item,
  onRename,
  onDelete,
}: {
  item: CategoryWithCount;
  onRename: (c: CategoryWithCount) => void;
  onDelete: (c: CategoryWithCount) => void;
}) {
  const { colors } = useTheme();
  const drag = useReorderableDrag();

  return (
    <Pressable
      onPress={() => onRename(item)}
      onLongPress={drag}
      delayLongPress={200}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.grip, { color: colors.textMuted }]} accessibilityLabel="Hold and drag to reorder">
        ≡
      </Text>
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.count, { color: colors.textMuted }]}>{plural(item.recipeCount, 'recipe')}</Text>
      </View>
      <Pressable
        onPress={() => onDelete(item)}
        hitSlop={10}
        accessibilityLabel={`Delete ${item.name}`}
        style={styles.delete}
      >
        <Text style={{ color: colors.danger, fontSize: 18 }}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

export default function ManageCategoriesScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');

  const [renaming, setRenaming] = useState<CategoryWithCount | null>(null);
  const [renameText, setRenameText] = useState('');
  const [renameError, setRenameError] = useState('');
  const [moving, setMoving] = useState<CategoryWithCount | null>(null);

  const load = useCallback(async () => {
    setCategories(await listCategoriesWithCounts(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const changed = async () => {
    await load();
    notifyCategoriesChanged();
  };

  const onAdd = async () => {
    const problem = validateCategoryName(newName, categories);
    if (problem) {
      setAddError(problem);
      return;
    }
    await addCategory(db, newName);
    setNewName('');
    setAddError('');
    Keyboard.dismiss();
    await changed();
  };

  const onReorder = ({ from, to }: { from: number; to: number }) => {
    const next = reorderItems(categories, from, to);
    setCategories(next); // update instantly, then save
    void reorderCategories(
      db,
      next.map((c) => c.id),
    ).then(notifyCategoriesChanged);
  };

  const startRename = (c: CategoryWithCount) => {
    setRenaming(c);
    setRenameText(c.name);
    setRenameError('');
  };

  const saveRename = async () => {
    if (!renaming) return;
    try {
      await renameCategory(db, renaming.id, renameText);
      setRenaming(null);
      await changed();
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : String(e));
    }
  };

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : String(e));
    }
    await changed();
  };

  const startDelete = (c: CategoryWithCount) => {
    if (categories.length <= 1) {
      Alert.alert("Can't delete", 'You need at least one category. Add another one first.');
      return;
    }
    if (c.totalCount === 0) {
      Alert.alert(`Delete "${c.name}"?`, 'This category is empty.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void run(() => deleteCategory(db, c.id)) },
      ]);
      return;
    }
    const total = plural(c.totalCount, 'recipe');
    Alert.alert(`Delete "${c.name}"?`, `It has ${total}. What should happen to them?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Move them to another category', onPress: () => setMoving(c) },
      {
        text: `Delete category and ${total}`,
        style: 'destructive',
        onPress: () =>
          Alert.alert('Are you sure?', `${total} will be permanently deleted. This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete everything',
              style: 'destructive',
              onPress: () => void run(() => deleteCategory(db, c.id)),
            },
          ]),
      },
    ]);
  };

  const header = (
    <View style={styles.header}>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Hold a category and drag to reorder it. The menu follows this order. Tap one to rename it.
      </Text>
      <View style={styles.addRow}>
        <ThemedInput
          style={styles.addInput}
          value={newName}
          onChangeText={(t) => {
            setNewName(t);
            setAddError('');
          }}
          placeholder="New category name"
          maxLength={MAX_CATEGORY_NAME}
          returnKeyType="done"
          onSubmitEditing={onAdd}
        />
        <AppButton label="Add" onPress={onAdd} disabled={!newName.trim()} style={styles.addButton} />
      </View>
      {addError ? <Text style={[styles.error, { color: colors.danger }]}>{addError}</Text> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ReorderableList
        data={categories}
        keyExtractor={(c) => String(c.id)}
        onReorder={onReorder}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <CategoryRow item={item} onRename={startRename} onDelete={startDelete} />}
      />

      <Modal visible={renaming !== null} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Rename category</Text>
            <ThemedInput
              value={renameText}
              onChangeText={(t) => {
                setRenameText(t);
                setRenameError('');
              }}
              maxLength={MAX_CATEGORY_NAME}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveRename}
            />
            {renameError ? <Text style={[styles.error, { color: colors.danger }]}>{renameError}</Text> : null}
            <View style={styles.cardButtons}>
              <AppButton variant="secondary" label="Cancel" onPress={() => setRenaming(null)} style={styles.flex} />
              <AppButton label="Save" onPress={saveRename} style={styles.flex} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={moving !== null} transparent animationType="fade" onRequestClose={() => setMoving(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Move {moving ? plural(moving.totalCount, 'recipe') : ''} to…
            </Text>
            {categories
              .filter((c) => c.id !== moving?.id)
              .map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    const from = moving;
                    setMoving(null);
                    if (from) void run(() => deleteCategory(db, from.id, c.id));
                  }}
                  style={[styles.pick, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>{c.name}</Text>
                </Pressable>
              ))}
            <AppButton variant="secondary" label="Cancel" onPress={() => setMoving(null)} style={styles.cancelGap} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 60, gap: 10 },
  header: { marginBottom: 10 },
  hint: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addInput: { flex: 1 },
  addButton: { minHeight: 44, paddingHorizontal: 20 },
  error: { fontSize: 14, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14 },
  grip: { fontSize: 24, marginRight: 14, lineHeight: 26 },
  rowText: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600' },
  count: { fontSize: 14, marginTop: 2 },
  delete: { paddingLeft: 12, paddingVertical: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 18, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  flex: { flex: 1 },
  pick: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
  cancelGap: { marginTop: 4 },
});
