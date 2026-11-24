import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { AppButton } from '@/components/AppButton';
import { getCategory } from '@/db/categories';
import { deleteRecipe, getRecipe } from '@/db/recipes';
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

  // Reload on focus so edits made on the edit screen show up when you come back.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const found = await getRecipe(db, recipeId);
        const category = found ? await getCategory(db, found.categoryId) : null;
        if (!active) return;
        setRecipe(found);
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

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  if (!recipe) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>This recipe no longer exists.</Text>
      </View>
    );
  }

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
        {[categoryName, `Serves ${recipe.servings}`].filter(Boolean).join(' · ')}
      </Text>

      {heading('INGREDIENTS')}
      {recipe.ingredients.length === 0 ? (
        <Text style={[styles.body, { color: colors.textMuted }]}>No ingredients added.</Text>
      ) : (
        recipe.ingredients.map((ing, i) => (
          <Text key={i} style={[styles.body, { color: colors.text }]}>
            •  {ing.rawText}
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
            <Text style={[styles.body, styles.stepText, { color: colors.text }]}>{step}</Text>
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

      <AppButton variant="danger" label="Delete recipe" onPress={confirmDelete} style={styles.delete} />
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
});
