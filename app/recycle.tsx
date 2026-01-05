// app/recycle.tsx
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";

import { colors } from "@/src/colors";
import { supabase } from "@/src/lib/supabase";
import { theme } from "@/src/theme";

/**
 * ✅ Option B architecture:
 * This modal submits ONLY destination-related data (bags + destination per trash type),
 * creating a separate row in Supabase.
 */
const DESTINATIONS_TABLE = "cleanup_destination_surveys";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type TrashTypeKey =
  | "sachets_soft_plastics"
  | "ropes"
  | "styrofoam"
  | "pop_mie"
  | "medium_plastics_non_renewable"
  | "medium_plastics_renewable"
  | "hard_plastics"
  | "clothing"
  | "metal_electronics"
  | "aqua_cups"
  | "carton_paper"
  | "plastic_bottles"
  | "sandals"
  | "rice_bags";

type DestinationKey = "landfill" | "bank_sampah" | "kri";

type RowState = {
  bags: number; // integer >= 0
  destination: DestinationKey | null;
};

type StateMap = Partial<Record<TrashTypeKey, RowState>>;

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

// Keep this list in the same order as you want to show in UI
const TRASH_TYPES: TrashTypeKey[] = [
  "sachets_soft_plastics",
  "ropes",
  "styrofoam",
  "pop_mie",
  "medium_plastics_non_renewable",
  "medium_plastics_renewable",
  "hard_plastics",
  "clothing",
  "metal_electronics",
  "aqua_cups",
  "carton_paper",
  "plastic_bottles",
  "sandals",
  "rice_bags",
];

const DESTINATIONS: { labelKey: string; value: DestinationKey }[] = [
  { labelKey: "destinations.landfill", value: "landfill" },
  { labelKey: "destinations.bank_sampah", value: "bank_sampah" },
  { labelKey: "destinations.kri", value: "kri" },
];

/**
 * Returns ISO string with fixed +09:00 offset (GMT+9).
 * Example: 2026-01-05T12:34:56+09:00
 */
