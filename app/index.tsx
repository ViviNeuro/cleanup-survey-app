// // app/index.tsx
// import React, { useEffect, useMemo, useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   Alert,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { MultiSelect } from "react-native-element-dropdown";

// import { colors } from "@/src/colors";
// import i18n from "@/src/i18n/i18n";
// import { supabase } from "@/src/lib/supabase";
// import { theme } from "@/src/theme";

// /* -------------------------------------------------------------------------- */
// /*                                   TYPES                                    */
// /* -------------------------------------------------------------------------- */

// const END_USES = ["recycled", "disposed", "reused"] as const;
// type EndUse = (typeof END_USES)[number];

// type TrashTypeKey =
//   | "sachets"
//   | "ropes"
//   | "styrofoam"
//   | "pop_mie"
//   | "soft_plastics"
//   | "medium_plastics_non_renewable"
//   | "medium_plastics_renewable"
//   | "hard_plastics"
//   | "clothing"
//   | "metal_electronics"
//   | "aqua_cups"
//   | "carton_paper"
//   | "plastic_bottles"
//   | "sandals"
//   | "rice_bags";

// type TrashMeta = { key: TrashTypeKey; fixedEndUse?: "disposed" };

// type StrMap = Record<string, string>;

// /* -------------------------------------------------------------------------- */
// /*                                 CONSTANTS                                  */
// /* -------------------------------------------------------------------------- */

// const HOMESTAYS = ["Yenbuba", "Bongkso", "Mongkor", "Paparissa", "Kri"] as const;
// const LOCATIONS = ["Yenbeser", "Mioskun", "Merpati", "Keruwo", "Kri", "Yenbuba", "Koi"] as const;
// const OTHER = "Other" as const;

// const TRASH_TYPES: TrashMeta[] = [
//   // fixed disposed (no choice in UI)
//   { key: "sachets", fixedEndUse: "disposed" },
//   { key: "ropes", fixedEndUse: "disposed" },
//   { key: "styrofoam", fixedEndUse: "disposed" },
//   { key: "pop_mie", fixedEndUse: "disposed" },
//   { key: "clothing", fixedEndUse: "disposed" },
//   { key: "rice_bags", fixedEndUse: "disposed" },
//   { key: "soft_plastics", fixedEndUse: "disposed" },

//   // user chooses end-use
//   { key: "medium_plastics_non_renewable" },
//   { key: "medium_plastics_renewable" },
//   { key: "hard_plastics" },
//   { key: "metal_electronics" },
//   { key: "aqua_cups" },
//   { key: "carton_paper" },
//   { key: "plastic_bottles" },
//   { key: "sandals" },
// ];

// const TRASH_KEYS = TRASH_TYPES.map((t) => t.key) as TrashTypeKey[];
// const TRASH_KEY_SET = new Set<TrashTypeKey>(TRASH_KEYS);

// const isTrashTypeKey = (x: string): x is TrashTypeKey => TRASH_KEY_SET.has(x as TrashTypeKey);

// const fixedEndUseFor = (key: TrashTypeKey): "disposed" | undefined =>
//   TRASH_TYPES.find((t) => t.key === key)?.fixedEndUse;

// /* -------------------------------------------------------------------------- */
// /*                                   HELPERS                                  */
// /* -------------------------------------------------------------------------- */

// const asDropdownData = (items: readonly string[]) => items.map((x) => ({ label: x, value: x }));

// const sanitizeInt = (v: string) => v.replace(/[^\d]/g, "");
// const sanitizeFloat = (v: string) => v.replace(/[^0-9.]/g, "");

// function keepOnlySelected<T extends string, V>(
//   map: Partial<Record<T, V>>,
//   selected: T[]
// ): Partial<Record<T, V>> {
//   const out: Partial<Record<T, V>> = {};
//   for (const k of selected) {
//     if (map[k] !== undefined) out[k] = map[k];
//   }
//   return out;
// }

// function toIntMap(map: StrMap) {
//   const out: Record<string, number> = {};
//   for (const k of Object.keys(map)) {
//     const n = parseInt(map[k] || "", 10);
//     if (!Number.isNaN(n)) out[k] = n;
//   }
//   return out;
// }

