import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DB_NAME, migrateDb } from '@/db/schema';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

// The drawer lives in the (drawer) group. Recipe screens sit on top of it in
// this stack, so they get a normal header with a back button.
function RootStack() {
  const { colors, mode } = useTheme();

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe/add" options={{ title: 'Add recipe' }} />
        <Stack.Screen name="recipe/import" options={{ title: 'Import recipe' }} />
        <Stack.Screen name="recipe/cookbook" options={{ title: 'Import cookbook' }} />
        <Stack.Screen name="recipe/edit" options={{ title: 'Recipe' }} />
        <Stack.Screen name="recipe/[id]" options={{ title: '' }} />
        <Stack.Screen name="recipe/cook/[id]" options={{ title: '' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName={DB_NAME} onInit={migrateDb}>
        <ThemeProvider>
          <RootStack />
        </ThemeProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
