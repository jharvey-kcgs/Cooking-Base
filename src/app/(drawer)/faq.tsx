import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How do I add a recipe?',
    a: 'Tap the + button on the Home or category screen. You can write a recipe yourself, or import one from a web link, a Google Doc link, or pasted text. Imports always open in the edit form first so you can fix anything before saving.',
  },
  {
    q: 'Which websites can I import from?',
    a: 'Most recipe sites work, because they publish their recipe in a standard format the app can read. If a site does not, copy the recipe text and use "Paste text" instead.',
  },
  {
    q: 'How do I import from a Google Doc?',
    a: 'In Google Docs tap Share, then set General access to "Anyone with the link" (Viewer). Copy that link and paste it into the app. If the doc is private the import cannot read it, but you can still copy the text and paste it.',
  },
  {
    q: 'Can I import a whole cookbook at once?',
    a: 'Yes. Tap + then "Import a whole cookbook" and paste the link or text. Recipes are split on separator lines, and section headings that match your categories (like "Entrees") are used to file them. Missing categories are created for you. You review the list and choose what to import. Recipes already in the app are skipped, so it is safe to import the same doc twice.',
  },
  {
    q: 'My recipe came in with a missing or odd line. What now?',
    a: 'Open the recipe and tap Edit. Ingredients are one per line and steps are one per line. Lines the app cannot read as a quantity are kept as written.',
  },
  {
    q: 'How do I move or delete a recipe?',
    a: 'Open the recipe and tap Edit to change its category. To delete, open the recipe and use the Delete button at the bottom.',
  },
  {
    q: 'How do I add, rename, delete, or reorder categories?',
    a: 'Open the menu and tap Manage next to CATEGORIES (or go to Settings > Manage categories). Type a name and tap Add for a new one. Tap a category to rename it. Press and hold a row, then drag to change its order; the menu follows that order right away.',
  },
  {
    q: 'What happens to recipes when I delete a category?',
    a: 'You choose: move them to another category, or delete them along with the category (you are asked to confirm twice). You always need at least one category, so the last one cannot be deleted.',
  },
  {
    q: 'What is cook mode?',
    a: 'Open a recipe and tap Start cooking. The screen stays on while you cook. Steps shows one step at a time in large text with Back and Next buttons; Ingredients lets you tap items to check them off. Use A− and A+ at the top to change the text size (it is remembered). If you scaled the servings first, cook mode uses that amount, and it follows your Metric / Standard setting.',
  },
  {
    q: 'How do I search for a recipe?',
    a: 'Use the search bar on the Home screen. It looks through titles, ingredients, notes, categories, and tags, and every word you type has to match, so "chicken beans" finds recipes with both. Results update as you type.',
  },
  {
    q: 'What are Recently viewed and Recently added?',
    a: 'On the Home screen, Recently viewed shows the last few recipes you opened, and Recently added shows the newest ones. Scaled (TEMP) copies are not included. Restoring a backup or deleting all recipes clears the viewed list.',
  },
  {
    q: 'How do favorites work?',
    a: 'Tap the heart at the top of a recipe to favorite it. Favorites show a heart in lists, and the ♥ Favorites chip on the Home screen shows only those. You can combine it with a search or tags.',
  },
  {
    q: 'How do I use tags?',
    a: 'In the edit screen, type tags in the Tags box separated by commas (like "quick, dinner"), or tap an existing tag below it. Tags appear as chips on the Home screen. Tap one to filter, and tap more to narrow further. Tags are not case sensitive.',
  },
  {
    q: 'How do I change the number of servings?',
    a: 'Open a recipe and use the + and − buttons next to Servings. The ingredient amounts update right away. This is temporary, so the saved recipe is not changed, and it resets to the original when you leave the recipe. Tap Reset to go back to the original amounts.',
  },
  {
    q: 'How do I keep a scaled version?',
    a: 'After changing the servings, tap "Save scaled copy". It is saved as a new recipe with (TEMP) added to the title, so you can tell it apart from the original. Delete one like any recipe, or clear them all at once from Data > Delete TEMP recipes.',
  },
  {
    q: 'Why are some ingredients not scaling?',
    a: 'Lines without a clear amount, like "salt to taste", and ranges like "1-2 cups" are shown exactly as written. Amounts are rounded to practical fractions, so 3 eggs for 1½ times the servings shows as 4½.',
  },
  {
    q: 'How do Metric and Standard units work?',
    a: 'Choose Standard or Metric under Settings > Units. Recipes are converted for display only, so your saved recipes never change. Liquids convert to ml, and dry ingredients the app recognizes (flour, sugar, butter, salt, baking soda, chocolate chips, and more) convert to grams. Ounces and pounds convert to grams, and oven temperatures in the steps convert between °F and °C. Things like eggs, cloves, or a pinch are left alone. If the app does not recognize an ingredient, a cup or spoon amount becomes ml instead of grams.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Only on your phone. There is no account and no cloud copy, which means deleting the app deletes your recipes.',
  },
  {
    q: 'How do I back up my recipes?',
    a: 'Go to Data and tap Export backup, then save the file to Files, AirDrop it, or email it to yourself. To restore, tap Restore from backup and choose that file. Restoring replaces everything currently in the app. You can also use this to move your recipes to a new phone.',
  },
  {
    q: 'How do I switch between light and dark?',
    a: 'Open Settings and pick Light or Dark under Theme.',
  },
];

export default function FaqScreen() {
  const { colors } = useTheme();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {FAQ.map((item, i) => {
          const expanded = open === i;
          return (
            <View
              key={item.q}
              style={i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }}
            >
              <Pressable
                onPress={() => setOpen(expanded ? null : i)}
                style={styles.question}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
              >
                <Text style={[styles.q, { color: colors.text }]}>{item.q}</Text>
                <Text style={[styles.chevron, { color: colors.textMuted }]}>{expanded ? '−' : '+'}</Text>
              </Pressable>
              {expanded ? (
                <Text style={[styles.a, { color: colors.textMuted }]}>{item.a}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  question: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  q: { flex: 1, fontSize: 16, fontWeight: '600', paddingRight: 12 },
  chevron: { fontSize: 22 },
  a: { fontSize: 15, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 16 },
});
