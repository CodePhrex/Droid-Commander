# Droid Commander `v1.0.0-RELEASE` Field Technician Deployment Summary

**Document Version:** 1.0.0  
**Target Audience:** Authorized Field Technicians & Service Engineers  
**Classification:** Operational Security & Standard Operating Procedure (SOP)  

---

## 1. Executive Operational Overview

**Droid Commander** is an offline-first, auditable device service and security assessment platform designed for licensed technical professionals. It enforces strict **Two-Party Consent**, **Offline Air-Gap Isolation**, and **Cryptographic Tamper Evidence** across all hardware repair and diagnostic workflows.

### Core Guarantees:
* **Air-Gapped Execution:** Operates with zero network connectivity (`android.permission.INTERNET` is strictly prohibited in code and native manifests).
* **Two-Party Consent:** Requires both technician authorization credentials and explicit device owner approval. Service actions are strictly restricted to the computed intersection of both scopes.
* **Tamper-Evident Logging:** All operations, assessment findings, consent checks, and remediation actions are appended to a SHA-256 cryptographically chained local SQLite database.

---

## 2. Technician Kit & Hardware Prerequisites

Before deploying to the field, ensure your technician kit contains the following verified hardware and software assets:

| Asset / Tool | Specification / Requirement | Purpose |
| :--- | :--- | :--- |
| **Technician Host Device** | Android 10+ handset running Droid Commander `v1.0.0-RELEASE` APK | Runs assessment engine, consent UI, and ledger database. |
| **USB Interconnect** | High-grade USB-C to USB-C OTG cable or USB-C Host OTG adapter | Establishes low-level hardware data channel to target handset. |
| **Technician License** | Valid hardware-bound PKCS12 / ECDSA technician credential | Establishes authorized technician scope profile. |
| **Target Lab Handset** | Android 7.0 to 14 target handset with Developer Options enabled | Device undergoing diagnostic inspection or security remediation. |

---

## 3. Field Operating Procedure (Step-by-Step SOP)

### **Step 1: Air-Gap Verification & Hardware Connection**
1. Switch the Technician Host Device to **Airplane Mode** (Disable Wi-Fi, Cellular Data, and Bluetooth).
2. Connect the USB OTG adapter to the Technician Host Device.
3. Attach the data cable to the Target Device.
4. Launch the **Droid Commander** application.
5. Confirm USB permission when prompted by Android OS (`VID 0x18d1` / Host connection confirmed).

### **Step 2: Two-Party Consent Authorization**
1. Select **Initiate Service Session**.
2. Scan/load your Technician License profile.
3. Present the Target Device Owner Consent screen on the host display.
4. Obtain explicit owner confirmation on the target handset interface.
5. Verify the active **Scope Intersection** rendered on the dashboard before proceeding.

### **Step 3: Automated Host Assessment & CVE Correlation**
1. Tap **Run Live Host Assessment**.
2. Review collected host telemetry (Android API level, patch date, SELinux mode, build flags).
3. Inspect correlated vulnerabilities identified by the 5-gate offline CVE engine.
4. Note the calculated **Composite Risk Score** (0.0 to 10.0 scale).

### **Step 4: Executing Authorized Remediation Playbooks**
1. Select the required remediation playbook (e.g., `REMED_SELINUX_ENFORCE` or `REMED_REVOKE_DEBUG`).
2. Verify that the action falls strictly within the active consented scope.
3. Execute the playbook and monitor state transition confirmations.

### **Step 5: Session Teardown & Ledger Verification**
1. Verify post-remediation risk score reduction on the summary screen.
2. Select **Complete & Terminate Session**.
3. Confirm that the SHA-256 Privileged Action Ledger entry is generated and stored locally.
4. Disconnect the USB OTG cable to force a fail-closed memory buffer purge.

---

## 4. Emergency Break-Glass Overrides

In critical recovery scenarios where missing scope permissions prevent essential host stabilization:

1. Tap **Activate Emergency Break-Glass** on the main dashboard.
2. Input the authorized dual-key administrative token (`KEY_ADMIN_SUPERUSER_01`).
3. Verify ECDSA P-256 signature token confirmation.
4. Proceed with necessary emergency recovery playbooks.
5. **Mandatory Action:** Inform the device owner that a Break-Glass Override event has been permanently recorded in the SHA-256 audit ledger.

---

## 5. Field Troubleshooting Quick Reference

* **USB Host Not Detected:** Re-seat the USB OTG adapter on the host side first, verify OTG setting is toggled ON in host OS settings, or consult `field-troubleshooting-guide.md`.
* **Action Blocked (Consent Mismatch):** Do not attempt force execution; re-evaluate technician license profile or re-initiate consent handshake with the owner.
* **Thermal Shutdown Triggered:** If cell temperature exceeds 50.0°C, the BMS profiler will force a fail-closed OTG disconnect. Allow device to cool before reconnecting.

---

*Droid Commander v1.0.0-RELEASE | Approved for Authorized Field Operations*
