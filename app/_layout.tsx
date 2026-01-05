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

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      try {
        await initI18n();
      } catch (e) {
        // don't brick the app if i18n fails
        console.warn("initI18n failed:", e);
      } finally {
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Home screen with 3 buttons */}
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        {/* Modal: Location (homestays + cleanup locations) */}
        <Stack.Screen
          name="location"
          options={{
            presentation: "modal",
            title: "Location",
          }}
        />

        {/* Modal: Trash type */}
        <Stack.Screen
          name="trash"
          options={{
            presentation: "modal",
            title: "Trash type",
          }}
        />

        {/* Modal: Recycle (blank for now) */}
        <Stack.Screen
          name="recycle"
          options={{
            presentation: "modal",
            title: "Recycle",
          }}
        />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}