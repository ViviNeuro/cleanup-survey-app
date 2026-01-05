// app/_layout.tsx

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

// Keep splash on screen while we load i18n
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      try {
        // i18n is initialized by importing it above
        // so nothing to await here
      } catch (e) {
        console.warn("i18n init failed:", e);
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
            title: "Sorting",
          }}
        />

        {/* Modal: Recycle (blank for now) */}
        <Stack.Screen
          name="recycle"
          options={{
            presentation: "modal",
            title: "Destinations",
          }}
        />

        <Stack.Screen
          name="analytics"
          options={{
            title: "Analytics",
          }}
        />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}