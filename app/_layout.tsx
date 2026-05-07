import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDataProvider } from '@/src/data';
import { colors } from '@/src/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const navigationTheme = {
  dark: false,
  colors: {
    primary: colors.clay,
    background: colors.paper,
    card: colors.paper,
    text: colors.ink,
    border: colors.rule,
    notification: colors.clay,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppDataProvider>
        <ThemeProvider value={navigationTheme}>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="loan/[id]" options={{ presentation: 'modal' }} />
            </Stack>
            <StatusBar style="dark" />
          </SafeAreaProvider>
        </ThemeProvider>
      </AppDataProvider>
    </GestureHandlerRootView>
  );
}
