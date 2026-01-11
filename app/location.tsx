// app/location.tsx

useEffect(() => {
  (async () => {
    const { data, error } = await supabase
      .from("cleanup_location_entries")
      .select("id, created_at, collected_at, total_bags_homestay, total_kg_homestay")
      .limit(5);

    console.log("LOCATION ROWS:", data);
    console.log("LOCATION ERROR:", error);
  })();
}, []);


import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MultiSelect } from "react-native-element-dropdown";

import { colors } from "@/src/colors";
import { supabase } from "@/src/lib/supabase";
import { useSession } from "@/src/session/SessionContext";
import { theme } from "@/src/theme";

/**
 * Option B:
 * This modal submits ONLY location-related data (homestays + cleanup locations),
 * creating a separate row in Supabase.
 */
const LOCATION_TABLE = "cleanup_location_entries";

const HOMESTAYS = ["Yenbuba", "Bongkso", "Mongkor", "Paparissa", "Kri"] as const;
const LOCATIONS = ["Yenbeser", "Mioskun", "Merpati", "Keruwo", "Kri", "Yenbuba", "Koi"] as const;
const OTHER = "Other" as const;

type StrMap = Record<string, string>;

const asDropdownData = (items: readonly string[]) => items.map((x) => ({ label: x, value: x }));

/** Integers: bags */
const sanitizeInt = (v: string) => v.replace(/[^\d]/g, "");

/**
 * Floats: kg
 * - allow comma or dot
 * - keep only digits + one decimal separator
 */
function sanitizeKgInput(raw: string) {
  // keep digits, comma, dot
  let s = raw.replace(/[^\d.,]/g, "");

  // if user typed multiple separators, keep the first and remove the rest
  const firstComma = s.indexOf(",");
  const firstDot = s.indexOf(".");

  // decide which separator appears first
  const firstSepIndex = [firstComma, firstDot].filter((i) => i >= 0).sort((a, b) => a - b)[0];

  if (firstSepIndex === undefined) return s;

  const sep = s[firstSepIndex];
  const before = s.slice(0, firstSepIndex);
  const after = s
    .slice(firstSepIndex + 1)
    .replace(/[.,]/g, ""); // remove any other separators

  return `${before}${sep}${after}`;
}

/** Convert "12,5" -> 12.5, "12.5" -> 12.5 */
function parseLocaleFloat(v: string) {
  const normalized = (v || "").replace(",", ".").trim();
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
}

function keepOnlyKeys(obj: StrMap, allowed: Set<string>): StrMap {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => allowed.has(k)));
}

function toIntMap(map: StrMap) {
  const out: Record<string, number> = {};
  for (const k of Object.keys(map)) {
    const n = parseInt(map[k] || "", 10);
    if (!Number.isNaN(n)) out[k] = n;
  }
  return out;
}

function toFloatMapCommaAware(map: StrMap) {
  const out: Record<string, number> = {};
  for (const k of Object.keys(map)) {
    const n = parseLocaleFloat(map[k]);
    if (n !== null) out[k] = n;
  }
  return out;
}

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

/* ------------------------------- UI bits --------------------------------- */

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
      <Text style={{ fontWeight: "800", color: active ? "#FFFFFF" : colors.textPrimary }}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={theme.label}>{children}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={theme.card}>{children}</View>;
}

function NumberField({
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType: "numeric" | "decimal-pad";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      keyboardType={keyboardType}
      style={theme.input}
    />
  );
}

