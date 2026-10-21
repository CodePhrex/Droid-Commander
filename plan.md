# Droid Commander — implementation plan

## Product scope

Droid Commander is a stand-alone, offline-first Android security-training application for authorized and licensed personnel. The first version targets standard non-rooted devices and uses only observable, permission-compliant signals. It provides a local posture assessment, security-policy analysis, guided remediation, before-and-after verification, locally stored sessions/reports, and a best-effort USB controller workflow for a second Android device.

The first prototype is intentionally defensive and educational. It does not bypass Android sandboxing, lock screens, consent dialogs, device-owner controls, or enterprise policy. It contains no real exploit payloads or arbitrary remote code execution. “Patching” is shown as separate categories: settings remediation, application fixes, and manufacturer system updates. USB is presented as an owner-consented capability check, not as an automatic control path.

## Implementation approach

Use the initialized Expo Router / React Native / TypeScript / NativeWind mobile starter. Keep the core experience local and independent of the provisioned server. Start with deterministic mock observations that are clearly labeled as prototype data, then replace the observation provider with native Android modules in a later milestone. Keep the observation model typed so the UI can distinguish pass, warning, critical, and unavailable results, plus confidence and limitations.

The first milestone is a single portrait-first dashboard route with three modes: Command Center, Assessments, and Sessions. Command Center surfaces current posture, critical findings, quick remediation guidance, and USB readiness. Assessments shows the scoped checks and a safe simulation of a before/after verification loop. Sessions shows report history and the authorization context attached to each run. Local persistence can be added after the interaction model is stable; this prototype keeps an in-memory session preview and documents the offline boundary.

## Project structure

- `app/(tabs)/index.tsx`: dashboard, assessment, training-scope modal, remediation feedback, USB readiness panel, and session preview.
- `app/(tabs)/_layout.tsx`: portrait tab navigation for Command Center, Assessments, and Sessions.
- `components/`: existing cross-platform UI primitives; reuse the starter shell and haptics.
- `constants/` and `lib/`: existing theme/runtime plumbing; do not put security checks or privileged assumptions here.
- `plan.md` and `TODO.md`: product decisions and outcome tracking.

## Design direction

Three candidate directions were considered: Tactical Field Notebook (0.06), Quiet SOC Console (0.04), and Industrial Safety Instrument (0.08). Chosen direction: **Tactical Field Notebook**.

- **Design Movement:** contemporary field-operations tooling with a paper-like warm surface, dark ink, and deliberate orange signal marks.
- **Core Principles:** evidence before action; calm hierarchy; explicit authorization; dense information without tiny text.
- **Color Philosophy:** warm off-white reads like a working briefing sheet, deep navy provides trusted contrast, and safety orange is reserved for action and risk rather than decoration.
- **Layout Paradigm:** a vertical briefing rail with a persistent posture block, stacked evidence cards, and short action rows rather than a symmetrical dashboard grid.
- **Signature Elements:** numbered assessment rows, orange “signal” rules, and a small authorization stamp that follows every active exercise.
- **Interaction Philosophy:** every consequential action explains its scope, shows its authorization context, and returns a visible state change. Unsupported hardware is surfaced as a boundary, not hidden as an error.
- **Animation:** use restrained opacity and height transitions only for expanding evidence or showing completion; avoid decorative motion during assessment.
- **Typography System:** use the platform sans family with strong weight contrast; oversized numeric posture score, compact uppercase metadata, and readable 15–17 pt body copy.
- **Brand Essence:** a consent-first field instrument for learning how Android posture can be measured and improved. Personality: precise, grounded, accountable.
- **Brand Voice:** headlines are direct (“Evidence before action”); CTAs are bounded (“Run local assessment”, “Review authorization”).
- **Wordmark & Logo:** a compact command-chevron mark beside the wordmark, visually suggesting a routed signal rather than a weapon or exploit.
- **Signature Brand Color:** safety orange `#F26B38`, used only for the primary action, active signal, and warning emphasis.

## Boundaries and later native work

Native Android integration must be capability-gated. Observable checks may include API/security-patch metadata, developer-options/USB state where exposed, app/package facts available to the app, and device-policy signals available to a provisioned owner. USB support must detect host capability, permission, role, protocol, and disconnection. ADB is a separate owner-approved debugging channel. System update management belongs to the Android device-policy/update surface and cannot be implied by a generic “patch” button.
