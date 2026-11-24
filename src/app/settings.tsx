import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeMode } from '@/theme/colors';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>THEME</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {MODES.map(({ value, label }) => {
          const selected = mode === value;
          return (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              style={[styles.row, selected && { backgroundColor: colors.primary }]}
            >
              <Text
                style={[
                  styles.rowLabel,
                  { color: selected ? colors.onPrimary : colors.text },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Units (Metric / Standard) will be added here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  row: { paddingVertical: 14, paddingHorizontal: 16 },
  rowLabel: { fontSize: 16 },
  hint: { marginTop: 16, marginLeft: 4, fontSize: 14 },
});
