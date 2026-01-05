import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/src/colors";
import { supabase } from "@/src/lib/supabase";
import { theme } from "@/src/theme";

type Period = "day" | "month" | "year";

type AnalyticsRow = {
  period_start: string;

  location_submissions: number;
  trash_bags: number;

  total_bags_homestay: number;
  total_kg_homestay: number;
  total_bags_location: number;
  total_kg_location: number;

  total_kg_trash: number;

  destination_bags: number;
  destination_landfill: number;
  destination_bank_sampah: number;
  destination_kri: number;
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
      <Text style={{ fontWeight: "800", color: active ? "#fff" : colors.textPrimary }}>{text}</Text>
    </TouchableOpacity>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function PeriodCard({ row, period }: { row: AnalyticsRow; period: Period }) {
  const d = new Date(row.period_start);

  const title = (() => {
    if (period === "day") return d.toLocaleDateString();
    if (period === "month") return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
    return d.getFullYear().toString();
  })();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}>
          <Stat label="Location submissions" value={String(row.location_submissions)} />
          <Stat label="Trash bags" value={String(row.trash_bags)} />
          <Stat label="Kg (trash)" value={row.total_kg_trash.toFixed(1)} />
        </View>

        <View style={{ flex: 1 }}>
          <Stat label="Bags (homestays)" value={String(row.total_bags_homestay)} />
          <Stat label="Kg (homestays)" value={row.total_kg_homestay.toFixed(1)} />
          <Stat label="Bags (locations)" value={String(row.total_bags_location)} />
          <Stat label="Kg (locations)" value={row.total_kg_location.toFixed(1)} />
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionSmall}>Destinations (bags)</Text>
      <View style={styles.destRow}>
        <Text style={styles.destItem}>Total: {row.destination_bags}</Text>
        <Text style={styles.destItem}>Landfill: {row.destination_landfill}</Text>
        <Text style={styles.destItem}>Bank Sampah: {row.destination_bank_sampah}</Text>
        <Text style={styles.destItem}>Kri: {row.destination_kri}</Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("day");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AnalyticsRow[]>([]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("cleanup_analytics", { p_period: period });
      if (error) throw error;
      setRows((data ?? []) as AnalyticsRow[]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const subtitle = useMemo(() => {
    if (period === "day") return "Totals grouped by day";
    if (period === "month") return "Totals grouped by month";
    return "Totals grouped by year";
  }, [period]);

  return (
    <ScrollView
      style={theme.screen}
      contentContainerStyle={{ paddingBottom: 34, paddingHorizontal: 18, paddingTop: 18 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRows} />}
    >
      <Text style={theme.title}>Analytics</Text>
      <Text style={theme.subtitle}>{subtitle}</Text>

      <View style={styles.pillRow}>
        <Pill text="Day" active={period === "day"} onPress={() => setPeriod("day")} />
        <Pill text="Month" active={period === "month"} onPress={() => setPeriod("month")} />
        <Pill text="Year" active={period === "year"} onPress={() => setPeriod("year")} />
      </View>

      <View style={{ marginTop: 12, gap: 12 }}>
        {rows.map((r) => (
          <PeriodCard key={r.period_start} row={r} period={period} />
        ))}
      </View>

      <Text style={styles.hint}>Pull down to refresh.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  },

  twoCol: {
    marginTop: 10,
    flexDirection: "row",
    gap: 12,
  },

  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  statValue: {
    marginTop: 3,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: "900",
  },

  divider: {
    marginTop: 12,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.7,
  },

  sectionSmall: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
  },

  destRow: {
    marginTop: 8,
    gap: 4,
  },
  destItem: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "700",
  },

  hint: {
    marginTop: 14,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12,
  },
});