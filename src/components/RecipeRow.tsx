import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import type { RecipeListItem } from '@/db/recipes';
import { useTheme } from '@/theme/ThemeProvider';

// One tappable recipe card: title, "Category · Serves N", and a heart when favorited.
export function RecipeRow({ item }: { item: RecipeListItem }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/recipe/${item.id}`)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
          {item.categoryName} · Serves {item.servings}
        </Text>
      </View>
      {item.isFavorite ? <Text style={[styles.heart, { color: colors.primary }]}>♥</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  text: { flex: 1 },
  title: { fontSize: 17, fontWeight: '600' },
  meta: { marginTop: 4, fontSize: 14 },
  heart: { fontSize: 20, marginLeft: 10 },
});
