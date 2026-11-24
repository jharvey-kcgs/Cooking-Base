import { ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { useTheme } from '@/theme/ThemeProvider';

type ImportMode = 'web' | 'google' | 'text';

export default function AddRecipeScreen() {
  const { colors } = useTheme();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const params = categoryId ? { categoryId } : {};

  const importVia = (mode: ImportMode) =>
    router.push({ pathname: '/recipe/import', params: { ...params, mode } });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.heading, { color: colors.text }]}>How do you want to add it?</Text>

      <AppButton
        label="Write it myself"
        onPress={() => router.push({ pathname: '/recipe/edit', params })}
      />

      <Text style={[styles.section, { color: colors.textMuted }]}>OR IMPORT</Text>
      <AppButton variant="secondary" label="From a web link" onPress={() => importVia('web')} />
      <AppButton
        variant="secondary"
        label="From a Google Doc link"
        onPress={() => importVia('google')}
      />
      <AppButton variant="secondary" label="Paste text" onPress={() => importVia('text')} />

      <Text style={[styles.section, { color: colors.textMuted }]}>MANY RECIPES AT ONCE</Text>
      <AppButton
        variant="secondary"
        label="Import a whole cookbook"
        onPress={() => router.push('/recipe/cookbook')}
      />

      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Imported recipes open in the editor first, so you can check them before saving.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  section: { fontSize: 12, fontWeight: '600', marginTop: 16, marginLeft: 4 },
  hint: { marginTop: 12, fontSize: 14, lineHeight: 20 },
});
