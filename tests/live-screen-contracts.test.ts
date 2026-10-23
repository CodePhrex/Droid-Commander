import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("live screen wiring regression contracts (not physical-device tests)", () => {
  it.each(["app/(tabs)/index.tsx", "app/(tabs)/assessments.tsx"])("%s consumes shared actual assessments rather than seeded findings", (path) => {
    const text = source(path);
    expect(text).toContain("useLocalAssessment");
    expect(text).toContain("runAssessment()");
    expect(text).not.toMatch(/import\s*\{\s*assessments\s*,/);
    expect(text).not.toContain("setTimeout(");
    expect(text).not.toContain("setAssessmentComplete");
  });
  it("has no fixed 72/78 posture or fabricated completed verification in Command", () => {
    const text = source("app/(tabs)/index.tsx");
    expect(text).not.toContain("assessmentComplete ? 78 : 72");
    expect(text).toContain("not a security score");
  });
  it("Sessions opens and shares real recorded reports", () => {
    const text = source("app/(tabs)/sessions.tsx");
    expect(text).not.toMatch(/import.*\bsessions\b.*constants/);
    expect(text).toContain("history.map");
    expect(text).toContain("setOpenReport(report)");
    expect(text).toContain("renderLocalAssessmentMarkdown(report)");
    expect(text).not.toContain("Lab handset A");
  });
  it("Threat Intel compares collected host fields with the actual catalog snapshot", () => {
    const text = source("app/(tabs)/catalog.tsx");
    expect(text).toContain("useLocalAssessment");
    expect(text).toContain("correlateHostVulnerabilities");
    expect(text).toContain("report?.host");
    expect(text).toContain("view?.snapshot");
  });
  it("the shared hook collects natively rather than generating sample records", () => {
    const text = source("hooks/use-local-assessment.ts");
    expect(text).toContain("DeviceOperationRouter");
    expect(text).toContain('"read-posture": () => collectLocalDeviceState()');
    expect(text).toContain('"inspect-root": () => detectRoot()');
    expect(text).toContain('collect: () => readLocal("read-posture")');
    expect(text).not.toContain("requestRootSession");
  });
  it("USB distinguishes real inventory from placeholder approved profiles", () => {
    const text = source("app/(tabs)/usb.tsx");
    expect(text).toContain("getUsbDiagnostics()");
    expect(text).toContain("featureUsbHost");
    expect(text).toContain("NOT CONFIGURED");
    expect(text).toContain("Module presence is not a hardware result");
    expect(text).toContain("router.execute");
  });
});