function nowIsoWithFixedOffset(offsetMinutes: number) {
  const now = new Date();
  const localUtcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const targetMs = localUtcMs + offsetMinutes * 60_000;
  const d = new Date(targetMs);

  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offH = pad(Math.floor(abs / 60));
  const offM = pad(abs % 60);

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${sign}${offH}:${offM}`;
}

/* -------------------------------------------------------------------------- */
/*                               SMALL UI PARTS                               */
/* -------------------------------------------------------------------------- */

function Card({ children }: { children: React.ReactNode }) {
  return <View style={theme.card}>{children}</View>;
}

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(value + 1);

  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={dec} style={styles.stepBtn} activeOpacity={0.9}>
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>

      <View style={styles.stepValueWrap}>
        <Text style={styles.stepValue}>{value}</Text>
      </View>

      <TouchableOpacity onPress={inc} style={styles.stepBtn} activeOpacity={0.9}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   SCREEN                                   */
/* -------------------------------------------------------------------------- */

export default function RecycleModal() {
  const { t } = useTranslation();

  const [byType, setByType] = useState<StateMap>({});
  const [submitting, setSubmitting] = useState(false);

  const destinationDropdownData = useMemo(
    () =>
      DESTINATIONS.map((d) => ({
        label: t(d.labelKey),
        value: d.value,
      })),
    [t]
  );

  const getRow = (k: TrashTypeKey): RowState =>
    byType[k] ?? { bags: 0, destination: null };

  const setBags = (k: TrashTypeKey, bags: number) => {
    setByType((prev) => ({
      ...prev,
      [k]: { ...getRow(k), bags },
    }));
  };

  const setDestination = (k: TrashTypeKey, destination: DestinationKey | null) => {
    setByType((prev) => ({
      ...prev,
      [k]: { ...getRow(k), destination },
    }));
  };

  const reset = () => setByType({});

  const totalBags = useMemo(() => {
    return TRASH_TYPES.reduce((acc, k) => acc + (getRow(k).bags || 0), 0);
  }, [byType]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    if (totalBags === 0) {
      return { ok: false, message: t("destinations.errors.noBags") };
    }

    // For each type with bags > 0, destination is required
    for (const k of TRASH_TYPES) {
      const row = getRow(k);
      if (row.bags > 0 && !row.destination) {
        return {
          ok: false,
          message: t("destinations.errors.missingDestination", {
            item: t(`trash.${k}`),
          }),
        };
      }
    }

    return { ok: true as const };
  };

  const onSubmit = async () => {
    const v = validate();
    if (!v.ok) {
      Alert.alert(t("common.errorTitle"), v.message);
      return;
    }

    setSubmitting(true);

    try {
      // Build compact payload: only include trash types with bags > 0
      const destination_details: Record<
        string,
        { bags: number; destination: DestinationKey }
      > = {};

      for (const k of TRASH_TYPES) {
        const row = getRow(k);
        if (row.bags > 0 && row.destination) {
          destination_details[k] = {
            bags: row.bags,
            destination: row.destination,
          };
        }
      }

      const row = {
        collected_at: nowIsoWithFixedOffset(9 * 60), // GMT+9
        destination_details,
        total_bags: totalBags,
      };

      const { error } = await supabase.from(DESTINATIONS_TABLE).insert(row);

      if (error) {
        Alert.alert(t("common.errorTitle"), error.message);
        return;
      }

      Alert.alert(t("common.successTitle"), t("common.successMsg"));
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={theme.screen} contentContainerStyle={{ paddingBottom: 34 }}>
      <Text style={theme.title}>{t("menu.recycleTitle")}</Text>
      <Text style={theme.subtitle}>{t("menu.recycleSubtitle")}</Text>

      <Text style={theme.sectionTitle}>{t("destinations.sectionTitle")}</Text>

      {TRASH_TYPES.map((k) => {
        const row = getRow(k);

        return (
          <Card key={k}>
            <Text style={styles.rowTitle}>{t(`trash.${k}`)}</Text>

            <View style={styles.rowGrid}>
              {/* Bags stepper */}
              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>{t("destinations.bagsLabel")}</Text>
                <Stepper value={row.bags} onChange={(n) => setBags(k, n)} />
              </View>

              {/* Destination dropdown */}
              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>{t("destinations.destinationLabel")}</Text>

                <View style={styles.dropdownWrap}>
                  <Dropdown
                    data={destinationDropdownData}
                    labelField="label"
                    valueField="value"
                    value={row.destination}
                    onChange={(item) => setDestination(k, item.value as DestinationKey)}
                    placeholder={t("destinations.destinationPlaceholder")}
                    style={styles.dropdown}
                    placeholderStyle={{ color: colors.textSecondary }}
                    selectedTextStyle={{ color: colors.textPrimary, fontWeight: "800" }}
                    itemTextStyle={{ color: colors.textPrimary }}
                  />
                </View>

                {/* If bags is 0, destination is optional, so we can visually soften it */}
                {row.bags === 0 && (
                  <Text style={styles.hintText}>{t("destinations.hintOptional")}</Text>
                )}
              </View>
            </View>
          </Card>
        );
      })}

      {/* Totals */}
      <Text style={theme.sectionTitle}>{t("destinations.totalsTitle")}</Text>
      <Card>
        <Text style={styles.totalLine}>
          {t("destinations.totalBags")}:{" "}
          <Text style={styles.totalValue}>{totalBags}</Text>
        </Text>
      </Card>

      {/* Submit */}
      <TouchableOpacity
        onPress={onSubmit}
        style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
        activeOpacity={0.9}
        disabled={submitting}
      >
        <Text style={styles.submitText}>
          {submitting ? t("destinations.submitting") : t("survey.submit")}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  rowTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: 10,
  },

  rowGrid: {
    flexDirection: "row",
    gap: 12,
  },

  smallLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.textSecondary,
    marginBottom: 6,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  stepBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  stepValueWrap: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  stepValue: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.textPrimary,
  },

  dropdownWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dropdown: {
    paddingVertical: 6,
  },

  hintText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },

  totalLine: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  totalValue: {
    color: colors.textPrimary,
    fontWeight: "900",
  },

  submitBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  submitText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});