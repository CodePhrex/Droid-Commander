import { StyleSheet, Text, View } from "react-native";

import { design } from "@/constants/design-system";

type CommanderStateNoticeProps = {
  title: string;
  detail: string;
  kind?: "info" | "warning" | "error";
  footer?: string;
};

const kindColors = {
  info: { accent: design.color.navy, background: "#E9EFF0" },
  warning: { accent: design.color.yellow, background: design.color.yellowSoft },
  error: { accent: design.color.red, background: "#FCECEB" },
} as const;

/** Use for empty, permission-denied, unsupported, and recoverable-error states. */
export function CommanderStateNotice({
  title,
  detail,
  kind = "info",
  footer,
}: CommanderStateNoticeProps) {
  const colors = kindColors[kind];

  return (
    <View
      accessibilityRole="summary"
      style={[styles.container, { backgroundColor: colors.background, borderLeftColor: colors.accent }]}
    >
      <Text style={[styles.title, { color: colors.accent }]}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderRadius: design.radius.md,
    padding: design.space.md,
    gap: design.space.xs,
  },
  title: {
    fontSize: design.type.body,
    fontWeight: "800",
  },
  detail: {
    color: design.color.text,
    fontSize: design.type.caption,
    lineHeight: 17,
  },
  footer: {
    color: design.color.textMuted,
    fontSize: design.type.caption,
    lineHeight: 16,
  },
});
