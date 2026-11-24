import { StatusBar } from 'expo-status-bar';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

function DrawerNavigator() {
  const { colors, mode } = useTheme();

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Drawer
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          drawerStyle: { backgroundColor: colors.background },
          drawerActiveTintColor: colors.primary,
          drawerInactiveTintColor: colors.text,
        }}
      >
        <Drawer.Screen name="index" options={{ drawerLabel: 'Home', title: 'Cooking Base' }} />
        <Drawer.Screen name="settings" options={{ drawerLabel: 'Settings', title: 'Settings' }} />
        <Drawer.Screen name="data" options={{ drawerLabel: 'Data', title: 'Data' }} />
        <Drawer.Screen name="faq" options={{ drawerLabel: 'FAQ', title: 'FAQ' }} />
        <Drawer.Screen name="about" options={{ drawerLabel: 'About', title: 'About' }} />
      </Drawer>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <DrawerNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
