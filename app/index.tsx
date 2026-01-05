// app/index.tsx
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/colors";
import i18n from "@/src/i18n/i18n";
import { theme } from "@/src/theme";

const MAX_CONTENT_WIDTH = 520;
const H_PADDING = 18;

type Lang = "en" | "id";

function Pill({
  text,
  active,
  onPress,
}: {
  text: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.pill,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.pillText, { color: active ? "#FFFFFF" : colors.textPrimary }]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function MenuCard({
  title,
  subtitle,
  onPress,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.9}
      style={[styles.menuCard, disabled && styles.menuCardDisabled]}
    >
      <Text style={styles.menuTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

function LanguageToggle({
  value,
  onChange,
}: {
  value: Lang;
  onChange: (lang: Lang) => void;
}) {
  return (
    <View style={styles.langRow}>
      <Pill text="EN" active={value === "en"} onPress={() => onChange("en")} />
      <Pill text="ID" active={value === "id"} onPress={() => onChange("id")} />
    </View>
  );
}

export default function Index() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [lang, setLang] = useState<Lang>((i18n.language as Lang) || "en");

  const handleChangeLang = async (next: Lang) => {
    await i18n.changeLanguage(next);
    setLang(next);
  };

  const contentContainerStyle = [
    styles.scrollContent,
    {
      minHeight: height,
      paddingTop: insets.top + 14,
      paddingBottom: insets.bottom + 14,
      paddingHorizontal: H_PADDING,
    },
  ];

  return (
    <ScrollView style={theme.screen} contentContainerStyle={contentContainerStyle}>
      {/* Center page horizontally */}
      <View style={styles.outer}>
        <View style={styles.page}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextCol}>
              <Text style={theme.title}>{t("survey.title")}</Text>
              <Text style={theme.subtitle}>{t("survey.subtitle")}</Text>
            </View>

            <LanguageToggle value={lang} onChange={handleChangeLang} />
          </View>

          {/* Spacer to push menu toward center */}
          <View style={styles.flexSpacer} />

          {/* Menu */}
          <View style={styles.menuWrap}>
            <MenuCard
              title={t("menu.locationTitle")}
              subtitle={t("menu.locationSubtitle")}
              onPress={() => router.push("/location")}
            />

            <MenuCard
              title={t("menu.trashTitle")}
              subtitle={t("menu.trashSubtitle")}
              onPress={() => router.push("/trash")}
            />

            <MenuCard
              title={t("menu.recycleTitle")}
              subtitle={t("menu.recycleSubtitle")}
              onPress={() => router.push("/recycle")}
            />
          </View>

          {/* Spacer to push footer to bottom */}
          <View style={styles.flexSpacer} />

          {/* Footer */}
          <Text style={styles.footerNote}>{t("menu.footerNote")}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },

  outer: {
    width: "100%",
    alignSelf: "center",
    maxWidth: MAX_CONTENT_WIDTH,
    flex: 1,
  },

  page: {
    flex: 1,
    width: "100%",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },

  headerTextCol: {
    flex: 1,
    paddingRight: 10,
  },

  langRow: {
    flexDirection: "row",
    gap: 8,
  },

  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },

  pillText: {
    fontWeight: "800",
  },

  flexSpacer: {
    flex: 1,
  },

  menuWrap: {
    gap: 14,
  },

  menuCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },

  menuCardDisabled: {
    opacity: 0.45,
  },

  menuTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.textPrimary,
  },

  menuSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
  },

  footerNote: {
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12,
  },
});