import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { AppButton } from '@/components/AppButton';
import { getCategory } from '@/db/categories';
import { createRecipe, deleteRecipe, getRecipe } from '@/db/recipes';
import { getUnits } from '@/db/settings';
import {
  MAX_SERVINGS,
  MIN_SERVINGS,
  displayIngredient,
  scaleIngredients,
  scaleRatio,
} from '@/services/scale';
import { convertTemperatures, type UnitSystem } from '@/services/units';
import { useTheme } from '@/theme/ThemeProvider';
import type { Recipe } from '@/types/recipe';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [units, setUnits] = useState<UnitSystem>('standard');
  const [servings, setServings] = useState(4);
  const [saving, setSaving] = useState(false);

  // Reload on focus so edits made on the edit screen show up when you come back.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const found = await getRecipe(db, recipeId);
        const category = found ? await getCategory(db, found.categoryId) : null;
        const savedUnits = await getUnits(db);
        if (!active) return;
        setRecipe(found);
        setUnits(savedUnits);
        // Reset the temporary scale whenever the saved recipe (re)loads.
        setServings(found?.servings ?? 4);
        setCategoryName(category?.name ?? '');
        setLoaded(true);
      })();
      return () => {
        active = false;
      };
    }, [db, recipeId]),
  );

  const confirmDelete = () => {
    if (!recipe) return;
    Alert.alert('Delete recipe?', `"${recipe.title}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRecipe(db, recipe.id);
          router.back();
        },
      },
    ]);
  };

  const saveScaledCopy = async () => {
    if (!recipe) return;
    setSaving(true);
    try {
      const baseTitle = recipe.title.replace(/\s*\(TEMP\)\s*$/, '');
      const newId = await createRecipe(
        db,
        {
          categoryId: recipe.categoryId,
          title: `${baseTitle} (TEMP)`,
          servings,
          ingredients: scaleIngredients(recipe.ingredients, ratio),
          instructions: recipe.instructions,
          notes: recipe.notes,
          sourceUrl: recipe.sourceUrl,
        },
        { isTemp: true, parentId: recipe.parentId ?? recipe.id },
      );
      Alert.alert('Saved', `"${baseTitle} (TEMP)" for ${servings} servings was saved.`, [
        { text: 'OK' },
        { text: 'View copy', onPress: () => router.push({ pathname: '/recipe/[id]', params: { id: String(newId) } }) },
      ]);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  if (!recipe) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>This recipe no longer exists.</Text>
      </View>
    );
  }

  const ratio = scaleRatio(recipe.servings, servings);
  const scaled = servings !== recipe.servings;

  const heading = (text: string) => (
    <Text style={[styles.heading, { color: colors.textMuted }]}>{text}</Text>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/recipe/edit', params: { id: String(recipe.id) } })}
              hitSlop={10}
            >
              <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>Edit</Text>
            </Pressable>
          ),
        }}
      />

      <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {[categoryName, recipe.isTemp ? 'TEMP copy' : ''].filter(Boolean).join(' · ')}
      </Text>

      <View style={[styles.stepper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.stepperLabel, { color: colors.text }]}>Servings</Text>
        <Pressable
          onPress={() => setServings((n) => Math.max(MIN_SERVINGS, n - 1))}
          disabled={servings <= MIN_SERVINGS}
          hitSlop={8}
          accessibilityLabel="Fewer servings"
          style={[styles.stepButton, { borderColor: colors.border, opacity: servings <= MIN_SERVINGS ? 0.4 : 1 }]}
        >
          <Text style={[styles.stepButtonText, { color: colors.primary }]}>−</Text>
        </Pressable>
        <Text style={[styles.stepperValue, { color: colors.text }]}>{servings}</Text>
        <Pressable
          onPress={() => setServings((n) => Math.min(MAX_SERVINGS, n + 1))}
          disabled={servings >= MAX_SERVINGS}
          hitSlop={8}
          accessibilityLabel="More servings"
          style={[styles.stepButton, { borderColor: colors.border, opacity: servings >= MAX_SERVINGS ? 0.4 : 1 }]}
        >
          <Text style={[styles.stepButtonText, { color: colors.primary }]}>+</Text>
        </Pressable>
      </View>
      {scaled ? (
        <View style={styles.scaledRow}>
          <Text style={[styles.scaledNote, { color: colors.textMuted }]}>
            Scaled from {recipe.servings} servings. Not saved.
          </Text>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }} onPress={() => setServings(recipe.servings)}>
            Reset
          </Text>
        </View>
      ) : null}

      {heading('INGREDIENTS')}
      {recipe.ingredients.length === 0 ? (
        <Text style={[styles.body, { color: colors.textMuted }]}>No ingredients added.</Text>
      ) : (
        recipe.ingredients.map((ing, i) => (
          <Text key={i} style={[styles.body, { color: colors.text }]}>
            •  {displayIngredient(ing, ratio, units)}
          </Text>
        ))
      )}

      {heading('INSTRUCTIONS')}
      {recipe.instructions.length === 0 ? (
        <Text style={[styles.body, { color: colors.textMuted }]}>No instructions added.</Text>
      ) : (
        recipe.instructions.map((step, i) => (
          <View key={i} style={styles.step}>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>{i + 1}</Text>
            <Text style={[styles.body, styles.stepText, { color: colors.text }]}>
              {convertTemperatures(step, units)}
            </Text>
          </View>
        ))
      )}

      {recipe.notes ? (
        <>
          {heading('NOTES')}
          <Text style={[styles.body, { color: colors.text }]}>{recipe.notes}</Text>
        </>
      ) : null}

      {recipe.sourceUrl ? (
        <>
          {heading('SOURCE')}
          <Text
            style={[styles.body, { color: colors.primary }]}
            onPress={() => recipe.sourceUrl && Linking.openURL(recipe.sourceUrl).catch(() => {})}
          >
            {recipe.sourceUrl}
          </Text>
        </>
      ) : null}

      {scaled ? (
        <AppButton label={`Save scaled copy (${servings} servings)`} onPress={saveScaledCopy} loading={saving} style={styles.delete} />
      ) : null}

      <AppButton variant="danger" label="Delete recipe" onPress={confirmDelete} style={scaled ? styles.deleteGap : styles.delete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
  meta: { marginTop: 4, fontSize: 15 },
  heading: { fontSize: 12, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 24, marginBottom: 4 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  stepNumber: { fontSize: 16, fontWeight: '700', width: 18, lineHeight: 24 },
  stepText: { flex: 1 },
  delete: { marginTop: 36 },
  deleteGap: { marginTop: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 16 },
  stepperLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  stepButton: { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  stepButtonText: { fontSize: 24, fontWeight: '600', lineHeight: 28 },
  stepperValue: { minWidth: 48, textAlign: 'center', fontSize: 20, fontWeight: '700' },
  scaledRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginHorizontal: 4 },
  scaledNote: { fontSize: 14 },
});
