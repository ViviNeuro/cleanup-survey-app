// app/analytics.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { colors } from "@/src/colors";
import { supabase } from "@/src/lib/supabase";
import { theme } from "@/src/theme";

const LOCATION_TABLE = "cleanup_location_surveys";
const TRASH_TABLE = "cleanup_trash_surveys";
const DESTINATIONS_TABLE = "cleanup_destinations_surveys"; // change if your table name differs

type Totals = {
  locationSubmissions: number;
  trashSubmissions: number;
  destinationsSubmissions: number;

  totalBagsHomestay: number;
  totalKgHomestay: number;
  totalBagsLocation: number;
  totalKgLocation: number;

  totalKgTrash: number;

  totalBagsDestinations: number;
};

function Card({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {!!subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
    </View>
  );
}

const sumNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const [totals, setTotals] = useState<Totals>({
    locationSubmissions: 0,
    trashSubmissions: 0,
    destinationsSubmissions: 0,
    totalBagsHomestay: 0,
    totalKgHomestay: 0,
    totalBagsLocation: 0,
    totalKgLocation: 0,
    totalKgTrash: 0,
    totalBagsDestinations: 0,
  });

  const fetchTotals = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Locations
      const { data: locRows, error: locErr } = await supabase
        .from(LOCATION_TABLE)
        .select("total_bags_homestay,total_kg_homestay,total_bags_location,total_kg_location");

      if (locErr) throw locErr;

      const locationSubmissions = locRows?.length ?? 0;

      const totalBagsHomestay =
        (locRows ?? []).reduce((acc, r) => acc + sumNumber(r.total_bags_homestay), 0);

      const totalKgHomestay =
        (locRows ?? []).reduce((acc, r) => acc + sumNumber(r.total_kg_homestay), 0);

      const totalBagsLocation =
        (locRows ?? []).reduce((acc, r) => acc + sumNumber(r.total_bags_location), 0);

      const totalKgLocation =
        (locRows ?? []).reduce((acc, r) => acc + sumNumber(r.total_kg_location), 0);

      // 2) Trash
      const { data: trashRows, error: trashErr } = await supabase
        .from(TRASH_TABLE)
        .select("total_kg_trash");

      if (trashErr) throw trashErr;

      const trashSubmissions = trashRows?.length ?? 0;
      const totalKgTrash =
        (trashRows ?? []).reduce((acc, r) => acc + sumNumber(r.total_kg_trash), 0);

      // 3) Destinations (optional — won’t crash if table missing)
      let destinationsSubmissions = 0;
      let totalBagsDestinations = 0;

      const { data: destRows, error: destErr } = await supabase
        .from(DESTINATIONS_TABLE)
        .select("total_bags");

      if (!destErr) {
        destinationsSubmissions = destRows?.length ?? 0;
        totalBagsDestinations =
          (destRows ?? []).reduce((acc, r) => acc + sumNumber(r.total_bags), 0);
      }

      setTotals({
        locationSubmissions,
        trashSubmissions,
        destinationsSubmissions,
        totalBagsHomestay,
        totalKgHomestay,
        totalBagsLocation,
        totalKgLocation,
        totalKgTrash,
        totalBagsDestinations,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTotals();
  }, [fetchTotals]);

  const cards = useMemo(
    () => [
      { title: "Location submissions", value: String(totals.locationSubmissions) },
      { title: "Sorting submissions", value: String(totals.trashSubmissions) },
      { title: "Destinations submissions", value: String(totals.destinationsSubmissions) },

      { title: "Total bags (homestays)", value: String(totals.totalBagsHomestay) },
      { title: "Total kg (homestays)", value: totals.totalKgHomestay.toFixed(1) },

      { title: "Total bags (locations)", value: String(totals.totalBagsLocation) },
      { title: "Total kg (locations)", value: totals.totalKgLocation.toFixed(1) },

      { title: "Total kg (sorting)", value: totals.totalKgTrash.toFixed(1) },

      { title: "Total bags (destinations)", value: String(totals.totalBagsDestinations) },
    ],
    [totals]
  );

  return (
    <ScrollView
      style={theme.screen}
      contentContainerStyle={{ paddingBottom: 34, paddingHorizontal: 18, paddingTop: 18 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTotals} />}
    >
      <Text style={theme.title}>Analytics</Text>
      <Text style={theme.subtitle}>Quick totals from submitted surveys</Text>

      <View style={styles.grid}>
      {cards.map((c) => (
        <Card key={c.title} title={c.title} value={c.value} />
        ))}
      </View>

      <Text style={styles.hint}>
        Pull down to refresh.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: 14,
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
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: "900",
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
  hint: {
    marginTop: 12,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12,
  },
});