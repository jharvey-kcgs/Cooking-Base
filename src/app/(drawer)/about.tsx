import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'What this is',
    body: 'Cooking Base is a personal cookbook for the recipes you actually cook. Keep them in categories like Breakfast, Dessert, and Entrée, search across titles, ingredients, and tags, mark favorites, and rescale any recipe for a bigger or smaller crowd. Switch between Standard and Metric whenever you like.',
  },
  {
    heading: 'Getting recipes in',
    body: 'Write a recipe yourself, or import one from a recipe web link, a Google Doc link, or pasted text. Got a whole cookbook in one document? Import it all at once. Sections are matched to your categories, and you review everything before it is saved. Imports always open for you to check first, since recipes found online are messy and the app will not get every line perfect.',
  },
  {
    heading: 'Units and scaling',
    body: 'Changing servings or units only changes how a recipe is shown. Your saved recipe is never altered unless you choose Save scaled copy, which makes a separate recipe marked TEMP. Dry ingredients like flour, sugar, and butter convert to grams in Metric, and oven temperatures convert between °F and °C.',
  },
  {
    heading: 'No account, no server',
    body: 'Everything runs on your device. There is no login and no backend, and nothing about you is collected. The app only goes online when you ask it to import from a link. Because nothing is stored elsewhere, use Data to export a backup now and then.',
  },
];

export default function AboutScreen() {
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? 'unknown';
  const isUat = (Constants.expoConfig?.name ?? '').includes('UAT');

  const rows: [string, string][] = [
    ['Version', version],
    ['Build', isUat ? 'UAT (testing)' : 'Release'],
    ['Storage', 'On this device only'],
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      {SECTIONS.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text style={[styles.heading, { color: colors.text }]}>{s.heading}</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>{s.body}</Text>
        </View>
      ))}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {rows.map(([label, value], i) => (
          <View
            key={label}
            style={[
              styles.row,
              i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>{value}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Part of the Base family: League Base, Media Base, Home Base, and Cooking Base.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  section: { marginBottom: 24 },
  heading: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 15 },
  footer: { fontSize: 12, marginTop: 16 },
});
