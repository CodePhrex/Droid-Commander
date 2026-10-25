import { StyleSheet, Text, View } from "react-native";

import { design, type DesignStatus } from "@/constants/design-system";

type CommanderStatusBadgeProps = {
  status: DesignStatus;
  label?: string;
  accessibilityLabel?: string;
};

export function CommanderStatusBadge({
  status,
  label,
  accessibilityLabel,
}: CommanderStatusBadgeProps) {
  const token = design.status[status];
  const visibleLabel = label ?? token.label;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? visibleLabel}
      style={[styles.badge, { backgroundColor: token.background }]}
    >
      <Text style={[styles.label, { color: token.foreground }]}>{visibleLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: design.radius.sm,
    paddingHorizontal: design.space.xs,
    paddingVertical: 5,
  },
  label: {
    fontSize: design.type.eyebrow,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
