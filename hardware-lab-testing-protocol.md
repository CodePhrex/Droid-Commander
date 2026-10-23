# 🧪 Droid Commander Hardware Lab Testing Protocol

### **Required Equipment**
1. **Technician Host Device:** Your primary Android phone with the Droid Commander debug/release APK installed.
2. **Target Device:** A secondary Android phone/tablet (e.g., a test/lab handset) to be assessed or serviced.
3. **Hardware Interconnect:** A quality USB-C to USB-C OTG cable or a USB OTG host adapter.

---

## **Phase 1: Pre-Flight Safety & Air-Gap Setup**
- [ ] **Verify Air-Gap Isolation:** Place the Technician Host Device in **Airplane Mode** (Wi-Fi and Mobile Data OFF).
- [ ] **Enable Target Developer Options:** On the target device, navigate to `Settings > About Phone`, tap **Build Number** 7 times, and enable **USB Debugging** under `Developer Options`.
- [ ] **Inspect Physical USB OTG Adapter:** Check cable pin integrity and ensure power delivery capabilities.

---

## **Phase 2: Execution Test Scenarios**

### **Scenario A: USB OTG Session Handshake**
1. Connect the USB OTG adapter to the **Technician Host Device** and plug the data cable into the **Target Device**.
2. Launch the Droid Commander app on your host device.
3. **Expected Behavior:**
   - Android OS prompts for USB device permission (`Allow Droid Commander to access USB device?`).
   - The app UI detects Vendor ID (`VID 0x18d1` or target vendor ID), Product ID, and reads the target serial number.
   - The USB Traffic Inspector tab displays active packet framing and stream throughput.

---

### **Scenario B: Two-Party Consent Handshake**
1. Select **Initiate Service Session** on the Technician Host.
2. Load a test technician license profile and present the owner authorization prompt.
3. On the Target Device, accept the incoming authorization/RSP handshake request.
4. **Expected Behavior:**
   - The app computes the strict **Scope Intersection** between technician capabilities and owner-granted permissions.
   - Ungranted permissions are highlighted in red and permanently locked out for the session.

---

### **Scenario C: Live Telemetry & Offline CVE Assessment**
1. Tap **Run Live Host Assessment**.
2. **Expected Behavior:**
   - Telemetry engine collects OS API version, build fingerprint, security patch date, SELinux status, and kernel release strings via USB endpoint queries.
   - The 5-gate offline CVE correlation engine matches host findings against the local database.
   - A Composite Risk Score (e.g., `8.5 / 10.0` or `10.0 / 10.0`) is rendered on the host dashboard.

---

### **Scenario D: Controlled Remediation & Break-Glass Gate**
1. Select an unconsented recovery action (e.g., `REMEDIATE_DEBUGGABLE`).
2. **Expected Behavior:** The action is strictly **BLOCKED** by the consent engine.
3. Tap **Activate Emergency Break-Glass** on the host device.
4. Input the dual-key authorization token (`KEY_ADMIN_SUPERUSER_01`) and authenticate.
5. Execute the SELinux recovery playbook (`REMED_SELINUX_ENFORCE`).
6. **Expected Behavior:** SELinux boundary updates to **Enforcing**, and a superuser elevation event is logged.

---

### **Scenario E: Real-Time BMS & Thermal Safety Profiling**
1. Open the **Battery & Power Profiler** screen while connected via USB OTG.
2. Monitor real-time voltage, current draw, cell temperature, and USB-PD negotiation states.
3. **Expected Behavior:**
   - Under normal operating temperatures (<45°C), the profiler displays a green status.
   - If temperature exceeds 50.0°C (or if simulated via test flag), the app immediately executes a **fail-closed USB OTG disconnect** to protect equipment.

---

## **Phase 3: Audit Ledger Integrity Verification**

1. Navigate to the **Privileged Action Ledger** viewer or run the local CLI verifier script:
   ```bash
   npx ts-node ledger-cli-verifier.ts --db ./ledger.db --verify-chain
   ```
2. **Expected Behavior:**
   - All session events (`SESSION_HANDSHAKE`, `CONSENT_BLOCKED`, `BREAK_GLASS_ACTIVATED`, `REMEDIATION_EXECUTED`) appear in sequential order.
   - The SHA-256 hash chain verification passes with 100% cryptographic continuity (`0 broken linkages`).

---

## **Phase 4: Fail-Closed Session Teardown**
- [ ] Disconnect the USB OTG cable.
- [ ] **Expected Behavior:** The app detects endpoint disconnection, tears down active session tokens, shreds transient memory buffers, and returns to the default locked home state.