function MultiSelectBlock({
  label,
  data,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
}: {
  label: string;
  data: { label: string; value: string }[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Label>{label}</Label>

      <View style={styles.selectWrap}>
        <MultiSelect
          data={data}
          labelField="label"
          valueField="value"
          value={value}
          onChange={onChange}
          search
          searchPlaceholder={searchPlaceholder}
          placeholder={placeholder}
          style={{ paddingVertical: 6 }}
          placeholderStyle={{ color: colors.textSecondary }}
          selectedTextStyle={{ color: colors.textPrimary, fontWeight: "700" }}
          inputSearchStyle={{
            height: 44,
            borderRadius: 12,
            paddingHorizontal: 12,
            backgroundColor: "#fff",
            color: colors.textPrimary,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />
      </View>
    </View>
  );
}

/* -------------------------------- Screen --------------------------------- */

export default function LocationModal() {
  const { t } = useTranslation();
  const { sessionId, ensureSession } = useSession();

  // optional language toggle inside modal
  const [lang, setLang] = useState<"en" | "id">("en");
  const changeLang = async (next: "en" | "id") => {
    try {
      const mod = await import("@/src/i18n/i18n");
      await mod.default.changeLanguage(next);
    } catch {
      // ignore
    }
    setLang(next);
  };

  // selections
  const [homestays, setHomestays] = useState<string[]>([]);
  const [homestayOther, setHomestayOther] = useState("");

  const [locations, setLocations] = useState<string[]>([]);
  const [locationOther, setLocationOther] = useState("");

  // numeric maps (strings for inputs)
  const [homestayBags, setHomestayBags] = useState<StrMap>({});
  const [homestayKg, setHomestayKg] = useState<StrMap>({});
  const [locationBags, setLocationBags] = useState<StrMap>({});
  const [locationKg, setLocationKg] = useState<StrMap>({});

  const homestayDropdownData = useMemo(
    () =>
      asDropdownData([...HOMESTAYS, OTHER]).map((d) => ({
        ...d,
        label: d.value === OTHER ? t("common.other") : d.label,
      })),
    [t]
  );

  const locationDropdownData = useMemo(
    () =>
      asDropdownData([...LOCATIONS, OTHER]).map((d) => ({
        ...d,
        label: d.value === OTHER ? t("common.other") : d.label,
      })),
    [t]
  );

  const finalHomestays = useMemo(() => {
    const base = homestays.filter((h) => h !== OTHER);
    if (homestays.includes(OTHER) && homestayOther.trim()) base.push(homestayOther.trim());
    return base;
  }, [homestays, homestayOther]);

  const finalLocations = useMemo(() => {
    const base = locations.filter((l) => l !== OTHER);
    if (locations.includes(OTHER) && locationOther.trim()) base.push(locationOther.trim());
    return base;
  }, [locations, locationOther]);

  useEffect(() => {
    const keepH = new Set(finalHomestays);
    setHomestayBags((prev) => keepOnlyKeys(prev, keepH));
    setHomestayKg((prev) => keepOnlyKeys(prev, keepH));

    const keepL = new Set(finalLocations);
    setLocationBags((prev) => keepOnlyKeys(prev, keepL));
    setLocationKg((prev) => keepOnlyKeys(prev, keepL));
  }, [finalHomestays, finalLocations]);

  const totals = useMemo(() => {
    const sumInt = (obj: StrMap) =>
      Object.values(obj).reduce((acc, v) => acc + (parseInt(v || "0", 10) || 0), 0);

    const sumKg = (obj: StrMap) =>
      Object.values(obj).reduce((acc, v) => acc + (parseLocaleFloat(v) ?? 0), 0);

    return {
      total_bags_homestay: sumInt(homestayBags),
      total_kg_homestay: sumKg(homestayKg),
      total_bags_location: sumInt(locationBags),
      total_kg_location: sumKg(locationKg),
    };
  }, [homestayBags, homestayKg, locationBags, locationKg]);

  const reset = () => {
    setHomestays([]);
    setHomestayOther("");
    setLocations([]);
    setLocationOther("");
    setHomestayBags({});
    setHomestayKg({});
    setLocationBags({});
    setLocationKg({});
  };

  const onSubmit = async () => {
    // optional guard – remove if you truly want to allow empty rows
    if (finalHomestays.length === 0 && finalLocations.length === 0) {
      Alert.alert(t("common.errorTitle"), t("survey.locations.needSelection"));
      return;
    }
  const sid = sessionId ?? (await ensureSession());
  if (!sid) {
    Alert.alert(t("common.errorTitle"), "No session available. Please try again.");
    return;
  }

  const row = {
    session_id: sid,
    collected_at: nowIsoWithFixedOffset(9 * 60),
    homestays: finalHomestays,
    locations: finalLocations,
  
    homestay_bags: toIntMap(homestayBags),
    homestay_kg: toFloatMapCommaAware(homestayKg),
  
    location_bags: toIntMap(locationBags),
    location_kg: toFloatMapCommaAware(locationKg),
  
    total_bags_homestay: totals.total_bags_homestay,
    total_kg_homestay: totals.total_kg_homestay,
    total_bags_location: totals.total_bags_location,
    total_kg_location: totals.total_kg_location,
  };

    const { error } = await supabase.from(LOCATION_TABLE).insert(row);

    if (error) {
      Alert.alert(t("common.errorTitle"), error.message);
      return;
    }

    Alert.alert(t("common.successTitle"), t("common.successMsg"));
    reset();
  };

  return (
    <ScrollView style={theme.screen} contentContainerStyle={{ paddingBottom: 34 }}>
      {/* Optional language toggle inside modal */}
      <View style={styles.langRow}>
        <Pill text="EN" active={lang === "en"} onPress={() => changeLang("en")} />
        <Pill text="ID" active={lang === "id"} onPress={() => changeLang("id")} />
      </View>

      {/* Title */}
      <Text style={theme.title}>{t("menu.locationTitle")}</Text>
      <Text style={theme.subtitle}>{t("menu.locationSubtitle")}</Text>

      {/* 1) Homestays */}
      <Text style={theme.sectionTitle}>{t("survey.homestay.title")}</Text>

      <MultiSelectBlock
        label={t("survey.homestay.selectLabel")}
        data={homestayDropdownData}
        value={homestays}
        onChange={setHomestays}
        placeholder={t("survey.homestay.placeholder")}
        searchPlaceholder={t("common.search")}
      />

      {homestays.includes(OTHER) && (
        <View style={{ marginBottom: 10 }}>
          <Label>{t("survey.homestay.otherLabel")}</Label>
          <TextInput
            value={homestayOther}
            onChangeText={setHomestayOther}
            placeholder={t("survey.homestay.otherPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            style={theme.input}
          />
        </View>
      )}

      {finalHomestays.length > 0 && (
        <>
          <Label>{t("survey.homestay.bagsLabel")}</Label>
          {finalHomestays.map((h) => (
            <Card key={`hb-${h}`}>
              <Text style={styles.itemTitle}>{h}</Text>
              <NumberField
                value={homestayBags[h] ?? ""}
                onChange={(v) => setHomestayBags((prev) => ({ ...prev, [h]: sanitizeInt(v) }))}
                placeholder={t("placeholders.bags")}
                keyboardType="numeric"
              />
            </Card>
          ))}

          <Label>{t("survey.homestay.kgLabel")}</Label>
          {finalHomestays.map((h) => (
            <Card key={`hk-${h}`}>
              <Text style={styles.itemTitle}>{h}</Text>
              <NumberField
                value={homestayKg[h] ?? ""}
                onChange={(v) => setHomestayKg((prev) => ({ ...prev, [h]: sanitizeKgInput(v) }))}
                placeholder={t("placeholders.kg")}
                keyboardType="decimal-pad"
              />
            </Card>
          ))}
        </>
      )}

      {/* 2) Cleanup locations */}
      <Text style={theme.sectionTitle}>{t("survey.locations.title")}</Text>

      <MultiSelectBlock
        label={t("survey.locations.selectLabel")}
        data={locationDropdownData}
        value={locations}
        onChange={setLocations}
        placeholder={t("survey.locations.placeholder")}
        searchPlaceholder={t("common.search")}
      />

      {locations.includes(OTHER) && (
        <View style={{ marginBottom: 10 }}>
          <Label>{t("survey.locations.otherLabel")}</Label>
          <TextInput
            value={locationOther}
            onChangeText={setLocationOther}
            placeholder={t("survey.locations.otherPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            style={theme.input}
          />
        </View>
      )}

      {finalLocations.length > 0 && (
        <>
          <Label>{t("survey.locations.bagsLabel")}</Label>
          {finalLocations.map((l) => (
            <Card key={`lb-${l}`}>
              <Text style={styles.itemTitle}>{l}</Text>
              <NumberField
                value={locationBags[l] ?? ""}
                onChange={(v) => setLocationBags((prev) => ({ ...prev, [l]: sanitizeInt(v) }))}
                placeholder={t("placeholders.bags")}
                keyboardType="numeric"
              />
            </Card>
          ))}

          <Label>{t("survey.locations.kgLabel")}</Label>
          {finalLocations.map((l) => (
            <Card key={`lk-${l}`}>
              <Text style={styles.itemTitle}>{l}</Text>
              <NumberField
                value={locationKg[l] ?? ""}
                onChange={(v) => setLocationKg((prev) => ({ ...prev, [l]: sanitizeKgInput(v) }))}
                placeholder={t("placeholders.kg")}
                keyboardType="decimal-pad"
              />
            </Card>
          ))}
        </>
      )}

      {/* Totals */}
      <Text style={theme.sectionTitle}>{t("survey.totals.title")}</Text>
      <Card>
        <Text style={styles.totalLine}>
          {t("survey.totals.bagsHomestay")}:{" "}
          <Text style={styles.totalValue}>{totals.total_bags_homestay}</Text>
        </Text>

        <Text style={styles.totalLine}>
          {t("survey.totals.kgHomestay")}:{" "}
          <Text style={styles.totalValue}>{totals.total_kg_homestay.toFixed(1)}</Text>
        </Text>

        <Text style={styles.totalLine}>
          {t("survey.totals.bagsLocation")}:{" "}
          <Text style={styles.totalValue}>{totals.total_bags_location}</Text>
        </Text>

        <Text style={styles.totalLine}>
          {t("survey.totals.kgLocation")}:{" "}
          <Text style={styles.totalValue}>{totals.total_kg_location.toFixed(1)}</Text>
        </Text>
      </Card>

      {/* Submit */}
      <TouchableOpacity onPress={onSubmit} style={styles.submitBtn} activeOpacity={0.9}>
        <Text style={styles.submitText}>{t("survey.submit")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  langRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  selectWrap: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  totalLine: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
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