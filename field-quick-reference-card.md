# ⚡ Droid Commander Field Technician Quick Reference Card

**Version:** 1.0.0-RELEASE | **Air-Gap Status:** STRICT OFFLINE ENFORCED

---

## 🛠️ 1. Pre-Flight Setup & Air-Gap Check
* [ ] **Technician Phone:** Enable **Airplane Mode** (Wi-Fi, Bluetooth, Mobile Data **OFF**).
* [ ] **Target Phone:** `Settings` ➔ `About Phone` ➔ Tap **Build Number 7x** ➔ Enable **USB Debugging**.
* [ ] **Cable Setup:** Plug USB OTG adapter into **Technician Host Phone** *first*, then connect cable to target handset.

---

## 🤝 2. Session Handshake & Two-Party Consent
1. **Connect & Launch:** Open Droid Commander app. Grant USB Host permissions when prompted.
2. **Verify Detection:** Confirm Vendor ID (`VID 0x18d1`) and target serial number appear on the screen.
3. **Consent Handshake:** Present RSP owner authorization prompt on target device.
4. **Scope Intersection Check:**
   * 🟢 **Green Items:** Active consented permissions (e.g., `READ_TELEMETRY`, `REMEDIATE_SELINUX`).
   * 🔴 **Red Items:** Unconsented scopes — strictly locked out by hardware gates.

---

## 📊 3. Assessment & Risk Score Matrix
* **Tap `Run Live Host Assessment`** to execute the 5-gate offline CVE correlation engine.
* **Score Interpretation:**
  * **0.0 - 3.9:** LOW RISK (Hardened OS / Enforcing SELinux)
  * **4.0 - 6.9:** MEDIUM RISK (Outdated patch / Debug flags enabled)
  * **7.0 - 10.0:** CRITICAL RISK (Unpatched CVEs / SELinux Disabled / Unlocked Bootloader)

---

## 🚨 4. Emergency Break-Glass Override
* **When to Use:** Emergency remediation required for unconsented scope (e.g., critical kernel vulnerability).
* **Execution:**
  1. Select blocked action ➔ Tap **`Activate Emergency Break-Glass`**.
  2. Authenticate with Superuser Key (`KEY_ADMIN_SUPERUSER_01`).
  3. Action executes under superuser privilege; **SHA-256 Ledger** logs `SUPERUSER_BREAK_GLASS_ACTIVATED`.

---

## 🌡️ 5. Thermal & Power Safety Disconnect Rules
* **Normal Temp:** `< 45.0°C` (Green)
* **Thermal Warning:** `45.0°C - 49.9°C` (Yellow)
* **CRITICAL CUTOFF:** `≥ 50.0°C` ➔ **Automated Fail-Closed USB Disconnect** invoked immediately.

---

## 🔧 6. Quick Field Troubleshooting
| Problem | Primary Cause | 30-Second Fix |
| :--- | :--- | :--- |
| **USB Host Not Detected** | Reversed OTG cable direction | Unplug cable. Insert OTG host adapter into **Technician Phone** first. |
| **Action Blocked (Red Scope)** | Missing owner consent | Request expanded consent on target device OR use Break-Glass key. |
| **Break-Glass Auth FAILED** | Expired/Corrupted TEE token | Verify StrongBox keystore alias (`droid_commander_attestation_key`). |
| **Thermal Shutdown Trip** | Overheating battery / short | Disconnect handset, allow 5 min cool-down, verify cable pins. |

---

## 🔒 7. Service Teardown & Sealing
1. Disconnect USB OTG cable.
2. App automatically shreds transient session keys in memory.
3. Verify final audit chain entry in **Privileged Action Ledger**.
