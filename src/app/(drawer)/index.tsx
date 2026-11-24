import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { AddFab } from '@/components/AddFab';
import { RecipeRow } from '@/components/RecipeRow';
import { ThemedInput } from '@/components/ThemedInput';
import { listCategoriesWithCounts, type CategoryWithCount } from '@/db/categories';
import {
  listRecentRecipes,
  listRecentlyViewedRecipes,
  searchRecipes,
  type RecipeListItem,
} from '@/db/recipes';
import { listTags, type TagCount } from '@/db/tags';
import { useTheme } from '@/theme/ThemeProvider';

const RECENT_LIMIT = 3;

export default function HomeScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [tags, setTags] = useState<TagCount[]>([]);
  const [recent, setRecent] = useState<RecipeListItem[]>([]);
  const [viewed, setViewed] = useState<RecipeListItem[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [results, setResults] = useState<RecipeListItem[]>([]);
  // Bumped on every focus so search results refresh after edits elsewhere.
  const [refresh, setRefresh] = useState(0);

  const filtering = query.trim() !== '' || favoritesOnly || selectedTags.length > 0;
  const totalRecipes = categories.reduce((sum, c) => sum + c.recipeCount, 0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        listTags(db),
        listRecentRecipes(db, RECENT_LIMIT),
        listRecentlyViewedRecipes(db, RECENT_LIMIT),
        listCategoriesWithCounts(db),
      ]).then(
        ([t, r, v, c]) => {
          if (!active) return;
          setTags(t);
          setRecent(r);
          setViewed(v);
          setCategories(c);
          // Drop a selected tag that no recipe uses any more.
          setSelectedTags((sel) => sel.filter((s) => t.some((x) => x.name.toLowerCase() === s.toLowerCase())));
          setRefresh((n) => n + 1);
        },
      );
      return () => {
        active = false;
      };
    }, [db]),
  );

  useEffect(() => {
    if (!filtering) return;
    let active = true;
    const timer = setTimeout(() => {
      searchRecipes(db, { query, favoritesOnly, tags: selectedTags }).then((rows) => {
        if (active) setResults(rows);
      });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [db, filtering, query, favoritesOnly, selectedTags, refresh]);

  const toggleTag = (name: string) =>
    setSelectedTags((sel) => (sel.includes(name) ? sel.filter((s) => s !== name) : [...sel, name]));

  const clearFilters = () => {
    setQuery('');
    setFavoritesOnly(false);
    setSelectedTags([]);
  };

  const chip = (label: string, selected: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={{ color: selected ? colors.onPrimary : colors.text }}>{label}</Text>
    </Pressable>
  );

  const heading = (text: string) => (
    <Text style={[styles.heading, { color: colors.textMuted }]}>{text}</Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ThemedInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search recipes, ingredients, tags"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}
        >
          {chip('♥ Favorites', favoritesOnly, () => setFavoritesOnly((f) => !f), 'fav')}
          {tags.map((t) => chip(t.name, selectedTags.includes(t.name), () => toggleTag(t.name), `tag-${t.id}`))}
        </ScrollView>

        {filtering ? (
          <>
            <View style={styles.resultsHeader}>
              <Text style={[styles.heading, styles.noMargin, { color: colors.textMuted }]}>
                {results.length === 200 ? '200+ RECIPES' : `${results.length} ${results.length === 1 ? 'RECIPE' : 'RECIPES'}`}
              </Text>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }} onPress={clearFilters}>
                Clear
              </Text>
            </View>
            {results.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>No recipes match.</Text>
            ) : (
              <View style={styles.list}>
                {results.map((r) => (
                  <RecipeRow key={r.id} item={r} />
                ))}
              </View>
            )}
          </>
        ) : totalRecipes === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No recipes yet. Tap + to add one, or import a whole cookbook.
          </Text>
        ) : (
          <>
            {viewed.length > 0 ? (
              <>
                {heading('RECENTLY VIEWED')}
                <View style={styles.list}>
                  {viewed.map((r) => (
                    <RecipeRow key={r.id} item={r} />
                  ))}
                </View>
              </>
            ) : null}

            {heading('RECENTLY ADDED')}
            <View style={styles.list}>
              {recent.map((r) => (
                <RecipeRow key={r.id} item={r} />
              ))}
            </View>

            {heading('CATEGORIES')}
            <View style={styles.tiles}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.navigate(`/category/${c.id}`)}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={2}>
                    {c.name}
                  </Text>
                  <Text style={[styles.tileCount, { color: colors.textMuted }]}>
                    {c.recipeCount} {c.recipeCount === 1 ? 'recipe' : 'recipes'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <AddFab />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120 },
  chips: { gap: 8, paddingVertical: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  heading: { fontSize: 12, fontWeight: '600', marginTop: 20, marginBottom: 8, marginLeft: 2 },
  noMargin: { marginTop: 0, marginBottom: 0 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10, marginHorizontal: 2 },
  list: { gap: 10 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 16, lineHeight: 22 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, minHeight: 78, justifyContent: 'space-between' },
  tileName: { fontSize: 17, fontWeight: '600' },
  tileCount: { marginTop: 8, fontSize: 14 },
});
