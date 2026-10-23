# Live local-host assessment

## What was wrong in the first installed release

The Command and Assess screens still consumed seeded findings and simulated verification, and Sessions still contained sample handset activity. A successful APK assembly and signature did not establish that these screens collected device evidence. Those paths are replaced in the current source; the already-installed APK does not receive these changes automatically.

## Actual local readings

The new `LocalDeviceCollector` in the existing Android Expo module collects manufacturer, brand, model, device/product, Android release, SDK, build ID/display/type, bootloader version, supported CPU ABIs and system build fingerprint. The system build fingerprint identifies a firmware build, not a biometric or per-device hardware identifier.

It also reads the reported security patch date, exposed verified-boot properties, readable Developer Options and ADB settings, secure-screen-lock and current keyguard state, declared USB Host/Accessory features, attached USB-device count, this app's ability to request APK installation, total RAM and app-volume storage capacity/free space. Nullable fields stay unknown when Android does not provide them. Storage capacity describes the app's filesystem volume, not a forensic partition inventory.

Root detection reuses the existing native root provider's fixed executable-location checks. Finding an entry point does not prove this app has elevated access; not finding one does not prove the device is unrooted. Scanning never requests a root grant or launches a privileged operation. Existing consent-gated root-session policy and reviewed-operation adapters remain separate.

No remote device, USB cable, ADB, backend or root grant is needed for ordinary host collection. No serial, IMEI, MAC, account identity, credential, package inventory or raw USB device path is added to host reports.

## Screens and evidence flow

Command and Assess subscribe to one shared assessment store. Their scan buttons invoke the native collector, not a timer or hard-coded score update. A measured coverage count replaces the 72/78 posture score and is explicitly not a security score. Findings show collected values, Android API/property sources and limitations. Cached readings retain their original timestamp and are labeled cached; refreshing reads the device again.

Sessions starts empty on a new install. Completed native host reports populate history. A report can be expanded, opened in full and exported through Android's share sheet. These read-only local assessments do not claim owner consent for a USB target. The older Command scope form remains a visibly disclosed in-memory draft, not a verified authorization record.

Host-to-CVE correlation compares the collected Android version and patch date against the local catalog. Potential matches, reported bulletin coverage and insufficient evidence are separate outcomes. Patch age alone is not CVE confirmation or proof of exploitability. Device-specific Samsung backports and unsupported package/component inventories remain limitations. The library is a reference catalog, not a functioning executable exploit library.

The APK packages 121 unique public CVE references and three patch sections parsed from provenance-pinned September/October 2026 official bulletin excerpts captured on October 21, 2026. A first offline launch, or an upgrade from an empty catalog, can use this dated baseline without network requests. Existing nonempty cached references are preserved. Refresh follows the official index/overview and at most three latest Android monthly pages. This is limited reference coverage, not a complete Android/OEM vulnerability database; HTTPS and local packaging do not constitute a feed signature.

USB Link now distinguishes native-module availability, actual declared USB Host capability, raw USB enumeration, approved-profile matching and authenticated-session readiness. Observing an attached device does not authorize opening it or executing commands. Manufacturer/provider and end-to-end peer-authentication integrations are not completed by this correction.

## Host and connected-device scope

`DeviceOperationRouter` uses one allowlisted operation vocabulary for `local-host` and `usb-peer` scopes. Actual host posture/root inspection and peer typed read-posture dispatch use it. Device scope is copied and frozen before asynchronous authorization, every adapter binds to the exact selected device, and missing adapters never fall back to the other device.

Privileged/state-changing operation handlers require the same trusted common authorizer in both scopes, in addition to the existing root, consent, remediation and manufacturer-provider controllers. A caller-supplied `approved` or `ownerConsent` flag does not grant permission. Being the host does not confer root, OEM service access or a valid vendor certificate.

Current host handlers collect/read posture, reread posture for verification, inspect root availability, collect exposed boot state and read USB capabilities. Root-session UI authorization, reviewed remediation, manufacturer service and device-image adapters are not installed in this host adapter. Those operation definitions are shared, but return unavailable until implemented/configured; the router alone does not create functionality. The unconfigured USB peer still needs an approved profile, actual authenticated companion and cryptographic binding. Physical self-flashing or recovery also entails an OS/vendor handoff or reboot, not an uninterrupted app-local operation.

## Storage and failure semantics

Host reports use the new AsyncStorage key `@droidcmd/local-host-assessments/v1`; existing privileged-ledger and catalog keys are preserved. At most 100 newest reports are retained, and the UI discloses that retention limit. Export important reports before they age out or before clearing app data.

This feature does not encrypt AsyncStorage or hardware-attest reports. It performs no app-level cloud sync, but the existing Android system backup configuration may still apply. Schema validation and reconstruction of derived findings are not cryptographic evidence authentication. The hash-chained privileged-action ledger is a separate object and does not authenticate host-report history.

If collection is unavailable, no example findings are substituted. If a native read fails, an explicit error replaces scan results. If persistence fails, readings remain visible in memory with a warning that they may not survive restart. Arbitrary exception text is not copied into reports.

## Validation and release gates

Pure normalization/store regression tests cover actual readings, missing/denied fields, date parsing, root-status distinctions, unrecognized payload exclusion, report content, concurrent scans, restart/cache behavior and failed writes. Catalog-correlation tests cover platform evidence and incomplete-match outcomes. Native instrumentation is authored separately; it must run on a real Android device or emulator before claiming native runtime validation.

A new custom Android APK is required to expose `collectLocalDeviceState` and USB diagnostics. Expo Go, web Preview and the original signed APK cannot execute the added Kotlin collector. TypeScript/unit tests, Android compilation, artifact signature verification, installation and actual Galaxy A15 observations are distinct gates. The release must not be described as functionally complete while physical-device verification is pending.
