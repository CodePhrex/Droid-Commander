# Droid Commander — UI Style & Component Architecture Guide
`v1.0.0-RELEASE` | **CodePhrex Cybernetic Design System**

---

## 1. Design System Foundations & Brand System

Droid Commander utilizes the **CodePhrex Cybernetic Design System** (`brand-design-system.ts`), engineered for high-contrast, low-latency dark themes suitable for field operations and technical diagnostic environments.

### 1.1 Color Palette (`COLOR_PALETTE`)
* **Background Surfaces:**
  * `darkSlate` (`#0D1117`): Deep slate background for root containers and scroll views.
  * `charcoalSurface` (`#161B22`): Secondary surface container background for cards, modals, and list items.
  * `borderOutline` (`#30363D`): Low-contrast border color for defining component boundaries.
* **Accent Colors:**
  * `cyberCyan` (`#58A6FF`): Primary brand accent for active toggles, highlighted text, and telemetry metrics.
  * `electricBlue` (`#388BFD`): Action button fills, primary badges, and key interactive element triggers.
  * `chromeSilver` (`#F0F6FC`): High-legibility text color for titles, primary headings, and data labels.
  * `metallicSteel` (`#8B949E`): Muted text color for sub-labels, metadata strings, and secondary descriptions.
* **Status & Alert Colors:**
  * `lockedGreen` (`#3FB950`): Indicates verified AVB status, passing CVE checks, and active connections.
  * `warningYellow` (`#F0883E`): Highlights permissive SELinux states, medium-risk vulnerabilities, and unverified CAs.
  * `criticalRed` (`#DA3633`): Signals critical CVSS vulnerabilities, emergency break-glass overrides, and hardware errors.

---

## 2. Graphic Illustration & Visual Schema Architecture

### 2.1 `DeviceGraphicsManager` (`device-graphics-manager.ts`)
The graphics manager translates raw hardware parameters into visual specifications and vector SVG render definitions:
* **Inputs:** `manufacturer`, `model`, `displayCondition` (`INTACT_OLED`, `SHATTERED_SCREEN`, `WATER_DAMAGED`, `HEADLESS_NO_DISPLAY`), `isConnectedOtg`, `riskScore`.
* **OEM Form Factors:** Dynamic camera visor rendering for Google Pixel devices, multi-lens camera island layouts for Samsung Galaxy series, and punch-hole displays for generic AOSP/ARM64 targets.
* **Status Overlays:** Real-time USB OTG bottom port LED glow effect when an active bulk data connection is detected.

### 2.2 `DeviceIllustrationCard` (`device-illustration-card.tsx`)
A reusable React Native component that displays target device schematics alongside real-time HUD badges:
* **Integrations:**
  * **Operations Dashboard (`home-screen-v5.tsx`)**: Renders target device schematics directly below active mode toggles.
  * **Target Device Registry (`device-history-screen-v2.tsx`)**: Replaces plain text cards with cybernetic device illustrations.
  * **Firmware Deployment Hub (`firmware-deployment-screen-v2.tsx`)**: Displays connected OTG target condition during partition flashing.

---

## 3. Screen Architecture & Interactive Components

The Droid Commander UI suite comprises **14 complete React Native screens**:

### 3.1 Control Center & Operations
1. **`splash-screen-v2.tsx` (Boot Sequence):**
   * Features a rotating dashed cyber ring around the `DC` emblem, circuit glow backdrop, and an interactive **`[ ⚡ SKIP BOOT INTRO ]`** action.
2. **`home-screen-v5.tsx` (Operations Dashboard):**
   * Features an animated sliding mode toggle (`LOCAL_HOST_SELF` ⟷ `REMOTE_TARGET_USB`), collapsible telemetry cards, pulsing health dots, and `DeviceIllustrationCard` integration.
3. **`device-history-screen-v2.tsx` (Device & Session Registry):**
   * Real-time search filter bar, condition status pills, expandable session history timelines, and 1-tap compliance report exporting.

### 3.2 Diagnostics & Security Assessment
4. **`vulnerability-scanner-screen-v2.tsx` (CVE Engine):**
   * Animated radar sweep, build property audit progress bars, severity filter pills (`CRITICAL`, `HIGH`, `REMEDIATED`), and modal remediation triggers.
5. **`adb-shell-screen-v2.tsx` (Host ADB Shell):**
   * Continuous pulsing terminal cursor (`▋`), macro command pills (`getprop`, `dumpsys battery`, `getenforce`), and interactive event drawers.
