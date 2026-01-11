// app/analytics.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/src/colors";
import i18n from "@/src/i18n/i18n";
import { supabase } from "@/src/lib/supabase";
import { theme } from "@/src/theme";

type Period = "day" | "month" | "year";

const DEFAULT_TZ = "Asia/Jayapura";

/**
 * Supabase/Postgres "numeric" may arrive as string.
 * bigint may arrive as string/number depending on client settings.
 */
type NumLike = number | string | null | undefined;

type AnalyticsRow = {
  period_start: string; // YYYY-MM-DD

  location_submissions: NumLike;

  trash_submissions: NumLike;
  trash_bags: NumLike;
  total_kg_trash: NumLike;

  total_bags_homestay: NumLike;
  total_kg_homestay: NumLike;
  total_bags_location: NumLike;
  total_kg_location: NumLike;

  destination_submissions: NumLike;
  destination_bags: NumLike;
  destination_landfill: NumLike;
  destination_bank_sampah: NumLike;
  destination_kri: NumLike;
};

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function toInt(n: NumLike): number {
  if (typeof n === "number") return Number.isFinite(n) ? Math.trunc(n) : 0;
  if (typeof n === "string") {
    const parsed = parseInt(n, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toFloat(n: NumLike): number {
  if (typeof n === "number") return Number.isFinite(n) ? n : 0;
  if (typeof n === "string") {
    const parsed = parseFloat(n);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatKg(n: NumLike) {
  return toFloat(n).toFixed(1);
}

/**
 * periodStart is YYYY-MM-DD. Build a UTC date to avoid local timezone shifting.
 */
function formatPeriodTitle(periodStart: string, period: Period, locale: string) {
  const d = new Date(`${periodStart}T00:00:00Z`);
  if (period === "day") return d.toLocaleDateString(locale);
  if (period === "month") return d.toLocaleDateString(locale, { year: "numeric", month: "long" });
  return d.getUTCFullYear().toString();
}

/* -------------------------------------------------------------------------- */
/*                                   UI                                       */
/* -------------------------------------------------------------------------- */

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
      <Text style={{ fontWeight: "800", color: active ? "#fff" : colors.textPrimary }}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {icon} {title}
      </Text>
      {children}
    </View>
  );
}

function RowLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowLine}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ReportLine({ label, value }: { label: string; value: number }) {
  return (
    <Text style={styles.reportLine}>
      {label}: <Text style={styles.reportValue}>{value}</Text>
    </Text>
  );
}

/* -------------------------------------------------------------------------- */
/*                                PERIOD CARD                                 */
/* -------------------------------------------------------------------------- */

function PeriodCard({
  row,
  period,
  locale,
  t,
}: {
  row: AnalyticsRow;
  period: Period;
  locale: string;
  t: (key: string, options?: any) => string;
}) {
  const title = formatPeriodTitle(row.period_start, period, locale);

  // COLLECTED (Location modal)
  const locationReports = toInt(row.location_submissions);
  const bagsHomestays = toInt(row.total_bags_homestay);
  const kgHomestays = formatKg(row.total_kg_homestay);
  const bagsLocations = toInt(row.total_bags_location);
  const kgLocations = formatKg(row.total_kg_location);

  // SORTED (Trash modal)
  const sortingReports = toInt(row.trash_submissions);
  const sortedBags = toInt(row.trash_bags);
  const sortedKg = formatKg(row.total_kg_trash);

  // WHERE IT WENT (Destination modal)
  const destinationReports = toInt(row.destination_submissions);
  const destinationBags = toInt(row.destination_bags);
  const landfill = toInt(row.destination_landfill);
  const bankSampah = toInt(row.destination_bank_sampah);
  const kri = toInt(row.destination_kri);

  const showDestinations = destinationReports > 0 || destinationBags > 0 || landfill > 0 || bankSampah > 0 || kri > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      {/* 1) COLLECTED */}
      <Section icon="📍" title={t("analytics.sections.collected")}>
        <RowLine
          label={t("analytics.labels.homestays")}
          value={`${bagsHomestays} ${t("common.bag")} · ${kgHomestays} kg`}
        />
        <RowLine
          label={t("analytics.labels.locations")}
          value={`${bagsLocations} ${t("common.bag")} · ${kgLocations} kg`}
        />
        <ReportLine label={t("analytics.labels.reports")} value={locationReports} />
      </Section>

      <View style={styles.divider} />

      {/* 2) SORTED */}
      <Section icon="🧺" title={t("analytics.sections.sorted")}>
        <RowLine
          label={t("analytics.labels.sorted")}
          value={`${sortedBags} ${t("common.bag")} · ${sortedKg} kg`}
        />
        <ReportLine label={t("analytics.labels.reports")} value={sortingReports} />
      </Section>

      {/* 3) WHERE IT WENT */}
      {showDestinations && (
        <>
          <View style={styles.divider} />
          <Section icon="🚚" title={t("analytics.sections.sent")}>
            <RowLine
              label={t("analytics.labels.total")}
              value={`${destinationBags} ${t("common.bag")}`}
            />
            <RowLine label={t("analytics.destinations.landfill")} value={`${landfill}`} />
            <RowLine label={t("analytics.destinations.bankSampah")} value={`${bankSampah}`} />
            <RowLine label={t("analytics.destinations.kri")} value={`${kri}`} />
            <ReportLine label={t("analytics.labels.reports")} value={destinationReports} />
          </Section>
        </>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   SCREEN                                   */
/* -------------------------------------------------------------------------- */

export default function AnalyticsScreen() {
  const { t } = useTranslation();

  const [lang, setLang] = useState<"en" | "id">((i18n.language as "en" | "id") || "en");
  const changeLang = async (next: "en" | "id") => {
    await i18n.changeLanguage(next);
    setLang(next);
  };

  const locale = lang === "id" ? "id-ID" : "en-US";

  const [period, setPeriod] = useState<Period>("day");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AnalyticsRow[]>([]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("cleanup_analytics", {
        p_period: period,
        p_tz: DEFAULT_TZ,
      });

      if (error) throw error;
      setRows((data ?? []) as AnalyticsRow[]);
    } catch (e: any) {
      setRows([]);
      console.warn("cleanup_analytics error:", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const subtitle = useMemo(() => {
    if (period === "day") return t("analytics.subtitle.day");
    if (period === "month") return t("analytics.subtitle.month");
    return t("analytics.subtitle.year");
  }, [period, t]);

  return (
    <ScrollView
      style={theme.screen}
      contentContainerStyle={{ paddingBottom: 34, paddingHorizontal: 18, paddingTop: 18 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRows} />}
    >
      <View style={styles.langRow}>
        <Pill text="EN" active={lang === "en"} onPress={() => changeLang("en")} />
        <Pill text="ID" active={lang === "id"} onPress={() => changeLang("id")} />
      </View>

      <Text style={theme.title}>{t("analytics.title")}</Text>
      <Text style={theme.subtitle}>{subtitle}</Text>

      <View style={styles.pillRow}>
        <Pill text={t("analytics.period.day")} active={period === "day"} onPress={() => setPeriod("day")} />
        <Pill
          text={t("analytics.period.month")}
          active={period === "month"}
          onPress={() => setPeriod("month")}
        />
        <Pill text={t("analytics.period.year")} active={period === "year"} onPress={() => setPeriod("year")} />
      </View>

      <View style={{ marginTop: 12, gap: 12 }}>
        {rows.map((r) => (
          <PeriodCard key={r.period_start} row={r} period={period} locale={locale} t={t} />
        ))}

        {!loading && rows.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t("analytics.empty.title")}</Text>
            <Text style={styles.emptyBody}>{t("analytics.empty.body")}</Text>
          </View>
        )}
      </View>

      <Text style={styles.hint}>{t("analytics.hint")}</Text>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  langRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: 12,
  },

  pillRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: 6,
  },

  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: 8,
  },

  rowLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.textPrimary,
  },

  reportLine: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  reportValue: {
    color: colors.textPrimary,
    fontWeight: "900",
  },

  divider: {
    marginTop: 12,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.7,
  },

  hint: {
    marginTop: 14,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    opacity: 0.95,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});