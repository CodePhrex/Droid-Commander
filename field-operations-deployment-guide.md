# Droid Commander `v1.0.0-RELEASE` — Field Operations & Deployment Guide

---

## **1. Executive Overview & Release Identification**

* **Product Name:** Droid Commander
* **Release Version:** `v1.0.0-RELEASE`
* **Release Classification:** Production Field Deployment & Security Training Suite
* **Target Audience:** Authorized Technicians, Mobile Security Auditors, and Hardware Service Specialists
* **Architecture:** Offline-First, Zero-Trust Mobile Security & Device Servicing Framework
* **Core Technology Stack:** Expo / React Native 0.74, Kotlin Native USB OTG Host Module, Drizzle ORM / SQLite Vault, WebCrypto / StrongBox Keystore Integration

---

## **2. System Prerequisites & Hardware Specifications**

### **2.1 Host Technician Phone Requirements**
* **Operating System:** Android 11.0+ (API Level 30 or higher)
* **USB Hardware:** USB OTG (On-The-Go) Host Controller with bulk USB data transport capability
* **Security Hardware:** Android Keystore with **StrongBox** or **TEE** hardware security module for Passkey biometrics
* **Physical Connectors:** High-speed USB-C OTG cable or USB-C to Micro-USB shielded cables

### **2.2 Target Device Compatibility**
* **Supported Platforms:** Android 8.0 through Android 15.0 (ARM64 / x86_64)
* **Modes Supported:** Active OS ADB Debugging, Fastboot Bootloader, FastbootD, and Recovery Sideload
* **Hardware Conditions Handled:** Intact Displays, Shattered / Unresponsive Touchscreens, Headless Boards, Missing Physical Power/Volume Buttons, and Liquid-Exposed Boards

---

## **3. Standard Operating Procedures (SOP)**

### **SOP-01: Establishing Connection & Dual-Mode Selection**
1. Launch Droid Commander from the host application menu.
2. Observe the animated splash boot sequence (`splash-screen-v2.tsx`) as the local StrongBox keystore and USB drivers initialize.
3. On the **Operations Dashboard** (`home-screen-v5.tsx`), select the operational mode:
   * **`📱 LOCAL HOST`**: Evaluates security posture, SELinux enforcement, and vulnerability signatures on the technician's phone itself.
   * **`🔌 REMOTE OTG`**: Attaches a target device via USB OTG cable. The system automatically initializes `droid-commander-usb-host-module.kt` and renders the target's schematic illustration card (`DeviceIllustrationCard`).

### **SOP-02: Damaged / Headless Device Servicing**
1. Connect the damaged or headless target via USB OTG.
2. Confirm OTG bus detection via the glowing cyan LED port indicator on `home-screen-v5.tsx`.
3. If the display is non-functional, navigate to **Host ADB Shell** (`adb-shell-screen-v2.tsx`) to execute diagnostic macros without requiring on-device user interaction.
4. If physical power/volume buttons are missing, execute software reboot macros (`adb reboot bootloader` or `adb reboot recovery`).
5. **Liquid Exposure Safety Check:** Open the **BMS Power Profiler** (`power-telemetry-screen-v2.tsx`). Monitor real-time current draw and thermal gauges. If erratic current spikes occur, toggle the **5V VBUS Power Rail Cut-Off** switch immediately to prevent board shorts.

### **SOP-03: Host Assessment & Automated CVE Remediation**
1. Open the **Vulnerability Scanner** (`vulnerability-scanner-screen-v2.tsx`).
2. Tap **`[ ⚡ Launch Live Host Assessment ]`** to run the 5-stage conservative correlation engine against the offline CVE database.
3. Review the composite risk score ($0.0 - 10.0$) and matched CVE signatures.
4. Tap **`[ ⚡ EXECUTE REMEDIATION ]`** to execute automated recovery playbooks (e.g., enforcing SELinux mode, suppressing debuggable flags, or terminating unauthenticated USB sessions).
5. Verify the post-remediation risk score reduction and confirm audit logging in the **Privileged Action Ledger**.

### **SOP-04: Owner-Approved Root Access & APK Sideloading**
1. Open **Root & Consent Governance** (`owner-root-consent-manager.ts`).
2. Confirm the presence of a valid, ECDSA-signed owner consent token granting the `OWNER_APPROVED_ROOT_ACCESS` scope. (Unconsented execution attempts are strictly blocked by fail-closed enforcement).
3. Open the **APK Sideloading Hub** (`apk-sideload-module.ts`) to stream installation packages over ADB (`pm install-create`, `write`, `commit`).
4. Every sideload event and root interaction is cryptographically hashed and appended to the **Privileged Action Ledger**.

---

## **4. Emergency Governance & Passkey Break-Glass Procedures**

1. When emergency servicing requires overriding standard two-party consent or non-critical OTG safety holds, open the **Passkey Break-Glass Screen** (`passkey-break-glass-screen.tsx`).
2. Select the required elevated emergency scopes (`BYPASS_TWO_PARTY_CONSENT`, `FORCE_USB_EXECUTION`).
3. Tap **`[ 🔑 Authenticate with Device Passkey ]`**.
4. Scan fingerprint/face when prompted by the native Android `BiometricPrompt` dialog.
5. Upon successful biometric authentication, StrongBox releases the assertion signature, activating an elevated session valid for strictly **15 minutes**.
6. Every Break-Glass activation appends a `PASSKEY_ELEVATED_SESSION_ACTIVATED` block to the SHA-256 ledger hash chain.

---

## **5. Online Intelligence Sync & Air-Gap Vault Management**

### **5.1 Feed Synchronization Procedure**
1. Connect the host device to a secure internet gateway.
2. Open the **Online Knowledge & Feed Sync Screen** (`online-knowledge-sync-screen.tsx`).
3. Tap **`[ ⚡ Sync Intelligence Feeds Now ]`**.
4. The system fetches update bundles for CVE databases, OEM partition manifests, and USB VID/PID registries, verifying ECDSA signatures against root certificates before merging data into the local SQLite vault.

### **5.2 Air-Gapped Operation**
In offline field environments, Droid Commander operates 100% air-gapped without requiring network access, relying seamlessly on its local, cryptographically signed knowledge vault.

---

## **6. Verification & Compliance Audit**

1. Open the **Ledger Inspector** (`ledger-inspector-screen-v2.tsx`).
2. Verify that all block hashes form an uninterrupted SHA-256 chain from the genesis block (`GENESIS_HASH_00000000`).
3. Open the **Offline Telemetry Vault** (`reports-vault-screen-v2.tsx`).
4. Tap **`[ 📄 Export Compliance Report ]`** to compile a signed, AES-256-GCM encrypted PDF/JSON compliance archive for legal and organizational retention.

---

*Droid Commander `v1.0.0-RELEASE` — Certified Production Build.*
