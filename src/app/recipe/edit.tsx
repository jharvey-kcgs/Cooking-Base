import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { AppButton } from '@/components/AppButton';
import { ThemedInput } from '@/components/ThemedInput';
import { listCategories, type Category } from '@/db/categories';
import { createRecipe, getRecipe, updateRecipe } from '@/db/recipes';
import { getRecipeTags, listTags, parseTagInput, setRecipeTags, type TagCount } from '@/db/tags';
import { parseIngredient } from '@/services/parseIngredient';
import { takeImportDraft } from '@/state/importDraft';
import { useTheme } from '@/theme/ThemeProvider';

const DEFAULT_SERVINGS = 4;

export default function EditRecipeScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const { id, categoryId: categoryParam } = useLocalSearchParams<{ id?: string; categoryId?: string }>();
  const editingId = id ? Number(id) : null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(
    categoryParam ? Number(categoryParam) : null,
  );
  const [servings, setServings] = useState(DEFAULT_SERVINGS);
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [steps, setSteps] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tagText, setTagText] = useState('');
  const [knownTags, setKnownTags] = useState<TagCount[]>([]);

  // Load categories, then fill the form from the saved recipe (edit) or an import (add).
  useEffect(() => {
    let active = true;
    (async () => {
      const cats = await listCategories(db);
      if (!active) return;
      setCategories(cats);
      const existingTags = await listTags(db);
      if (!active) return;
      setKnownTags(existingTags);

      if (editingId !== null) {
        const recipe = await getRecipe(db, editingId);
        if (!active || !recipe) return;
        setTitle(recipe.title);
        setCategoryId(recipe.categoryId);
        setServings(recipe.servings);
        setIngredients(recipe.ingredients.length ? recipe.ingredients.map((i) => i.rawText) : ['']);
        setSteps(recipe.instructions.length ? recipe.instructions : ['']);
        setNotes(recipe.notes);
        setSourceUrl(recipe.sourceUrl ?? '');
        const savedTags = await getRecipeTags(db, editingId);
        if (!active) return;
        setTagText(savedTags.join(', '));
      } else {
        const draft = takeImportDraft();
        if (draft) {
          setTitle(draft.title);
          setServings(draft.servings ?? DEFAULT_SERVINGS);
          setIngredients(draft.ingredients.length ? draft.ingredients : ['']);
          setSteps(draft.instructions.length ? draft.instructions : ['']);
          setNotes(draft.notes);
          setSourceUrl(draft.sourceUrl ?? '');
        }
      }
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [db, editingId]);

  const updateAt = (list: string[], set: (v: string[]) => void, index: number, text: string) =>
    set(list.map((item, i) => (i === index ? text : item)));
  const removeAt = (list: string[], set: (v: string[]) => void, index: number) =>
    set(list.length > 1 ? list.filter((_, i) => i !== index) : ['']);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Give your recipe a title before saving.');
      return;
    }
    if (categoryId === null) {
      Alert.alert('Pick a category', 'Choose which category this recipe belongs in.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        categoryId,
        title: title.trim(),
        servings,
        ingredients: ingredients.map((l) => l.trim()).filter(Boolean).map(parseIngredient),
        instructions: steps.map((s) => s.trim()).filter(Boolean),
        notes: notes.trim(),
        sourceUrl: sourceUrl.trim() || null,
      };

      if (editingId !== null) {
        await updateRecipe(db, editingId, input);
        await setRecipeTags(db, editingId, parseTagInput(tagText));
        router.back(); // the recipe screen reloads when it regains focus
      } else {
        const newId = await createRecipe(db, input);
        await setRecipeTags(db, newId, parseTagInput(tagText));
        router.dismissAll(); // back to the drawer, then open the new recipe
        router.push(`/recipe/${newId}`);
      }
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'Something went wrong saving this recipe. Please try again.');
    }
  };

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const label = (text: string) => <Text style={[styles.label, { color: colors.textMuted }]}>{text}</Text>;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Stack.Screen options={{ title: editingId !== null ? 'Edit recipe' : 'New recipe' }} />

      {label('TITLE')}
      <ThemedInput value={title} onChangeText={setTitle} placeholder="Recipe title" />

      {label('CATEGORY')}
      <View style={styles.chips}>
        {categories.map((c) => {
          const selected = c.id === categoryId;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: selected ? colors.onPrimary : colors.text }}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {label('SERVINGS')}
      <View style={styles.stepper}>
        <AppButton
          variant="secondary"
          label="−"
          onPress={() => setServings((s) => Math.max(1, s - 1))}
          style={styles.stepperButton}
        />
        <Text style={[styles.servings, { color: colors.text }]}>{servings}</Text>
        <AppButton
          variant="secondary"
          label="+"
          onPress={() => setServings((s) => Math.min(99, s + 1))}
          style={styles.stepperButton}
        />
      </View>

      {label('INGREDIENTS')}
      {ingredients.map((line, i) => (
        <View key={i} style={styles.row}>
          <ThemedInput
            style={styles.rowInput}
            value={line}
            onChangeText={(t) => updateAt(ingredients, setIngredients, i, t)}
            placeholder={i === 0 ? 'e.g. 1 1/2 cups flour' : 'Ingredient'}
          />
          <Pressable onPress={() => removeAt(ingredients, setIngredients, i)} style={styles.remove}>
            <Text style={[styles.removeText, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>
      ))}
      <AppButton
        variant="secondary"
        label="Add ingredient"
        onPress={() => setIngredients([...ingredients, ''])}
      />

      {label('INSTRUCTIONS')}
      {steps.map((step, i) => (
        <View key={i} style={styles.row}>
          <Text style={[styles.stepNumber, { color: colors.textMuted }]}>{i + 1}.</Text>
          <ThemedInput
            style={styles.rowInput}
            multiline
            value={step}
            onChangeText={(t) => updateAt(steps, setSteps, i, t)}
            placeholder={i === 0 ? 'Describe the first step' : 'Next step'}
          />
          <Pressable onPress={() => removeAt(steps, setSteps, i)} style={styles.remove}>
            <Text style={[styles.removeText, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>
      ))}
      <AppButton variant="secondary" label="Add step" onPress={() => setSteps([...steps, ''])} />

      {label('TAGS')}
      <ThemedInput
        value={tagText}
        onChangeText={setTagText}
        placeholder="Separate with commas, e.g. quick, dinner"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {knownTags.length > 0 ? (
        <View style={styles.chips}>
          {knownTags.map((t) => {
            const current = parseTagInput(tagText);
            const selected = current.some((c) => c.toLowerCase() === t.name.toLowerCase());
            return (
              <Pressable
                key={t.id}
                onPress={() =>
                  setTagText(
                    (selected
                      ? current.filter((c) => c.toLowerCase() !== t.name.toLowerCase())
                      : [...current, t.name]
                    ).join(', '),
                  )
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: selected ? colors.onPrimary : colors.text }}>{t.name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {label('NOTES')}
      <ThemedInput
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Tips, substitutions, who loves it…"
      />

      {label('SOURCE LINK')}
      <ThemedInput
        value={sourceUrl}
        onChangeText={setSourceUrl}
        placeholder="Where this recipe came from (optional)"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <AppButton label="Save recipe" onPress={save} loading={saving} style={styles.save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 60 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 10, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperButton: { width: 56 },
  servings: { fontSize: 20, fontWeight: '600', minWidth: 32, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  rowInput: { flex: 1 },
  stepNumber: { width: 22, paddingTop: 12, fontSize: 16 },
  remove: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 16 },
  save: { marginTop: 20 },
});
