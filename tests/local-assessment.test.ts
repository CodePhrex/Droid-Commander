import { describe, expect, it } from "vitest";
import { assessLocalDevice, hostInformationRows, normalizeRootObservation, parsePatchDate, renderLocalAssessmentMarkdown, sanitizeLocalDeviceState } from "../lib/local-assessment";

const now = "2026-10-21T18:00:00.000Z";
const raw = {
  manufacturer: "Samsung", model: "TEST-HOST", androidVersion: "16", sdkInt: 36,
  collectedAt: now, securityPatch: "2026-10-01", adbEnabled: false,
  developerOptionsEnabled: false, secureScreenLock: true, deviceLocked: false,
  usbHostSupported: true, usbAccessorySupported: true, usbDeviceCount: 1,
  appInstallRequestsAllowed: false, verifiedBootState: "green",
  totalMemoryBytes: 4 * 1024 ** 3, buildDisplay: "TEST-FIRMWARE", bootloader: "TEST-BOOT",
};
const make = (input: unknown = raw, root: unknown = { availability: "unavailable" }) => assessLocalDevice(input, root, "test-report-1", now)!;

describe("actual local-host assessment", () => {
  it("derives checks from native values, not seeded UI scores", () => {
    const report = make();
    expect(report.host.model).toBe("TEST-HOST");
    expect(report.checks.find((c) => c.id === "adbEnabled")).toMatchObject({ value: "No", status: "clear", observed: true });
    expect(report.summary.observed).toBe(8);
    expect(report).not.toHaveProperty("score");
    expect(report).toMatchObject({ source: "android-native", readOnly: true, scope: "local-host", rootGrantRequested: false });
  });
  it("does not substitute demo findings when native collection is absent", () => {
    expect(assessLocalDevice(null, null, "report", now)).toBeNull();
    expect(assessLocalDevice({}, null, "report", now)).toBeNull();
  });
  it("keeps absent, denied and malformed boolean readings unknown", () => {
    const report = make({ collectedAt: now, adbEnabled: "false", secureScreenLock: null });
    expect(report.host.adbEnabled).toBeNull();
    expect(report.checks.find((c) => c.id === "adbEnabled")).toMatchObject({ status: "limited", observed: false });
    expect(report.summary.clear).toBe(0);
  });
  it("does not confuse absent root detection with proof of an unrooted device", () => {
    const report = make();
    expect(report.root.reason).toContain("not proof");
    expect(report.checks.find((c) => c.id === "root")?.status).toBe("limited");
  });
  it("does not turn an available root-manager entry point into a granted session", () => {
    const report = make(raw, { availability: "manager-available", suPath: "/private/root/path", token: "secret" });
    expect(report.root.availability).toBe("manager-available");
    expect(report.rootGrantRequested).toBe(false);
    expect(JSON.stringify(report)).not.toContain("/private/root/path");
    expect(JSON.stringify(report)).not.toContain("token");
  });
  it("ignores an unexpected granted/root response", () => {
    expect(normalizeRootObservation({ availability: "granted", reason: "password=secret" }).availability).toBe("unknown");
  });
  it("uses an explicit patch-age review threshold, not a critical-CVE diagnosis", () => {
    const check = make({ ...raw, securityPatch: "2026-01-01" }).checks.find((c) => c.id === "securityPatch")!;
    expect(check.status).toBe("review");
    expect(check.limitation).toContain("not a CVE diagnosis");
    expect(check.detail).toContain("90 days");
  });
  it.each(["2026-02-30", "2027-01-01", "invalid", "", null])("does not pass invalid or future patch evidence: %s", (securityPatch) => {
    expect(make({ ...raw, securityPatch }).checks.find((c) => c.id === "securityPatch")?.status).toBe("limited");
  });
  it("validates calendar dates without rollover", () => {
    expect(parsePatchDate("2026-02-30")).toBeNull();
    expect(parsePatchDate("2024-02-29")).not.toBeNull();
  });
  it("keeps actual hardware absence distinct from unreadable evidence", () => {
    const check = make({ ...raw, usbHostSupported: false }).checks.find((c) => c.id === "usbHostSupported")!;
    expect(check).toMatchObject({ observed: true, status: "limited", value: "No" });
  });
  it("drops secret or unrestricted native payload fields and invalid capacities", () => {
    const host = sanitizeLocalDeviceState({ ...raw, serial: "private-device", imei: "private-device", token: "secret", usbDeviceName: "/dev/bus/usb/001", totalMemoryBytes: -1, usbDeviceCount: NaN })!;
    expect(host.totalMemoryBytes).toBeNull();
    expect(host.usbDeviceCount).toBeNull();
    expect(JSON.stringify(host)).not.toContain("private-device");
    expect(JSON.stringify(host)).not.toContain("secret");
    expect(JSON.stringify(host)).not.toContain("/dev/bus");
  });
  it("renders collected firmware and hardware identity with actual report content", () => {
    const report = make();
    const rows = hostInformationRows(report);
    expect(rows.find((r) => r.label === "Firmware / build")?.value).toBe("TEST-FIRMWARE");
    expect(rows.find((r) => r.label === "RAM")?.value).toBe("4.00 GiB");
    const markdown = renderLocalAssessmentMarkdown(report);
    expect(markdown).toContain("TEST-HOST");
    expect(markdown).toContain("Owner consent for a remote target: not claimed");
    expect(markdown).not.toContain("Lab handset A");
    expect(markdown.endsWith("\n")).toBe(true);
  });
});
