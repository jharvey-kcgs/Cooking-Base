import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { AddFab } from '@/components/AddFab';
import { getCategory, type Category } from '@/db/categories';
import { listRecipesByCategory } from '@/db/recipes';
import { useTheme } from '@/theme/ThemeProvider';
import type { RecipeSummary } from '@/types/recipe';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [category, setCategory] = useState<Category | null>(null);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);

  // Reload every time the screen comes into focus so new/edited/deleted recipes show up.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getCategory(db, categoryId), listRecipesByCategory(db, categoryId)]).then(
        ([found, list]) => {
          if (!active) return;
          setCategory(found);
          setRecipes(list);
          navigation.setOptions({ title: found?.name ?? 'Category' });
        },
      );
      return () => {
        active = false;
      };
    }, [db, categoryId, navigation]),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={recipes}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No {category?.name ?? ''} recipes yet. Tap + to add one.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/recipe/${item.id}`)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>Serves {item.servings}</Text>
            </View>
            {item.isFavorite ? <Text style={[styles.heart, { color: colors.primary }]}>♥</Text> : null}
          </Pressable>
        )}
      />
      <AddFab categoryId={categoryId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 110, gap: 10 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14 },
  rowText: { flex: 1 },
  heart: { fontSize: 20, marginLeft: 10 },
  title: { fontSize: 17, fontWeight: '600' },
  meta: { marginTop: 4, fontSize: 14 },
});
