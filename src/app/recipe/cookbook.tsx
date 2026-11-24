import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { AppButton } from '@/components/AppButton';
import { ThemedInput } from '@/components/ThemedInput';
import { listCategories } from '@/db/categories';
import { listRecipeKeys } from '@/db/recipes';
import { planCookbookImport, runCookbookImport, type PlannedRecipe } from '@/services/cookbookImport';
import { importCookbook } from '@/services/importers/fromCookbook';
import { useTheme } from '@/theme/ThemeProvider';

type Plan = { items: PlannedRecipe[]; skipped: string[] };

export default function CookbookImportScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();

  const [input, setInput] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const readCookbook = async () => {
    setError(null);
    setReading(true);
    try {
      const parse = await importCookbook(input);
      const [categories, existing] = await Promise.all([listCategories(db), listRecipeKeys(db)]);
      const items = planCookbookImport(parse, categories, existing);
      setPlan({ items, skipped: parse.skipped });
      setSelected(new Set(items.filter((i) => !i.duplicate).map((i) => i.key)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setReading(false);
    }
  };

  const sections = useMemo(() => {
    if (!plan) return [];
    const groups = new Map<string, { title: string; isNew: boolean; data: PlannedRecipe[] }>();
    for (const item of plan.items) {
      const group = groups.get(item.categoryName) ?? {
        title: item.categoryName,
        isNew: item.categoryId === null,
        data: [],
      };
      group.data.push(item);
      groups.set(item.categoryName, group);
    }
    return [...groups.values()];
  }, [plan]);

  const toggle = (key: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectable = plan ? plan.items.filter((i) => !i.duplicate) : [];
  const allSelected = selectable.length > 0 && selected.size === selectable.length;

  const runImport = async () => {
    if (!plan) return;
    const chosen = plan.items.filter((i) => selected.has(i.key) && !i.duplicate);
    setImporting(true);
    setProgress(0);
    try {
      const count = await runCookbookImport(db, chosen, (done) => setProgress(done));
      Alert.alert('Import complete', `${count} recipe${count === 1 ? '' : 's'} added.`, [
        { text: 'OK', onPress: () => router.dismissAll() },
      ]);
    } catch {
      setImporting(false);
      Alert.alert(
        'Import stopped',
        'Something went wrong part way through. Recipes already saved are kept, and you can run the import again: it skips anything already in the app.',
      );
    }
  };

  // Step 1: paste the link or text.
  if (!plan) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={[styles.heading, { color: colors.text }]}>Import a whole cookbook</Text>
        <Text style={[styles.help, { color: colors.textMuted }]}>
          Paste the link to a Google Doc that holds many recipes (shared as "Anyone with the link"),
          or paste the text itself. The app splits it into recipes and files each one under the
          section it sits in, like Soups or Breakfast. You'll review everything before anything is
          saved.
        </Text>
        <ThemedInput
          value={input}
          onChangeText={setInput}
          placeholder="https://docs.google.com/document/d/..."
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          editable={!reading}
        />
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <AppButton
          label="Read cookbook"
          onPress={readCookbook}
          loading={reading}
          disabled={input.trim().length === 0}
        />
      </ScrollView>
    );
  }

  // Step 2: review and choose what to import.
  const newCategories = sections.filter((s) => s.isNew).map((s) => s.title);
  const duplicates = plan.items.length - selectable.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.key)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.summary}>
            <Text style={[styles.heading, { color: colors.text }]}>
              Found {plan.items.length} recipes
            </Text>
            <Text style={[styles.help, { color: colors.textMuted }]}>
              {sections.length} sections.
              {newCategories.length > 0 ? ` New categories will be created: ${newCategories.join(', ')}.` : ''}
              {duplicates > 0 ? ` ${duplicates} already in the app.` : ''}
              {plan.skipped.length > 0
                ? ` Ignored ${plan.skipped.length} stray line${plan.skipped.length === 1 ? '' : 's'} (${plan.skipped
                    .slice(0, 3)
                    .join('; ')}${plan.skipped.length > 3 ? '; …' : ''}).`
                : ''}
            </Text>
            <AppButton
              variant="secondary"
              label={allSelected ? 'Select none' : 'Select all'}
              onPress={() => setSelected(allSelected ? new Set() : new Set(selectable.map((i) => i.key)))}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {section.title.toUpperCase()}
            {section.isNew ? '  ·  NEW CATEGORY' : ''}  ({section.data.length})
          </Text>
        )}
        renderItem={({ item }) => {
          const isOn = selected.has(item.key);
          const disabled = item.duplicate;
          return (
            <Pressable
              disabled={disabled}
              onPress={() => toggle(item.key)}
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.check, { color: isOn ? colors.primary : colors.textMuted }]}>
                {isOn ? '☑' : '☐'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{item.recipe.title}</Text>
                <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
                  {item.duplicate
                    ? 'Already in the app'
                    : `${item.recipe.ingredients.length} ingredients · ${item.recipe.instructions.length} steps`}
                </Text>
                {item.recipe.warnings.map((w) => (
                  <Text key={w} style={[styles.rowMeta, { color: colors.danger }]}>
                    ⚠ {w}
                  </Text>
                ))}
              </View>
            </Pressable>
          );
        }}
      />

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppButton
          label={
            importing
              ? `Importing… ${progress} of ${selected.size}`
              : `Import ${selected.size} recipe${selected.size === 1 ? '' : 's'}`
          }
          onPress={runImport}
          loading={importing}
          disabled={selected.size === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  heading: { fontSize: 22, fontWeight: '700' },
  help: { fontSize: 15, lineHeight: 21 },
  error: { fontSize: 15, lineHeight: 21 },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  summary: { gap: 10, paddingTop: 16, paddingBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginTop: 20, marginBottom: 8, marginLeft: 2 },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  check: { fontSize: 24, lineHeight: 28 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowMeta: { marginTop: 2, fontSize: 13 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
