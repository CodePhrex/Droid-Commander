import { verifyBreakGlassSignature } from "expo-droid-commander-usb-host";

import type { BreakGlassSignatureVerifier } from "./break-glass-admin";

export function createNativeBreakGlassSignatureVerifier(): BreakGlassSignatureVerifier {
  return {
    verify: ({ payload, signature, issuerId, keyId }) => verifyBreakGlassSignature(payload, signature, issuerId, keyId),
  };
}
