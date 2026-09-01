import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';
import { useAuthStore } from '@/stores/authStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

const GPTMakerDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#3c9ffe',
    background: '#0a0a1a',
    card: '#141428',
    border: '#2d2d44',
    text: '#f8f9fa',
  },
};

const GPTMakerLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3c9ffe',
    background: '#ffffff',
    card: '#ffffff',
    border: '#e9ecef',
    text: '#1a1a2e',
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded && initialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, initialized]);

  if (!fontsLoaded || !initialized) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? GPTMakerDark : GPTMakerLight}>
      <Stack screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="bot" />
            <Stack.Screen name="marketplace" />
            <Stack.Screen name="creator" />
            <Stack.Screen name="settings" />
          </>
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
    </ThemeProvider>
  );
}
