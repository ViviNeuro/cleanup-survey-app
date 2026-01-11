// app/_layout.tsx

import { SessionProvider } from "@/src/session/SessionContext";
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
    <SessionProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* Home screen */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
  
          <Stack.Screen name="location" options={{ presentation: "modal", title: "Location" }} />
          <Stack.Screen name="trash" options={{ presentation: "modal", title: "Sorting" }} />
          <Stack.Screen name="recycle" options={{ presentation: "modal", title: "Destinations" }} />
          <Stack.Screen name="analytics" options={{ presentation: "modal", title: "Analytics" }} />
        </Stack>
  
        <StatusBar style="auto" />
      </ThemeProvider>
    </SessionProvider>
  );
}