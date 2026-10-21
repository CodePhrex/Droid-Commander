import { assessLocalDevice, type LocalAssessmentReport } from "./local-assessment";

export const HOST_HISTORY_KEY = "@droidcmd/local-host-assessments/v1";
export const HOST_HISTORY_LIMIT = 100;
export type LocalAssessmentState = {
  phase: "idle" | "running" | "complete" | "unavailable" | "error";
  report: LocalAssessmentReport | null;
  history: LocalAssessmentReport[];
  error: string | null;
  storageWarning: string | null;
  cached: boolean;
};
export type LocalAssessmentDependencies = {
  collect: () => Promise<unknown>;
  detectRoot: () => Promise<unknown>;
  storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
  now: () => string;
  uuid: () => string;
};

/** Single writer shared by Command, Assess, Sessions and Threat Intel. */
export class LocalAssessmentStore {
  private state: LocalAssessmentState = { phase: "idle", report: null, history: [], error: null, storageWarning: null, cached: false };
  private listeners = new Set<() => void>();
  private initialization: Promise<void> | null = null;
  private pendingRun: Promise<void> | null = null;

  constructor(private readonly dependencies: LocalAssessmentDependencies) {}

  getSnapshot = (): LocalAssessmentState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<LocalAssessmentState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  initialize = (): Promise<void> => {
    if (!this.initialization) this.initialization = this.loadHistory();
    return this.initialization;
  };

  private async loadHistory(): Promise<void> {
    try {
      const raw = await this.dependencies.storage.getItem(HOST_HISTORY_KEY);
      if (!raw) return;
      const stored: unknown = JSON.parse(raw);
      if (!stored || typeof stored !== "object" || (stored as { version?: unknown }).version !== 1 || !Array.isArray((stored as { reports?: unknown }).reports)) {
        throw new Error("Unsupported history schema");
      }
      const candidates = (stored as { reports: unknown[] }).reports;
      if (candidates.length > HOST_HISTORY_LIMIT) throw new Error("Oversized history");
      const reports = candidates.map((value): LocalAssessmentReport => {
        if (!value || typeof value !== "object") throw new Error("Invalid history entry");
        const item = value as Record<string, unknown>;
        if (item.schemaVersion !== 1 || item.source !== "android-native" || item.scope !== "local-host" || item.readOnly !== true || item.rootGrantRequested !== false || typeof item.id !== "string" || !/^[a-zA-Z0-9-]{1,128}$/.test(item.id) || typeof item.collectedAt !== "string" || !Number.isFinite(Date.parse(item.collectedAt))) {
          throw new Error("Invalid history entry");
        }
        // Reconstruct all derived checks from allowed fields, not stored claims.
        const report = assessLocalDevice(item.host, item.root, item.id, item.collectedAt);
        if (!report || report.collectedAt !== item.collectedAt) throw new Error("Invalid host evidence");
        return report;
      });
      if (new Set(reports.map((report) => report.id)).size !== reports.length) throw new Error("Duplicate history identity");
      this.update({ history: reports, report: reports[0] ?? null, phase: reports.length ? "complete" : "idle", cached: reports.length > 0 });
    } catch {
      this.update({ storageWarning: "Saved host history could not be read or validated. It has not been presented as verified device evidence." });
    }
  }

  runAssessment = (): Promise<void> => {
    if (this.pendingRun) return this.pendingRun;
    const run = this.performAssessment();
    this.pendingRun = run;
    void run.finally(() => { this.pendingRun = null; });
    return run;
  };

  private async performAssessment(): Promise<void> {
    await this.initialize();
    this.update({ phase: "running", error: null });
    try {
      const [raw, root] = await Promise.all([
        this.dependencies.collect(),
        this.dependencies.detectRoot().catch(() => null),
      ]);
      const report = assessLocalDevice(raw, root, this.dependencies.uuid(), this.dependencies.now());
      if (!report) {
        this.update({ phase: "unavailable", report: null, cached: false, error: "Live local-device collector unavailable. Install the rebuilt custom Android APK; the older APK and Expo Go cannot provide these readings." });
        return;
      }
      const history = [report, ...this.state.history].slice(0, HOST_HISTORY_LIMIT);
      let storageWarning: string | null = null;
      try {
        await this.dependencies.storage.setItem(HOST_HISTORY_KEY, JSON.stringify({ version: 1, reports: history }));
      } catch {
        storageWarning = "Actual readings are visible in memory, but this report was not saved. Do not assume it will survive an app restart.";
      }
      this.update({ phase: "complete", report, history, cached: false, storageWarning });
    } catch {
      // Do not leak arbitrary native exception text into reports or displays.
      this.update({ phase: "error", report: null, cached: false, error: "The native host scan failed. No device findings were fabricated. Retry or inspect the app's diagnostic logs." });
    }
  }
}
