import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

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
      <Text style={[styles.title, { color: colors.text }]}>Cooking Base</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        A personal cookbook for the recipes you actually cook. Keep them organized by category and
        import them from the web, a Google Doc, or pasted text.
      </Text>

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
        Your recipes never leave your phone unless you share or export them. There are no accounts
        and no tracking.
      </Text>
      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Part of the Base family: League Base, Media Base, Home Base, and Cooking Base.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  body: { fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 20 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 16 },
  footer: { fontSize: 14, lineHeight: 20, marginTop: 16, marginHorizontal: 4 },
});
