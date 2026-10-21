export type AssessmentStatus = "critical" | "review" | "clear" | "limited";

export type Assessment = {
  id: string;
  label: string;
  detail: string;
  status: AssessmentStatus;
  category: "device" | "policy" | "application" | "transport";
  action: string;
};

export type Session = {
  id: string;
  title: string;
  scope: string;
  status: "verified" | "open";
  timestamp: string;
  result: string;
};

export const assessments: Assessment[] = [
  {
    id: "usb-debugging",
    label: "USB debugging",
    detail: "Visible developer setting detected. Confirm this is expected for the training device.",
    status: "review",
    category: "device",
    action: "Review setting",
  },
  {
    id: "security-patch",
    label: "Security patch level",
    detail: "Patch age is available to the local app, but manufacturer update state is not controllable here.",
    status: "critical",
    category: "device",
    action: "Open update guidance",
  },
  {
    id: "screen-lock",
    label: "Screen lock policy",
    detail: "A secure screen lock is reported. Stronger policy checks may require device-owner access.",
    status: "clear",
    category: "policy",
    action: "View evidence",
  },
  {
    id: "unknown-sources",
    label: "Install source posture",
    detail: "The signal is unavailable on a standard non-rooted device; no conclusion is made.",
    status: "limited",
    category: "application",
    action: "Read limitation",
  },
];

export const sessions: Session[] = [
  {
    id: "session-041",
    title: "Patch posture baseline",
    scope: "Lab handset A · owner consent",
    status: "verified",
    timestamp: "Today · 14:42",
    result: "1 critical · 1 review",
  },
  {
    id: "session-038",
    title: "USB trust-path walkthrough",
    scope: "Training pair · cooperative protocol",
    status: "open",
    timestamp: "Yesterday · 09:18",
    result: "Transport unavailable",
  },
  {
    id: "session-031",
    title: "Screen-lock policy review",
    scope: "Lab handset B · owner consent",
    status: "verified",
    timestamp: "18 Oct · 16:05",
    result: "All observed checks clear",
  },
];

export const palette = {
  canvas: "#F5F3EE",
  paper: "#FFFFFF",
  ink: "#102A3B",
  muted: "#6F7B81",
  line: "#DCE3DF",
  orange: "#F26B38",
  orangeSoft: "#FFF0E8",
  green: "#2D806A",
  greenSoft: "#EAF5F0",
  yellow: "#B98628",
  yellowSoft: "#FFF6DD",
  red: "#B94E49",
  navy: "#102A3B",
  navyMuted: "#9EB6C3",
  inkSoft: "#E9EFF0",
};

export function statusLabel(status: AssessmentStatus) {
  switch (status) {
    case "critical":
      return "CRITICAL";
    case "review":
      return "REVIEW";
    case "clear":
      return "CLEAR";
    case "limited":
      return "LIMITED";
  }
}
