import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { palette } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.canvas },
          animation: 'default',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="practice" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}
