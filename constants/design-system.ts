import { palette } from "@/constants/commander";

/**
 * Shared visual contract for Droid Commander.
 * Keep screen styling consistent; do not use color alone to communicate status.
 */
export const design = {
  color: {
    ...palette,
    background: palette.canvas,
    surface: palette.paper,
    surfaceSubtle: "#EEF2F1",
    text: palette.ink,
    textMuted: palette.muted,
    border: palette.line,
    accent: palette.orange,
  },
  space: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    card: 16,
    panel: 20,
    pill: 999,
  },
  type: {
    eyebrow: 10,
    caption: 11,
    body: 14,
    bodyLineHeight: 20,
    section: 18,
    title: 30,
  },
  status: {
    critical: { foreground: palette.red, background: "#FCECEB", label: "CRITICAL" },
    review: { foreground: palette.yellow, background: palette.yellowSoft, label: "REVIEW" },
    clear: { foreground: palette.green, background: palette.greenSoft, label: "CLEAR" },
    limited: { foreground: palette.muted, background: "#EEF1F1", label: "LIMITED" },
    demo: { foreground: palette.navy, background: "#E9EFF0", label: "DEMO" },
    unavailable: { foreground: palette.muted, background: "#EEF1F1", label: "UNAVAILABLE" },
  },
} as const;

export type DesignStatus = keyof typeof design.status;
