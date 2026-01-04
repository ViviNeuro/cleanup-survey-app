// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { initI18n } from "@/src/i18n/i18n";

// Keep splash on screen while we load i18n
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      try {
        await initI18n();
      } finally {
        // Even if something fails, don't brick the app
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Survey" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}