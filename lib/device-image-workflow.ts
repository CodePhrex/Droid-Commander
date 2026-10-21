export type ImageScope = "full-device" | "user-data" | "app-data";
export type ImageSource = "android-owner-backup" | "owner-unlocked-transfer" | "authorized-root-provider" | "forensic-provider-handoff";
export type ImageCapability = "user-data-export" | "full-block-image-read" | "restore-provider";
export type ImageDecision = "ready" | "handoff-required" | "blocked";

export type DeviceImageRequest = {
  authorizationId: string;
  ownerConsent: boolean;
  operatorId: string;
  organizationId: string;
  targetId: string;
  targetUnlocked: boolean;
  encryptionState: "encrypted-unlocked" | "encrypted-locked" | "unencrypted" | "unknown";
  source: ImageSource;
  capabilities: readonly ImageCapability[];
  scope: ImageScope;
  destinationId: string;
  destinationEncrypted: boolean;
  destinationAvailableBytes: number;
  requestedImageBytes: number;
  restoreRequired: boolean;
};

export type ImageReadiness = {
  decision: ImageDecision;
  reasons: string[];
  safetyBoundary: "authorized-provider" | "owner-authenticated" | "handoff-only";
};

export type ImageChunk = { index: number; offset: number; length: number; sha256: string };
export type DeviceImageManifest = {
  imageId: string;
  targetId: string;
  scope: ImageScope;
  providerId: string;
  createdAt: string;
  totalBytes: number;
  chunkSizeBytes: number;
  encryptedAtRest: boolean;
  chunks: readonly ImageChunk[];
};

const SHA256 = /^[a-f0-9]{64}$/i;
const MIN_CHUNK = 1024 * 1024;
const MAX_CHUNK = 64 * 1024 * 1024;

export function planDeviceImage(request: DeviceImageRequest): ImageReadiness {
  const reasons: string[] = [];
  if (!request.authorizationId.trim()) reasons.push("An authorization record is required.");
  if (!request.operatorId.trim() || !request.organizationId.trim() || !request.targetId.trim()) reasons.push("Operator, organization, and target identity are required.");
  if (!request.ownerConsent) reasons.push("Visible owner consent is required.");
  if (!request.destinationId.trim()) reasons.push("A distinct destination is required.");
  if (!request.destinationEncrypted) reasons.push("The destination must be encrypted at rest.");
  if (request.requestedImageBytes <= 0 || request.destinationAvailableBytes < request.requestedImageBytes) reasons.push("Destination capacity is insufficient for the requested image.");
  if (request.encryptionState === "unknown") reasons.push("Encryption state must be known before acquisition.");
  if (request.scope === "full-device" && !request.capabilities.includes("full-block-image-read")) reasons.push("A reviewed full-block image provider is not available.");
  if (request.restoreRequired && !request.capabilities.includes("restore-provider")) reasons.push("A reviewed restore provider is not available.");
  if (request.scope !== "full-device" && !request.capabilities.includes("user-data-export")) reasons.push("A reviewed user-data export provider is not available.");

  if (reasons.length) return { decision: "blocked", reasons, safetyBoundary: "handoff-only" };
  if (!request.targetUnlocked || request.encryptionState === "encrypted-locked") {
    return { decision: "handoff-required", reasons: ["The app will not bypass Android authentication or decrypt a locked device. Use an owner-authenticated Android/OEM path or an authorized forensic provider."], safetyBoundary: "handoff-only" };
  }
  if (request.source === "android-owner-backup" || request.source === "owner-unlocked-transfer") {
    if (request.scope === "full-device") return { decision: "handoff-required", reasons: ["Normal Android backup and owner transfer do not produce a raw full-device image. Use the official backup/migration path or a reviewed imaging provider."], safetyBoundary: "owner-authenticated" };
    return { decision: "ready", reasons: ["Owner-authenticated data export may proceed through the approved Android/OEM provider."], safetyBoundary: "owner-authenticated" };
  }
  return { decision: "ready", reasons: ["An authorized provider can acquire the requested image under the approved scope; Droid Commander will manage manifest and integrity evidence only."], safetyBoundary: "authorized-provider" };
}

export function validateImageManifest(manifest: DeviceImageManifest) {
  const errors: string[] = [];
  if (!manifest.imageId.trim() || !manifest.targetId.trim() || !manifest.providerId.trim()) errors.push("Image, target, and provider IDs are required.");
  if (manifest.totalBytes <= 0) errors.push("Image size must be positive.");
  if (manifest.chunkSizeBytes < MIN_CHUNK || manifest.chunkSizeBytes > MAX_CHUNK) errors.push("Chunk size must be between 1 MiB and 64 MiB.");
  if (!manifest.encryptedAtRest) errors.push("Image storage must be encrypted at rest.");
  let offset = 0;
  manifest.chunks.forEach((chunk, index) => {
    if (chunk.index !== index) errors.push(`Chunk sequence mismatch at index ${index}.`);
    if (chunk.offset !== offset) errors.push(`Chunk offset mismatch at index ${index}.`);
    if (chunk.length <= 0 || chunk.length > manifest.chunkSizeBytes) errors.push(`Invalid chunk length at index ${index}.`);
    if (!SHA256.test(chunk.sha256)) errors.push(`Invalid SHA-256 digest at index ${index}.`);
    offset += chunk.length;
  });
  if (offset !== manifest.totalBytes) errors.push("Chunk lengths do not equal the declared image size.");
  return { valid: errors.length === 0, errors };
}

export function verifyImageChunkDigest(chunk: ImageChunk, actualSha256: string) {
  return SHA256.test(actualSha256) && actualSha256.toLowerCase() === chunk.sha256.toLowerCase();
}