// function toFloatMap(map: StrMap) {
//   const out: Record<string, number> = {};
//   for (const k of Object.keys(map)) {
//     const n = parseFloat(map[k] || "");
//     if (!Number.isNaN(n)) out[k] = n;
//   }
//   return out;
// }

// /* -------------------------------------------------------------------------- */
// /*                               SMALL UI PARTS                               */
// /* -------------------------------------------------------------------------- */

// function Pill({
//   text,
//   active,
//   onPress,
// }: {
//   text: string;
//   active: boolean;
//   onPress: () => void;
// }) {
//   return (
//     <TouchableOpacity
//       onPress={onPress}
//       activeOpacity={0.9}
//       style={[
//         styles.pill,
//         {
//           backgroundColor: active ? colors.primary : colors.card,
//           borderColor: active ? colors.primary : colors.border,
//         },
//       ]}
//     >
//       <Text style={{ fontWeight: "800", color: active ? "#FFFFFF" : colors.textPrimary }}>{text}</Text>
//     </TouchableOpacity>
//   );
// }

// function Label({ children }: { children: React.ReactNode }) {
//   return <Text style={theme.label}>{children}</Text>;
// }

// function Card({ children }: { children: React.ReactNode }) {
//   return <View style={theme.card}>{children}</View>;
// }

// function NumberField({
//   value,
//   onChange,
//   placeholder,
//   keyboardType,
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   placeholder: string;
//   keyboardType: "numeric" | "decimal-pad";
// }) {
//   return (
//     <TextInput
//       value={value}
//       onChangeText={onChange}
//       placeholder={placeholder}
//       placeholderTextColor={colors.textSecondary}
//       keyboardType={keyboardType}
//       style={theme.input}
//     />
//   );
// }

// function MultiSelectBlock({
//   label,
//   data,
//   value,
//   onChange,
//   placeholder,
//   searchPlaceholder,
// }: {
//   label: string;
//   data: { label: string; value: string }[];
//   value: string[];
//   onChange: (values: string[]) => void;
//   placeholder: string;
//   searchPlaceholder: string;
// }) {
//   return (
//     <View style={{ marginBottom: 10 }}>
//       <Label>{label}</Label>
//       <View style={styles.selectWrap}>
//         <MultiSelect
//           data={data}
//           labelField="label"
//           valueField="value"
//           value={value}
//           onChange={onChange}
//           search
//           searchPlaceholder={searchPlaceholder}
//           placeholder={placeholder}
//           style={{ paddingVertical: 6 }}
//           placeholderStyle={{ color: colors.textSecondary }}
//           selectedTextStyle={{ color: colors.textPrimary, fontWeight: "700" }}
//           inputSearchStyle={{
//             height: 44,
//             borderRadius: 12,
//             paddingHorizontal: 12,
//             backgroundColor: "#fff",
//             color: colors.textPrimary,
//             borderWidth: 1,
//             borderColor: colors.border,
//           }}
//         />
//       </View>
//     </View>
//   );
// }

// /* -------------------------------------------------------------------------- */
// /*                                   SCREEN                                   */
// /* -------------------------------------------------------------------------- */

// export default function Index() {
//   const { t } = useTranslation();

//   // language toggle
//   const [lang, setLang] = useState<"en" | "id">((i18n.language as "en" | "id") || "en");
//   const changeLang = async (next: "en" | "id") => {
//     await i18n.changeLanguage(next);
//     setLang(next);
//   };

//   // selections
//   const [homestays, setHomestays] = useState<string[]>([]);
//   const [homestayOther, setHomestayOther] = useState("");

//   const [locations, setLocations] = useState<string[]>([]);
//   const [locationOther, setLocationOther] = useState("");

//   const [trashTypes, setTrashTypes] = useState<TrashTypeKey[]>([]);

//   // numeric maps (strings for inputs)
//   const [homestayBags, setHomestayBags] = useState<StrMap>({});
//   const [homestayKg, setHomestayKg] = useState<StrMap>({});
//   const [locationBags, setLocationBags] = useState<StrMap>({});
//   const [locationKg, setLocationKg] = useState<StrMap>({});

//   // trash maps (Partial so {} is valid)
//   const [trashKg, setTrashKg] = useState<Partial<Record<TrashTypeKey, string>>>({});
//   const [trashEndUse, setTrashEndUse] = useState<Partial<Record<TrashTypeKey, EndUse>>>({});

