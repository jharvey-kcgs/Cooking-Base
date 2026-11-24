import { StatusBar } from 'expo-status-bar';
import { Drawer } from 'expo-router/drawer';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppDrawerContent } from '@/components/AppDrawerContent';
import { DB_NAME, migrateDb } from '@/db/schema';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

function DrawerNavigator() {
  const { colors, mode } = useTheme();

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
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
        <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
        <Drawer.Screen name="data" options={{ title: 'Data' }} />
        <Drawer.Screen name="faq" options={{ title: 'FAQ' }} />
        <Drawer.Screen name="about" options={{ title: 'About' }} />
      </Drawer>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName={DB_NAME} onInit={migrateDb}>
        <ThemeProvider>
          <DrawerNavigator />
        </ThemeProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
