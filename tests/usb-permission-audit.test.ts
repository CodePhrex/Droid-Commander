import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ value: null as string | null }));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async () => storage.value,
    setItem: async (_key: string, value: string) => { storage.value = value; },
    removeItem: async () => { storage.value = null; },
  },
}));

vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: async (_algorithm: string, value: string) => createHash("sha256").update(value, "utf8").digest("hex"),
  randomUUID: () => `event-${Math.random()}`,
}));

import { fingerprintUsbDevice, recordUsbPermissionEvent } from "../lib/usb-permission-audit";
import { NativePrivilegedActionLedger } from "../lib/native-privileged-action-ledger";

describe("USB permission audit", () => {
  beforeEach(() => { storage.value = null; });

  it("stores a domain-separated fingerprint instead of the raw Android device name", async () => {
    const rawName = "/dev/bus/usb/001/002";
    const fingerprint = await fingerprintUsbDevice(rawName);

    expect(fingerprint).toMatch(/^usb-[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain(rawName);
    expect(storage.value).toBeNull();
  });

  it("records a granted event in the existing verified hash chain", async () => {
    const result = await recordUsbPermissionEvent({
      operatorId: "operator-1",
      organizationId: "org-1",
      type: "permission-granted",
      deviceName: "/dev/bus/usb/001/002",
      recordedAt: "2026-10-21T18:00:00.000Z",
    });

    expect(result.event.action).toBe("privileged-diagnostic");
    expect(result.event.result).toBe("approved");
    expect(result.event.targetId).toBe(result.deviceFingerprint);
    expect(result.event.summary).toContain("granted");
    expect(JSON.stringify(result.event)).not.toContain("/dev/bus/usb/001/002");
    await expect(new NativePrivilegedActionLedger().verify()).resolves.toMatchObject({ valid: true, entries: 1 });
  });

  it("records denial without authorizing a connection", async () => {
    const result = await recordUsbPermissionEvent({
      operatorId: "operator-1",
      organizationId: "org-1",
      type: "permission-denied",
      deviceName: "/dev/bus/usb/001/003",
    });

    expect(result.event.result).toBe("denied");
    expect(result.event.modifications).toContain("No device settings changed.");
    expect(result.event.summary).toContain("denied");
  });

  it("rejects empty or unsafe identifiers before storage", async () => {
    await expect(recordUsbPermissionEvent({
      operatorId: "operator-1",
      organizationId: "org-1",
      type: "permission-requested",
      deviceName: "",
    })).rejects.toThrow("deviceName is required");

    await expect(recordUsbPermissionEvent({
      operatorId: "operator-1\nspoofed",
      organizationId: "org-1",
      type: "permission-requested",
      deviceName: "/dev/bus/usb/001/004",
    })).rejects.toThrow("operatorId contains unsupported control characters");

    expect(storage.value).toBeNull();
  });
});