//   // dropdown data
//   const homestayDropdownData = useMemo(
//     () =>
//       asDropdownData([...HOMESTAYS, OTHER]).map((d) => ({
//         ...d,
//         label: d.value === OTHER ? t("common.other") : d.label,
//       })),
//     [t]
//   );

//   const locationDropdownData = useMemo(
//     () =>
//       asDropdownData([...LOCATIONS, OTHER]).map((d) => ({
//         ...d,
//         label: d.value === OTHER ? t("common.other") : d.label,
//       })),
//     [t]
//   );

//   const trashDropdownData = useMemo(
//     () =>
//       TRASH_TYPES.map((x) => ({
//         value: x.key,
//         label: t(`trash.${x.key}`),
//       })),
//     [t]
//   );

//   // final lists including Other typed input
//   const finalHomestays = useMemo(() => {
//     const base = homestays.filter((h) => h !== OTHER);
//     if (homestays.includes(OTHER) && homestayOther.trim()) base.push(homestayOther.trim());
//     return base;
//   }, [homestays, homestayOther]);

//   const finalLocations = useMemo(() => {
//     const base = locations.filter((l) => l !== OTHER);
//     if (locations.includes(OTHER) && locationOther.trim()) base.push(locationOther.trim());
//     return base;
//   }, [locations, locationOther]);

//   // MultiSelect gives string[] → convert safely to TrashTypeKey[]
//   const onTrashChange = (values: string[]) => setTrashTypes(values.filter(isTrashTypeKey));

//   /* -------------------- keep maps aligned + enforce fixed end-use -------------------- */
//   useEffect(() => {
//     // homestays maps
//     const keepH = new Set(finalHomestays);
//     setHomestayBags((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => keepH.has(k))));
//     setHomestayKg((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => keepH.has(k))));

//     // locations maps
//     const keepL = new Set(finalLocations);
//     setLocationBags((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => keepL.has(k))));
//     setLocationKg((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => keepL.has(k))));
//   }, [finalHomestays, finalLocations]);

//   useEffect(() => {
//     setTrashKg((prev) => keepOnlySelected(prev, trashTypes));

//     setTrashEndUse((prev) => {
//       const kept = keepOnlySelected(prev, trashTypes);
//       const next: Partial<Record<TrashTypeKey, EndUse>> = { ...kept };

//       for (const tt of trashTypes) {
//         const fixed = fixedEndUseFor(tt);
//         if (fixed) next[tt] = "disposed";
//         else next[tt] = next[tt] ?? "disposed";
//       }

//       return next;
//     });
//   }, [trashTypes]);

//   const totals = useMemo(() => {
//     const sumInt = (obj: StrMap) => Object.values(obj).reduce((acc, v) => acc + (parseInt(v || "0", 10) || 0), 0);
//     const sumFloat = (obj: StrMap) => Object.values(obj).reduce((acc, v) => acc + (parseFloat(v || "0") || 0), 0);

//     const total_bags_homestay = sumInt(homestayBags);
//     const total_kg_homestay = sumFloat(homestayKg);
//     const total_bags_location = sumInt(locationBags);
//     const total_kg_location = sumFloat(locationKg);

//     const total_kg_trash = Object.values(trashKg).reduce(
//       (acc, v) => acc + (parseFloat(v || "0") || 0),
//       0
//     );

//     return { total_bags_homestay, total_kg_homestay, total_kg_trash, total_bags_location, total_kg_location };
//   }, [homestayBags, homestayKg, locationBags, locationKg, trashKg]);

//   const onSubmit = async () => {
//     const trash_details: Record<string, { kg: number; end_use: EndUse }> = {};

//     for (const tt of trashTypes) {
//       const kg = parseFloat(trashKg[tt] || "");
//       trash_details[tt] = {
//         kg: Number.isNaN(kg) ? 0 : kg,
//         end_use: fixedEndUseFor(tt) ?? trashEndUse[tt] ?? "disposed",
//       };
//     }

//     const row = {
//       homestay_bags: toIntMap(homestayBags),
//       homestay_kg: toFloatMap(homestayKg),
//       location_bags: toIntMap(locationBags),
//       location_kg: toFloatMap(locationKg),
//       trash_details,
//       total_bags_homestay: totals.total_bags_homestay,
//       total_kg_homestay: totals.total_kg_homestay,
//       total_kg_trash: totals.total_kg_trash,
//       total_bags_location: totals.total_bags_location,
//       total_kg_location: totals.total_kg_location,
//     };

