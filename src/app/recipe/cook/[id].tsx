import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSQLiteContext } from 'expo-sqlite';

import { AppButton } from '@/components/AppButton';
import { getRecipe } from '@/db/recipes';
import { getSetting, getUnits, setSetting } from '@/db/settings';
import { displayIngredient, scaleRatio } from '@/services/scale';
import { convertTemperatures, type UnitSystem } from '@/services/units';
import { useTheme } from '@/theme/ThemeProvider';
import type { Recipe } from '@/types/recipe';

const TEXT_SIZE_KEY = 'cookTextSize';
const SIZES = [22, 26, 30, 36, 42];
const DEFAULT_SIZE_INDEX = 1;

type Tab = 'steps' | 'ingredients';

export default function CookModeScreen() {
  // Keeps the screen on for as long as this screen is open.
  useKeepAwake();

  const { id, servings: servingsParam } = useLocalSearchParams<{ id: string; servings?: string }>();
  const { colors } = useTheme();
  const db = useSQLiteContext();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [units, setUnits] = useState<UnitSystem>('standard');
  const [sizeIndex, setSizeIndex] = useState(DEFAULT_SIZE_INDEX);
  const [tab, setTab] = useState<Tab>('steps');
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const found = await getRecipe(db, Number(id));
        const savedUnits = await getUnits(db);
        const savedSize = Number(await getSetting(db, TEXT_SIZE_KEY));
        if (!active) return;
        setRecipe(found);
        setUnits(savedUnits);
        if (Number.isInteger(savedSize) && savedSize >= 0 && savedSize < SIZES.length) setSizeIndex(savedSize);
        setLoaded(true);
      })();
      return () => {
        active = false;
      };
    }, [db, id]),
  );

  const changeSize = (delta: number) => {
    const next = Math.min(SIZES.length - 1, Math.max(0, sizeIndex + delta));
    setSizeIndex(next);
    void setSetting(db, TEXT_SIZE_KEY, String(next));
  };

  const toggleChecked = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  if (!recipe) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>This recipe no longer exists.</Text>
      </View>
    );
  }

  const fontSize = SIZES[sizeIndex];
  const lineHeight = Math.round(fontSize * 1.4);
  const wanted = Number(servingsParam);
  const servings = Number.isInteger(wanted) && wanted > 0 ? wanted : recipe.servings;
  const ratio = scaleRatio(recipe.servings, servings);
  const total = recipe.instructions.length;
  const lastStep = Math.max(0, total - 1);
  const current = Math.min(step, lastStep);

  const tabButton = (value: Tab, label: string) => (
    <Pressable
      onPress={() => setTab(value)}
      style={[styles.tab, tab === value && { backgroundColor: colors.primary }]}
      accessibilityRole="button"
      accessibilityState={{ selected: tab === value }}
    >
      <Text style={[styles.tabText, { color: tab === value ? colors.onPrimary : colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: recipe.title,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable
                onPress={() => changeSize(-1)}
                disabled={sizeIndex === 0}
                hitSlop={10}
                accessibilityLabel="Smaller text"
                style={{ opacity: sizeIndex === 0 ? 0.35 : 1 }}
              >
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>A−</Text>
              </Pressable>
              <Pressable
                onPress={() => changeSize(1)}
                disabled={sizeIndex === SIZES.length - 1}
                hitSlop={10}
                accessibilityLabel="Larger text"
                style={{ opacity: sizeIndex === SIZES.length - 1 ? 0.35 : 1 }}
              >
                <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '700' }}>A+</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {tabButton('steps', 'Steps')}
        {tabButton('ingredients', 'Ingredients')}
      </View>

      {tab === 'ingredients' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {servings} servings. Tap an ingredient to check it off.
          </Text>
          {recipe.ingredients.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize }}>No ingredients added.</Text>
          ) : (
            recipe.ingredients.map((ing, i) => {
              const done = checked.has(i);
              return (
                <Pressable
                  key={i}
                  onPress={() => toggleChecked(i)}
                  style={[styles.ingredient, { borderColor: colors.border }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                >
                  <Text style={[styles.box, { color: done ? colors.primary : colors.textMuted }]}>{done ? '☑' : '☐'}</Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize,
                      lineHeight,
                      color: done ? colors.textMuted : colors.text,
                      textDecorationLine: done ? 'line-through' : 'none',
                    }}
                  >
                    {displayIngredient(ing, ratio, units)}
                  </Text>
                </Pressable>
              );
            })
          )}
          {recipe.notes ? (
            <Text style={[styles.notes, { color: colors.textMuted, fontSize: Math.min(fontSize, 26) }]}>
              Notes: {recipe.notes}
            </Text>
          ) : null}
        </ScrollView>
      ) : total === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted, fontSize: 18 }}>No instructions added.</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.progress, { color: colors.primary }]}>
              Step {current + 1} of {total}
            </Text>
            <Text style={{ fontSize, lineHeight, color: colors.text }}>
              {convertTemperatures(recipe.instructions[current], units)}
            </Text>
          </ScrollView>
          <View style={[styles.nav, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppButton
              variant="secondary"
              label="Back"
              onPress={() => setStep(Math.max(0, current - 1))}
              disabled={current === 0}
              style={styles.navButton}
            />
            {current === lastStep ? (
              <AppButton label="Start over" variant="secondary" onPress={() => setStep(0)} style={styles.navButton} />
            ) : (
              <AppButton label="Next" onPress={() => setStep(current + 1)} style={styles.navButton} />
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  tabs: { flexDirection: 'row', margin: 16, marginBottom: 0, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 4, gap: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 9 },
  tabText: { fontSize: 16, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 40 },
  hint: { fontSize: 14, marginBottom: 12 },
  progress: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  ingredient: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  box: { fontSize: 28, lineHeight: 34 },
  notes: { marginTop: 24, lineHeight: 30 },
  nav: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  navButton: { flex: 1, minHeight: 60 },
});
