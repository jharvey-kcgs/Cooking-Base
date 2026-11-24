import { Drawer } from 'expo-router/drawer';

import { AppDrawerContent } from '@/components/AppDrawerContent';
import { useTheme } from '@/theme/ThemeProvider';

export default function DrawerLayout() {
  const { colors } = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        drawerStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'Cooking Base' }} />
      <Drawer.Screen name="category/[id]" options={{ title: 'Category' }} />
      <Drawer.Screen name="categories" options={{ title: 'Manage categories' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
      <Drawer.Screen name="data" options={{ title: 'Data' }} />
      <Drawer.Screen name="faq" options={{ title: 'FAQ' }} />
      <Drawer.Screen name="about" options={{ title: 'About' }} />
    </Drawer>
  );
}