//     const { error } = await supabase.from("cleanup_surveys").insert(row);

//     if (error) {
//       Alert.alert(t("common.errorTitle"), error.message);
//       return;
//     }

//     Alert.alert(t("common.successTitle"), t("common.successMsg"));

//     // reset
//     setHomestays([]);
//     setHomestayOther("");
//     setLocations([]);
//     setLocationOther("");
//     setTrashTypes([]);

//     setHomestayBags({});
//     setHomestayKg({});
//     setLocationBags({});
//     setLocationKg({});
//     setTrashKg({});
//     setTrashEndUse({});
//   };

//   return (
//     <ScrollView style={theme.screen} contentContainerStyle={{ paddingBottom: 34 }}>
//       {/* Header */}
//       <View style={styles.headerRow}>
//         <View style={{ flex: 1 }}>
//           <Text style={theme.title}>{t("survey.title")}</Text>
//           <Text style={theme.subtitle}>{t("survey.subtitle")}</Text>
//         </View>

//         <View style={styles.langRow}>
//           <Pill text="EN" active={lang === "en"} onPress={() => changeLang("en")} />
//           <Pill text="ID" active={lang === "id"} onPress={() => changeLang("id")} />
//         </View>
//       </View>

//       {/* 1) Homestay */}
//       <Text style={theme.sectionTitle}>{t("survey.homestay.sectionTitle")}</Text>

//       <MultiSelectBlock
//         label={t("survey.homestay.selectLabel")}
//         data={homestayDropdownData}
//         value={homestays}
//         onChange={setHomestays}
//         placeholder={t("survey.homestay.placeholder")}
//         searchPlaceholder={t("common.search")}
//       />

//       {homestays.includes(OTHER) && (
//         <View style={{ marginBottom: 10 }}>
//           <Label>{t("survey.homestay.otherLabel")}</Label>
//           <TextInput
//             value={homestayOther}
//             onChangeText={setHomestayOther}
//             placeholder={t("survey.homestay.otherPlaceholder")}
//             placeholderTextColor={colors.textSecondary}
//             style={theme.input}
//           />
//         </View>
//       )}

//       {finalHomestays.length > 0 && (
//         <>
//           <Label>{t("survey.homestay.bagsLabel")}</Label>
//           {finalHomestays.map((h) => (
//             <Card key={`hb-${h}`}>
//               <Text style={styles.itemTitle}>{h}</Text>
//               <NumberField
//                 value={homestayBags[h] ?? ""}
//                 onChange={(v) => setHomestayBags((prev) => ({ ...prev, [h]: sanitizeInt(v) }))}
//                 placeholder={t("placeholders.bags")}
//                 keyboardType="numeric"
//               />
//             </Card>
//           ))}

//           <Label>{t("survey.homestay.kgLabel")}</Label>
//           {finalHomestays.map((h) => (
//             <Card key={`hk-${h}`}>
//               <Text style={styles.itemTitle}>{h}</Text>
//               <NumberField
//                 value={homestayKg[h] ?? ""}
//                 onChange={(v) => setHomestayKg((prev) => ({ ...prev, [h]: sanitizeFloat(v) }))}
//                 placeholder={t("placeholders.kg")}
//                 keyboardType="decimal-pad"
//               />
//             </Card>
//           ))}
//         </>
//       )}

//       {/* 2) Trash */}
//       <Text style={theme.sectionTitle}>{t("survey.trash.sectionTitle")}</Text>

//       <MultiSelectBlock
//         label={t("survey.trash.selectLabel")}
//         data={trashDropdownData}
//         value={trashTypes as unknown as string[]} // library types expect string[]
//         onChange={onTrashChange}
//         placeholder={t("survey.trash.placeholder")}
//         searchPlaceholder={t("common.search")}
//       />

//       {trashTypes.length > 0 && <Text style={styles.helperText}>{t("survey.trash.detailsLabel")}</Text>}

//       {trashTypes.map((tt) => {
//         const fixed = fixedEndUseFor(tt);

//         return (
//           <Card key={tt}>
//             <Text style={styles.cardTitle}>{t(`trash.${tt}`)}</Text>

