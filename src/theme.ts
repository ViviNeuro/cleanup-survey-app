import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const theme = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 10,
    color: colors.textPrimary,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    fontSize: 16,
    color: colors.textPrimary,
  },
});