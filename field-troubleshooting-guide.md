# Droid Commander: Technician Field Troubleshooting Guide

This quick-reference guide provides immediate resolution steps for common operational issues encountered during live hardware testing and field servicing with Droid Commander.

---

## 1. USB OTG Host Detection & Framing Issues

### Symptoms
* Target device is connected via USB OTG, but Droid Commander displays **"No USB Device Detected"**.
* The Android OS USB Permission dialog (`Allow Droid Commander to access USB device?`) fails to pop up.

### Resolution Protocol
1. **Re-seat Hardware Links:** Unplug both ends of the USB-C OTG cable, wait 3 seconds, and re-insert the host connector into the Technician Host Device first.
2. **Verify USB Debugging:** On the Target Device, confirm **USB Debugging** is toggled **ON** in `Settings > Developer Options`.
3. **Verify OTG Host Cable Capability:** Ensure you are using an active USB OTG data cable rather than a charge-only cable.
4. **Force Driver Re-Init:** In Droid Commander, navigate to **Settings > USB Host Module** and tap **"Reset OTG Driver"** (`DroidCommanderUsbModule.kt`).

---

## 2. Two-Party Consent & Scope Mismatch Errors

### Symptoms
* An automated recovery playbook or assessment query returns `BLOCKED: Missing required scope`.
* Scope intersection calculation yields an empty permission set.

### Resolution Protocol
1. **Check License Expiration:** Confirm the technician license JSON payload is active and hasn't passed its `validUntil` timestamp.
2. **Verify Hardware Binding:** Ensure the target device serial number matches the serial registered in the technician license payload (`license-verifier.ts`).
3. **Re-prompt Owner Authorization:** Re-present the owner consent screen on the target device to ensure the device owner checked all requested permission boxes (`provider-contract.ts`).

---

## 3. Emergency Break-Glass Override Failures

### Symptoms
* Tapping **Activate Break-Glass** yields `Signature Verification Failed` or `Invalid Token`.
* Administrative elevation fails to unlock privileged playbooks.

### Resolution Protocol
1. **Verify Key Alias:** Ensure `ANDROID_KEYSTORE_ALIAS` matches the active StrongBox TEE key alias (`droid_commander_attestation_key`).
2. **Check Public Key Config:** Confirm `EXPO_PUBLIC_BREAK_GLASS_PUBLIC_KEY` in `env-config.env` matches the ECDSA P-256 public key used to sign the break-glass token (`break-glass-auth-service.ts`).
3. **Inspect Ledger Status:** Verify that the break-glass attempt was recorded in the local SQLite ledger before retrying.

---

## 4. Thermal Over-Temperature & BMS Power Disconnects

### Symptoms
* The session abruptly terminates with `CRITICAL_OVER_TEMPERATURE` or `FAIL_CLOSED_DISCONNECT`.
* The USB Traffic Inspector displays a red thermal warning indicator.

### Resolution Protocol
1. **Hardware Cool-Down:** Disconnect the USB OTG cable immediately and allow the target device and OTG adapter to cool down below 40°C (`battery-power-profiler.ts`).
2. **Inspect Power Draw:** Check if the target device is drawing excessive current over the USB-PD bus (>2.0A).
3. **Disable Fast Charging:** If supported by the target device, disable super-fast charging during diagnostic sessions to minimize thermal accumulation.

---

## 5. Privileged Action Ledger Hash Corruption

### Symptoms
* The CLI ledger auditor (`ledger-cli-verifier.ts`) reports a broken hash chain link (`BROKEN_LINKAGE_DETECTED`).

### Resolution Protocol
1. **Check Out-of-Band Database Access:** Ensure no external SQLite tool modified `/data/data/.../databases/ledger.db` directly.
2. **Verify Cryptographic Chain:** Run the integrity verifier with detailed block logging:
   ```bash
   npx ts-node ledger-cli-verifier.ts --db ./ledger.db --verify-chain --verbose
   ```
3. **Isolate Corrupted Block:** If a record was corrupted, export the valid chain up to the last good hash for audit retention before resetting the database.
