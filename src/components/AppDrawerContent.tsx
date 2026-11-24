import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import {
  DrawerContentScrollView,
  DrawerItem,
  type DrawerContentComponentProps,
} from 'expo-router/drawer';
import { useSQLiteContext } from 'expo-sqlite';

import { listCategories, type Category } from '@/db/categories';
import { subscribeCategoriesChanged } from '@/state/categoryEvents';
import { useTheme } from '@/theme/ThemeProvider';

const BOTTOM_ITEMS = [
  { label: 'Settings', path: '/settings' },
  { label: 'Data', path: '/data' },
  { label: 'FAQ', path: '/faq' },
  { label: 'About', path: '/about' },
] as const;

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);

  // Re-read on navigation so newly added categories show up.
  useEffect(() => {
    let active = true;
    listCategories(db).then((rows) => {
      if (active) setCategories(rows);
    });
    return () => {
      active = false;
    };
  }, [db, pathname]);

  // The Manage Categories screen announces changes so the list updates immediately.
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeCategoriesChanged(() => {
      listCategories(db).then((rows) => {
        if (active) setCategories(rows);
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [db]);

  const go = (path: string) => {
    router.navigate(path);
    props.navigation.closeDrawer();
  };

  const item = (label: string, path: string) => (
    <DrawerItem
      key={path}
      label={label}
      focused={pathname === path}
      onPress={() => go(path)}
      activeTintColor={colors.primary}
      inactiveTintColor={colors.text}
      activeBackgroundColor={colors.surface}
    />
  );

  return (
    <DrawerContentScrollView {...props}>
      {item('Home', '/')}

      <View style={styles.sectionRow}>
        <Text style={[styles.section, { color: colors.textMuted }]}>CATEGORIES</Text>
        <Text
          style={[styles.manage, { color: colors.primary }]}
          onPress={() => go('/categories')}
          accessibilityRole="button"
        >
          Manage
        </Text>
      </View>
      {categories.map((c) => item(c.name, `/category/${c.id}`))}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      {BOTTOM_ITEMS.map((b) => item(b.label, b.path))}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
    marginHorizontal: 20,
  },
  section: {
    fontSize: 12,
    fontWeight: '600',
  },
  manage: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
    marginHorizontal: 16,
  },
});
