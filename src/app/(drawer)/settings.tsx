import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { getUnits, setUnits } from '@/db/settings';
import type { UnitSystem } from '@/services/units';

import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeMode } from '@/theme/colors';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const UNIT_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'standard', label: 'Standard (cups, oz, °F)' },
  { value: 'metric', label: 'Metric (ml, g, °C)' },
];

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const db = useSQLiteContext();
  const [units, setUnitsState] = useState<UnitSystem>('standard');

  useEffect(() => {
    let active = true;
    getUnits(db).then((u) => active && setUnitsState(u));
    return () => {
      active = false;
    };
  }, [db]);

  const chooseUnits = (next: UnitSystem) => {
    setUnitsState(next);
    void setUnits(db, next);
  };

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
      <Text style={[styles.sectionTitle, styles.gap, { color: colors.textMuted }]}>UNITS</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {UNIT_OPTIONS.map(({ value, label }) => {
          const selected = units === value;
          return (
            <Pressable
              key={value}
              onPress={() => chooseUnits(value)}
              style={[styles.row, selected && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.rowLabel, { color: selected ? colors.onPrimary : colors.text }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Recipes are shown in these units. Your saved recipes are never changed, and measures like
        eggs, cloves, or pinches are left as written.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  gap: { marginTop: 28 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  row: { paddingVertical: 14, paddingHorizontal: 16 },
  rowLabel: { fontSize: 16 },
  hint: { marginTop: 16, marginLeft: 4, fontSize: 14 },
});
