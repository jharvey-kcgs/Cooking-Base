import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { ThemedInput } from '@/components/ThemedInput';
import { importFromGoogleDoc } from '@/services/importers/fromGoogleDoc';
import { parseRecipeText } from '@/services/importers/fromText';
import { importFromUrl } from '@/services/importers/fromUrl';
import { setImportDraft } from '@/state/importDraft';
import { useTheme } from '@/theme/ThemeProvider';
import type { ImportedRecipe } from '@/types/recipe';

type Mode = 'web' | 'google' | 'text';

const COPY: Record<Mode, { heading: string; help: string; placeholder: string }> = {
  web: {
    heading: 'Import from a web link',
    help: 'Paste the link to a recipe page. This works on most recipe sites.',
    placeholder: 'https://...',
  },
  google: {
    heading: 'Import from a Google Doc',
    help: 'Paste the doc link. The doc must be shared as "Anyone with the link" for the app to read it.',
    placeholder: 'https://docs.google.com/document/d/...',
  },
  text: {
    heading: 'Paste recipe text',
    help: 'Paste the whole recipe. Lines under "Ingredients" and "Instructions" headings are sorted automatically.',
    placeholder: 'Paste the recipe here',
  },
};

export default function ImportScreen() {
  const { colors } = useTheme();
  const { mode: modeParam, categoryId } = useLocalSearchParams<{ mode?: string; categoryId?: string }>();
  const mode: Mode = modeParam === 'google' || modeParam === 'text' ? modeParam : 'web';
  const copy = COPY[mode];

  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      let recipe: ImportedRecipe;
      if (mode === 'web') recipe = await importFromUrl(value);
      else if (mode === 'google') recipe = await importFromGoogleDoc(value);
      else recipe = parseRecipeText(value);

      setImportDraft(recipe);
      router.replace({ pathname: '/recipe/edit', params: categoryId ? { categoryId } : {} });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={[styles.heading, { color: colors.text }]}>{copy.heading}</Text>
      <Text style={[styles.help, { color: colors.textMuted }]}>{copy.help}</Text>

      <ThemedInput
        value={value}
        onChangeText={setValue}
        placeholder={copy.placeholder}
        multiline={mode === 'text'}
        style={mode === 'text' ? styles.textArea : undefined}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={mode === 'text' ? 'default' : 'url'}
        editable={!loading}
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <AppButton
        label="Import"
        onPress={run}
        loading={loading}
        disabled={value.trim().length === 0}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  heading: { fontSize: 22, fontWeight: '700' },
  help: { fontSize: 15, lineHeight: 21 },
  textArea: { minHeight: 220 },
  error: { fontSize: 15, lineHeight: 21 },
});