//             <Label>{t("survey.trash.kgLabel")}</Label>
//             <NumberField
//               value={trashKg[tt] ?? ""}
//               onChange={(v) => setTrashKg((p) => ({ ...p, [tt]: sanitizeFloat(v) }))}
//               placeholder={t("placeholders.kg")}
//               keyboardType="decimal-pad"
//             />

//             {fixed ? (
//               <View style={styles.fixedBadge}>
//                 <Text style={styles.fixedBadgeText}>{t("survey.trash.fixedDisposed")}</Text>
//               </View>
//             ) : (
//               <>
//                 <Label>{t("survey.trash.endUseLabel")}</Label>
//                 <View style={styles.pillRow}>
//                   {END_USES.map((eu) => (
//                     <Pill
//                       key={`${tt}-${eu}`}
//                       text={t(`endUse.${eu}`)}
//                       active={(trashEndUse[tt] ?? "disposed") === eu}
//                       onPress={() => setTrashEndUse((p) => ({ ...p, [tt]: eu }))}
//                     />
//                   ))}
//                 </View>
//               </>
//             )}
//           </Card>
//         );
//       })}

//       {/* 3) Locations */}
//       <Text style={theme.sectionTitle}>{t("survey.locations.sectionTitle")}</Text>

//       <MultiSelectBlock
//         label={t("survey.locations.selectLabel")}
//         data={locationDropdownData}
//         value={locations}
//         onChange={setLocations}
//         placeholder={t("survey.locations.placeholder")}
//         searchPlaceholder={t("common.search")}
//       />

//       {locations.includes(OTHER) && (
//         <View style={{ marginBottom: 10 }}>
//           <Label>{t("survey.locations.otherLabel")}</Label>
//           <TextInput
//             value={locationOther}
//             onChangeText={setLocationOther}
//             placeholder={t("survey.locations.otherPlaceholder")}
//             placeholderTextColor={colors.textSecondary}
//             style={theme.input}
//           />
//         </View>
//       )}

//       {finalLocations.length > 0 && (
//         <>
//           <Label>{t("survey.locations.bagsLabel")}</Label>
//           {finalLocations.map((l) => (
//             <Card key={`lb-${l}`}>
//               <Text style={styles.itemTitle}>{l}</Text>
//               <NumberField
//                 value={locationBags[l] ?? ""}
//                 onChange={(v) => setLocationBags((prev) => ({ ...prev, [l]: sanitizeInt(v) }))}
//                 placeholder={t("placeholders.bags")}
//                 keyboardType="numeric"
//               />
//             </Card>
//           ))}

//           <Label>{t("survey.locations.kgLabel")}</Label>
//           {finalLocations.map((l) => (
//             <Card key={`lk-${l}`}>
//               <Text style={styles.itemTitle}>{l}</Text>
//               <NumberField
//                 value={locationKg[l] ?? ""}
//                 onChange={(v) => setLocationKg((prev) => ({ ...prev, [l]: sanitizeFloat(v) }))}
//                 placeholder={t("placeholders.kg")}
//                 keyboardType="decimal-pad"
//               />
//             </Card>
//           ))}
//         </>
//       )}

//       {/* Totals */}
//       <Text style={theme.sectionTitle}>{t("survey.totals.sectionTitle")}</Text>
//       <Card>
//         <Text style={styles.totalLine}>
//           {t("survey.totals.bagsHomestay")}: <Text style={styles.totalValue}>{totals.total_bags_homestay}</Text>
//         </Text>
//         <Text style={styles.totalLine}>
//           {t("survey.totals.kgHomestay")}:{" "}
//           <Text style={styles.totalValue}>{totals.total_kg_homestay.toFixed(1)}</Text>
//         </Text>
//         <Text style={styles.totalLine}>
//           {t("survey.totals.kgTrash")}: <Text style={styles.totalValue}>{totals.total_kg_trash.toFixed(1)}</Text>
//         </Text>
//         <Text style={styles.totalLine}>
//           {t("survey.totals.bagsLocation")}: <Text style={styles.totalValue}>{totals.total_bags_location}</Text>
//         </Text>
//         <Text style={styles.totalLine}>
//           {t("survey.totals.kgLocation")}:{" "}
//           <Text style={styles.totalValue}>{totals.total_kg_location.toFixed(1)}</Text>
//         </Text>
//       </Card>

