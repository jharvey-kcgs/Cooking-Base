import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

// Floating "+" button that starts the add-recipe flow. Pass a categoryId
// to pre-select that category in the new recipe.
export function AddFab({ categoryId }: { categoryId?: number }) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityLabel="Add recipe"
      onPress={() =>
        router.push({
          pathname: '/recipe/add',
          params: categoryId ? { categoryId: String(categoryId) } : {},
        })
      }
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.plus, { color: colors.onPrimary }]}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  plus: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '400',
  },
});
