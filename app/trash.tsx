// app/trash.tsx
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
import i18n from "@/src/i18n/i18n";
import { supabase } from "@/src/lib/supabase";
import { useSession } from "@/src/session/SessionContext";
import { theme } from "@/src/theme";

const TRASH_TABLE = "cleanup_trash_entries";

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
  | "rice_bags"
  | "other";

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
  "other",
];

const TRASH_SET = new Set(TRASH_TYPES);
const isTrashTypeKey = (x: string): x is TrashTypeKey => TRASH_SET.has(x as TrashTypeKey);

type BagsKgInputMap = Partial<Record<TrashTypeKey, string[]>>;
type BagsKgNumMap = Partial<Record<TrashTypeKey, number[]>>;

// keep digits + comma + dot, and only ONE decimal separator
function sanitizeDecimalInput(v: string) {
  let s = v.replace(/[^\d.,]/g, "");
  const firstSep = s.search(/[.,]/);
  if (firstSep !== -1) {
    const head = s.slice(0, firstSep + 1);
    const tail = s.slice(firstSep + 1).replace(/[.,]/g, "");
    s = head + tail;
  }
  return s;
}

function parseLocaleNumber(input: string): number | null {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

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

function ensureArrayLen(arr: string[] | undefined, len: number) {
  const base = Array.isArray(arr) ? [...arr] : [];
  while (base.length < len) base.push("");
  if (base.length > len) base.length = len;
  return base;
}

function sum(nums: number[]) {
  return nums.reduce((acc, n) => acc + n, 0);
}

/* ------------------------------- UI bits ---------------------------------- */

function Pill({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
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

function Stepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(0, value - 1))}
        style={styles.stepperBtn}
        activeOpacity={0.85}
      >
        <Text style={styles.stepperText}>−</Text>
      </TouchableOpacity>

      <Text style={styles.stepperValue}>{value}</Text>

      <TouchableOpacity
        onPress={() => onChange(value + 1)}
        style={styles.stepperBtn}
        activeOpacity={0.85}
      >
        <Text style={styles.stepperText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

/* -------------------------------- Screen ---------------------------------- */

export default function TrashModal() {
  const { t } = useTranslation();
  const { sessionId, ensureSession } = useSession();

  const [lang, setLang] = useState<"en" | "id">((i18n.language as "en" | "id") || "en");
  const changeLang = async (next: "en" | "id") => {
    await i18n.changeLanguage(next);
    setLang(next);
  };

  const [trashTypes, setTrashTypes] = useState<TrashTypeKey[]>([]);
  const [otherTrashLabel, setOtherTrashLabel] = useState("");
  const [bagsCount, setBagsCount] = useState<Partial<Record<TrashTypeKey, number>>>({});
  const [bagsKgInput, setBagsKgInput] = useState<BagsKgInputMap>({});

  const trashDropdownData = useMemo(
    () =>
      TRASH_TYPES.map((k) => ({
        value: k,
        label: k === "other" ? t("common.other") : t(`trash.${k}`),
      })),
    [t]
  );

  const onTrashChange = (values: string[]) => setTrashTypes(values.filter(isTrashTypeKey));

  useEffect(() => {
    // keep counts for selected keys only
    setBagsCount((prev) => {
      const next: Partial<Record<TrashTypeKey, number>> = {};
      for (const tt of trashTypes) next[tt] = prev[tt] ?? 0;
      return next;
    });

    // keep kg arrays aligned with count for each selected type
    setBagsKgInput((prev) => {
      const next: BagsKgInputMap = {};
      for (const tt of trashTypes) {
        const count = bagsCount[tt] ?? 0;
        next[tt] = ensureArrayLen(prev[tt], count);
      }
      return next;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });

    if (!trashTypes.includes("other")) setOtherTrashLabel("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashTypes]);

  const setCountForType = (tt: TrashTypeKey, count: number) => {
    setBagsCount((p) => ({ ...p, [tt]: count }));
    setBagsKgInput((p) => ({ ...p, [tt]: ensureArrayLen(p[tt], count) }));
  };

  const computed = useMemo(() => {
    const bags_kg_num: BagsKgNumMap = {};
    const totals_kg_by_type: Record<string, number> = {};
    const bags_count_by_type: Record<string, number> = {};

    for (const tt of trashTypes) {
      const count = bagsCount[tt] ?? 0;
      bags_count_by_type[tt] = count;

      const inputs = ensureArrayLen(bagsKgInput[tt], count);
      const nums: number[] = inputs.map(parseLocaleNumber).filter((x): x is number => x !== null);

      bags_kg_num[tt] = nums;
      totals_kg_by_type[tt] = sum(nums);
    }

    const total_bags_trash = Object.values(bags_count_by_type).reduce((a, n) => a + n, 0);
    const total_kg_trash = Object.values(totals_kg_by_type).reduce((a, n) => a + n, 0);

    return { bags_kg_num, totals_kg_by_type, bags_count_by_type, total_bags_trash, total_kg_trash };
  }, [trashTypes, bagsCount, bagsKgInput]);

  const reset = () => {
    setTrashTypes([]);
    setOtherTrashLabel("");
    setBagsCount({});
    setBagsKgInput({});
  };

  const onSubmit = async () => {
    const sid = sessionId ?? (await ensureSession());
    if (!sid) {
      Alert.alert(t("common.errorTitle"), "No session available. Please try again.");
      return;
    }

    const payload = {
      session_id: sid,
      collected_at: nowIsoWithFixedOffset(9 * 60),
      trash_types: trashTypes,
      other_trash_label: trashTypes.includes("other") ? otherTrashLabel.trim() || null : null,
      bags_kg: computed.bags_kg_num,
      totals_kg_by_type: computed.totals_kg_by_type,
      bags_count_by_type: computed.bags_count_by_type,
      total_bags_trash: computed.total_bags_trash,
      total_kg_trash: computed.total_kg_trash,
    };

    const { error } = await supabase.from(TRASH_TABLE).insert(payload);
    if (error) {
      Alert.alert(t("common.errorTitle"), error.message);
      return;
    }

    Alert.alert(t("common.successTitle"), t("common.successMsg"));
    reset();
  };

  return (
    <ScrollView style={theme.screen} contentContainerStyle={{ paddingBottom: 34 }}>
      <View style={styles.langRow}>
        <Pill text="EN" active={lang === "en"} onPress={() => changeLang("en")} />
        <Pill text="ID" active={lang === "id"} onPress={() => changeLang("id")} />
      </View>

      <Text style={theme.title}>{t("menu.trashTitle")}</Text>
      <Text style={theme.subtitle}>{t("menu.trashSubtitle")}</Text>

      <Text style={theme.sectionTitle}>{t("survey.trash.title")}</Text>

      <View style={{ marginBottom: 10 }}>
        <Label>{t("survey.trash.selectLabel")}</Label>
        <View style={styles.selectWrap}>
          <MultiSelect
            data={trashDropdownData}
            labelField="label"
            valueField="value"
            value={trashTypes as unknown as string[]}
            onChange={onTrashChange}
            search
            searchPlaceholder={t("common.search")}
            placeholder={t("survey.trash.placeholder")}
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

      {trashTypes.includes("other") && (
        <Card>
          <Text style={styles.itemTitle}>{t("common.other")}</Text>
          <Label>{t("survey.trash.otherLabel")}</Label>
          <TextInput
            value={otherTrashLabel}
            onChangeText={setOtherTrashLabel}
            placeholder={t("survey.trash.otherPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            style={theme.input}
          />
        </Card>
      )}

      {trashTypes.map((tt) => {
        const count = bagsCount[tt] ?? 0;
        const inputs = ensureArrayLen(bagsKgInput[tt], count);
        const totalForType = computed.totals_kg_by_type[tt] ?? 0;

        const title = tt === "other" ? otherTrashLabel.trim() || t("common.other") : t(`trash.${tt}`);

        return (
          <Card key={tt}>
            <Text style={styles.itemTitle}>{title}</Text>

            <Label>{t("survey.trash.bagsCountLabel")}</Label>
            <Stepper value={count} onChange={(next) => setCountForType(tt, next)} />

            {count > 0 && (
              <>
                <Label>
                  {t("survey.trash.kgPerBagLabel")} ({t("common.optional")})
                </Label>

                {inputs.map((val, idx) => (
                  <View key={`${tt}-bag-${idx}`} style={{ marginTop: 8 }}>
                    <Text style={styles.bagLabel}>{t("survey.trash.bagLabel", { n: idx + 1 })}</Text>
                    <TextInput
                      value={val}
                      onChangeText={(v) => {
                        const cleaned = sanitizeDecimalInput(v);
                        setBagsKgInput((p) => {
                          const nextArr = ensureArrayLen(p[tt], count);
                          nextArr[idx] = cleaned;
                          return { ...p, [tt]: nextArr };
                        });
                      }}
                      placeholder={t("placeholders.kg")}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      style={theme.input}
                    />
                  </View>
                ))}

                <Text style={styles.typeTotal}>
                  {t("survey.trash.totalForType", { item: title })}:{" "}
                  <Text style={styles.typeTotalValue}>{totalForType.toFixed(1)} kg</Text>
                </Text>
              </>
            )}
          </Card>
        );
      })}

      <Text style={theme.sectionTitle}>{t("survey.totals.title")}</Text>
      <Card>
        <Text style={styles.totalLine}>
          {t("survey.totals.bagsTrash")}:{" "}
          <Text style={styles.totalValue}>{computed.total_bags_trash}</Text>
        </Text>
        <Text style={styles.totalLine}>
          {t("survey.totals.kgTrash")}:{" "}
          <Text style={styles.totalValue}>{computed.total_kg_trash.toFixed(1)}</Text>
        </Text>
      </Card>

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
    marginBottom: 10,
  },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperText: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  stepperValue: {
    minWidth: 36,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    color: colors.textPrimary,
  },

  bagLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
    marginBottom: 6,
  },

  typeTotal: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  typeTotalValue: {
    color: colors.textPrimary,
    fontWeight: "900",
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