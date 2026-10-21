import { describe, expect, it } from "vitest";

import { planDeviceImage, validateImageManifest, verifyImageChunkDigest } from "../lib/device-image-workflow";

const base = {
  authorizationId: "auth-1",
  ownerConsent: true,
  operatorId: "operator-1",
  organizationId: "org-1",
  targetId: "device-1",
  targetUnlocked: true,
  encryptionState: "encrypted-unlocked" as const,
  source: "authorized-root-provider" as const,
  capabilities: ["full-block-image-read", "restore-provider"] as const,
  scope: "full-device" as const,
  destinationId: "encrypted-disk-1",
  destinationEncrypted: true,
  destinationAvailableBytes: 2_000_000,
  requestedImageBytes: 1_500_000,
  restoreRequired: true,
};

describe("device image workflow", () => {
  it("allows a full image only through an authorized provider boundary", () => {
    const result = planDeviceImage(base);
    expect(result.decision).toBe("ready");
    expect(result.safetyBoundary).toBe("authorized-provider");
  });

  it("requires handoff instead of bypassing a locked encrypted device", () => {
    const result = planDeviceImage({ ...base, targetUnlocked: false, encryptionState: "encrypted-locked" });
    expect(result.decision).toBe("handoff-required");
    expect(result.reasons.join(" ")).toContain("will not bypass");
  });

  it("blocks missing owner consent, encrypted destination, and restore capability", () => {
    const result = planDeviceImage({ ...base, ownerConsent: false, destinationEncrypted: false, capabilities: ["full-block-image-read"], restoreRequired: true });
    expect(result.decision).toBe("blocked");
    expect(result.reasons).toHaveLength(3);
  });

  it("does not call normal Android backup a raw full-device image", () => {
    const result = planDeviceImage({ ...base, source: "android-owner-backup" });
    expect(result.decision).toBe("handoff-required");
    expect(result.reasons.join(" ")).toContain("raw full-device image");
  });

  it("validates sequential encrypted manifests and chunk digests", () => {
    const manifest = {
      imageId: "image-1",
      targetId: "device-1",
      scope: "full-device" as const,
      providerId: "lab-provider",
      createdAt: "2026-10-20T21:30:00.000Z",
      totalBytes: 2_097_152,
      chunkSizeBytes: 1_048_576,
      encryptedAtRest: true,
      chunks: [
        { index: 0, offset: 0, length: 1_048_576, sha256: "a".repeat(64) },
        { index: 1, offset: 1_048_576, length: 1_048_576, sha256: "b".repeat(64) },
      ],
    };
    expect(validateImageManifest(manifest)).toEqual({ valid: true, errors: [] });
    expect(verifyImageChunkDigest(manifest.chunks[0], "A".repeat(64))).toBe(true);
    expect(verifyImageChunkDigest(manifest.chunks[1], "c".repeat(64))).toBe(false);
  });
});