6. **`firmware-integrity-screen-v2.tsx` (AVB & Partition Verifier):**
   * Animated partition re-audit progress, AVB `LOCKED_GREEN` trust badges, and modal SHA-256 digest comparisons against OEM stock manifests.
7. **`keystore-audit-screen-v2.tsx` (Keystore & Root CA Inspector):**
   * Hardware Keymaster attestation ring, tabbed view transitions (`TEE ATTESTATION` vs `ROOT CA STORE`), and user-installed CA risk alerts.

### 3.3 Hardware & Power Profiling
8. **`power-telemetry-screen-v2.tsx` (BMS Power Profiler):**
   * Animated voltage wave bar, thermal throttling indicators, and a manual 5V VBUS OTG power rail kill-switch.

### 3.4 Deployment, Sync & Governance
9. **`firmware-deployment-screen-v2.tsx` (Vendor & Firmware Hub):**
   * Multi-OEM VID/PID filter tabs, AVB 2.0 manifest verifiers, and partition flashing progress engines (`0% ➔ 100%`).
10. **`online-knowledge-sync-screen.tsx` (Intelligence Feed Sync):**
    * Zero-trust ECDSA signature verification badges, local SQLite knowledge vault metrics, and 1-tap CVE catalog updating.
11. **`consent-licensing-screen-v2.tsx` (Two-Party Consent):**
    * Animated vertical laser scan line inside the QR scanner frame, and interactive scope approval toggle switches.
12. **`passkey-break-glass-screen.tsx` (Break-Glass Override):**
    * Session countdown timers, scope selector switches, and 1-tap **`[ 🔑 Authenticate with Device Passkey ]`** biometric prompt triggers.
13. **`ledger-inspector-screen-v2.tsx` (Privileged Action Ledger):**
    * Animated hash verification scan lines, interactive block expanders, and 1-tap **`[ ⚠️ SIMULATE TAMPER ]`** test buttons.
14. **`reports-vault-screen-v2.tsx` (Offline Compliance Vault):**
    * Document type filter pills (`PDF`, `JSON`, `CSV`), automated report compilation progress, and cryptographic hash inspectors.

---

## 4. Animation Guidelines & Micro-Interactions

* **Layout Animations (`LayoutAnimation`):** Used across collapsible cards and expandable session lists (`LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)`) for smooth height transitions.
* **Spring Physics (`Animated.spring`):** Applied to the dual-mode switch indicator in `home-screen-v5.tsx` (`friction: 7`, `tension: 40`) to deliver tactile tactile feedback during state changes.
* **Looping Animations (`Animated.loop`):** Powers status dot pulsing, radar sweeps, and terminal cursor flashing for continuous visual feedback.

---

## 5. Summary of Primary Screen Files

| Screen Module | Core Purpose | Graphic & Motion Features |
| :--- | :--- | :--- |
| `splash-screen-v2.tsx` | Boot Sequence & Emblem | Rotating cyber ring, ambient glow, progress bar |
| `home-screen-v5.tsx` | Operations Dashboard | Sliding mode switch, `DeviceIllustrationCard` integration |
| `device-history-screen-v2.tsx` | Target Device Registry | Cybernetic schematics, expandable session history |
| `vulnerability-scanner-screen-v2.tsx` | CVE Assessment Engine | Radar sweep, risk severity pills, remediation modal |
| `adb-shell-screen-v2.tsx` | ADB Shell & Macros | Pulsing terminal cursor, preloaded diagnostic pills |
| `firmware-integrity-screen-v2.tsx` | AVB & Partition Verifier | Partition audit progress, SHA-256 digest inspector |
| `keystore-audit-screen-v2.tsx` | Keystore & Root CA Audit | Pulsing attestation ring, user CA risk alerts |
| `power-telemetry-screen-v2.tsx` | BMS Power Profiler | Animated voltage wave bar, VBUS rail cut-off switch |
| `firmware-deployment-screen-v2.tsx` | Firmware Deployment Hub | OEM VID/PID tabs, partition flashing progress bar |
| `online-knowledge-sync-screen.tsx` | Knowledge Sync Engine | ECDSA signature verification badges, vault metrics |
| `consent-licensing-screen-v2.tsx` | Two-Party Consent Manager | Animated QR laser scan line, scope toggles |
| `passkey-break-glass-screen.tsx` | Passkey Break-Glass Override | Countdown timer, 1-tap passkey biometric prompt |
| `ledger-inspector-screen-v2.tsx` | Privileged Action Ledger | Hash verification scan line, tamper simulation |
| `reports-vault-screen-v2.tsx` | Compliance Reports Vault | Progress-tracked PDF compilation, Studio exporter |
