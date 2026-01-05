// app/analytics.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { colors } from "@/src/colors";
import { supabase } from "@/src/lib/supabase";
import { theme } from "@/src/theme";

type Period = "day" | "month" | "year";

type AnalyticsRow = {
  period_start: string; // timestamptz -> string

  location_submissions: number;
  trash_submissions: number;
  destinations_submissions: number;

  total_bags_homestay: number;
  total_kg_homestay: number;
  total_bags_location: number;
  total_kg_location: number;

  total_kg_trash: number;
  total_bags_destinations: number;
};

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
      <Text style={{ fontWeight: "900", color: active ? "#fff" : colors.textPrimary }}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {!!subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function formatPeriodLabel(period: Period, iso: string) {
  const d = new Date(iso);

  if (period === "day") {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(d);
  }
  if (period === "month") {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long" }).format(d);
  }
  return new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(d);
}

export default function AnalyticsScreen() {
  const { t } = useTranslation();

  const [period, setPeriod] = useState<Period>("day");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AnalyticsRow[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("cleanup_analytics", { p_period: period });

      if (error) throw error;

      // Supabase types are loose; normalize numbers defensively
      const safe: AnalyticsRow[] = (data ?? []).map((r: any) => ({
        period_start: String(r.period_start),

        location_submissions: Number(r.location_submissions ?? 0),
        trash_submissions: Number(r.trash_submissions ?? 0),
        destinations_submissions: Number(r.destinations_submissions ?? 0),

        total_bags_homestay: Number(r.total_bags_homestay ?? 0),
        total_kg_homestay: Number(r.total_kg_homestay ?? 0),
        total_bags_location: Number(r.total_bags_location ?? 0),
        total_kg_location: Number(r.total_kg_location ?? 0),

        total_kg_trash: Number(r.total_kg_trash ?? 0),
        total_bags_destinations: Number(r.total_bags_destinations ?? 0),
      }));

      setRows(safe);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const cardsByPeriod = useMemo(() => {
    return rows.map((r) => {
      const label = formatPeriodLabel(period, r.period_start);

      return {
        key: r.period_start,
        label,
        stats: [
          {
            title: "Location submissions",
            value: String(r.location_submissions),
          },
          {
            title: "Sorting submissions",
            value: String(r.trash_submissions),
          },
          {
            title: "Destinations submissions",
            value: String(r.destinations_submissions),
          },

          {
            title: "Bags (homestays)",
            value: String(Math.round(r.total_bags_homestay)),
            subtitle: `Kg: ${r.total_kg_homestay.toFixed(1)}`,
          },
          {
            title: "Bags (locations)",
            value: String(Math.round(r.total_bags_location)),
            subtitle: `Kg: ${r.total_kg_location.toFixed(1)}`,
          },

          {
            title: "Kg (sorting)",
            value: r.total_kg_trash.toFixed(1),
          },
          {
            title: "Bags (destinations)",
            value: String(Math.round(r.total_bags_destinations)),
          },
        ],
      };
    });
  }, [rows, period]);

  return (
    <ScrollView
      style={theme.screen}
      contentContainerStyle={{ paddingBottom: 34, paddingHorizontal: 18, paddingTop: 18 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAnalytics} />}
    >
      <Text style={theme.title}>Analytics</Text>
      <Text style={theme.subtitle}>Totals grouped by {period}</Text>

      {/* Period toggle */}
      <View style={styles.periodRow}>
        <Pill text="Day" active={period === "day"} onPress={() => setPeriod("day")} />
        <Pill text="Month" active={period === "month"} onPress={() => setPeriod("month")} />
        <Pill text="Year" active={period === "year"} onPress={() => setPeriod("year")} />
      </View>

      {/* Empty state */}
      {cardsByPeriod.length === 0 ? (
        <Text style={styles.hint}>No submissions yet.</Text>
      ) : (
        <View style={{ marginTop: 14, gap: 18 }}>
          {cardsByPeriod.map((block) => (
            <View key={block.key}>
              <Text style={styles.periodTitle}>{block.label}</Text>
              <View style={styles.grid}>
                {block.stats.map((s) => (
                  <StatCard key={s.title} title={s.title} value={s.value} subtitle={s.subtitle} />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.hint}>Pull down to refresh.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  periodRow: {
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

  periodTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: 10,
  },

  grid: {
    gap: 12,
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
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  cardValue: {
    marginTop: 6,
    fontSize: 26,
    color: colors.textPrimary,
    fontWeight: "900",
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },

  hint: {
    marginTop: 14,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12,
  },
});