//       {/* Submit */}
//       <TouchableOpacity onPress={onSubmit} style={styles.submitBtn} activeOpacity={0.9}>
//         <Text style={styles.submitText}>{t("survey.submit")}</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// /* -------------------------------------------------------------------------- */
// /*                                   STYLES                                   */
// /* -------------------------------------------------------------------------- */

// const styles = StyleSheet.create({
//   headerRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     gap: 12,
//     alignItems: "flex-start",
//     marginBottom: 16,
//   },
//   langRow: {
//     flexDirection: "row",
//     gap: 8,
//   },

//   selectWrap: {
//     backgroundColor: colors.card,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 16,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//   },

//   helperText: {
//     fontSize: 13,
//     color: colors.textSecondary,
//     marginBottom: 8,
//   },

//   itemTitle: {
//     fontSize: 14,
//     fontWeight: "900",
//     color: colors.textPrimary,
//     marginBottom: 8,
//   },

//   cardTitle: {
//     fontSize: 16,
//     fontWeight: "900",
//     color: colors.textPrimary,
//     marginBottom: 8,
//   },

//   pillRow: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     marginTop: 2,
//   },

//   pill: {
//     paddingVertical: 8,
//     paddingHorizontal: 14,
//     borderRadius: 999,
//     borderWidth: 1,
//     marginRight: 8,
//     marginBottom: 8,
//   },

//   fixedBadge: {
//     marginTop: 12,
//     paddingVertical: 10,
//     paddingHorizontal: 12,
//     borderRadius: 12,
//     backgroundColor: colors.background, // soft (since you don't have tintSoft)
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   fixedBadgeText: {
//     fontWeight: "800",
//     color: colors.textPrimary,
//   },

//   totalLine: {
//     fontSize: 14,
//     color: colors.textSecondary,
//     marginBottom: 6,
//   },
//   totalValue: {
//     color: colors.textPrimary,
//     fontWeight: "900",
//   },

//   submitBtn: {
//     marginTop: 16,
//     backgroundColor: colors.primary,
//     paddingVertical: 16,
//     borderRadius: 16,
//     alignItems: "center",
//   },
//   submitText: {
//     fontSize: 17,
//     fontWeight: "900",
//     color: "#FFFFFF", // since you don't have colors.onPrimary
//   },
// });








import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/src/colors";
import i18n from "@/src/i18n/i18n";
import { theme } from "@/src/theme";

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

function MenuCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.menuCard}>
      <Text style={styles.menuTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

export default function Index() {
  const { t } = useTranslation();

  // language toggle
  const [lang, setLang] = useState<"en" | "id">((i18n.language as "en" | "id") || "en");
  const changeLang = async (next: "en" | "id") => {
    await i18n.changeLanguage(next);
    setLang(next);
  };

  return (
    <ScrollView style={theme.screen} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={theme.title}>{t("survey.title")}</Text>
          <Text style={theme.subtitle}>{t("survey.subtitle")}</Text>
        </View>

        <View style={styles.langRow}>
          <Pill text="EN" active={lang === "en"} onPress={() => changeLang("en")} />
          <Pill text="ID" active={lang === "id"} onPress={() => changeLang("id")} />
        </View>
      </View>

      {/* Center menu */}
      <View style={styles.centerWrap}>
        <MenuCard
          title={t("menu.locationTitle") /* e.g. "Location" */}
          subtitle={t("menu.locationSubtitle") /* e.g. "Homestays + cleanup locations" */}
          onPress={() => router.push("../location")}
        />

        <MenuCard
          title={t("menu.trashTitle") /* e.g. "Trash type" */}
          subtitle={t("menu.trashSubtitle") /* e.g. "Select trash, kg, end-use" */}
          onPress={() => router.push("../trash")}
        />

        <MenuCard
          title={t("menu.recycleTitle") /* e.g. "Recycle" */}
          subtitle={t("menu.recycleSubtitle") /* e.g. "Coming soon" */}
          onPress={() => router.push("../recycle")}
        />
      </View>

      {/* Optional footer note */}
      <Text style={styles.footerNote}>
        {t("menu.footerNote") /* e.g. "Made for Soul Initiatives – Raja Ampat" */}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 34,
    flexGrow: 1,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 18,
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

  centerWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
    marginTop: 10,
  },

  menuCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
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
    marginTop: 18,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12,
  },
});