# Security policy

## Scope

This repository contains a public-safe Android security-training and device-service orchestration prototype. It is intended for authorized, licensed personnel and approved lab devices.

## Do not disclose publicly

Do not put any of the following in issues, pull requests, commits, CI logs, screenshots, or documentation:

- Private keys, keystore passwords, API tokens, signing credentials, recovery codes, or session tokens.
- Customer names, contact information, device serial numbers, IMEIs, biometric data, PINs, raw device images, or unredacted audit records.
- Confidential manufacturer agreements, non-public SDK binaries, internal service endpoints, or vendor trust material.
- Exploit payloads, arbitrary shell commands, lock-screen bypass instructions, or credential-extraction techniques.

If a secret is exposed, revoke or rotate it immediately, preserve only the minimum evidence required for investigation, and remove it from the affected system. Removing a file from the latest commit does not remove it from Git history; treat the secret as compromised.

## Reporting a vulnerability

For a suspected vulnerability, use a private GitHub security advisory if enabled for the repository or contact the repository owner through a private channel. Include a concise description, affected commit or version, safe reproduction steps, impact, and suggested mitigation. Do not include live credentials or customer/device data.

If the report involves a vendor or manufacturer integration, use the provider’s authorized security-disclosure channel as well. The repository’s public provider scaffold must not be treated as evidence of vendor approval.

## Maintainer response

Maintainers should acknowledge receipt privately, reproduce only in an approved lab, classify severity, patch or mitigate, add regression coverage, and disclose the fix without publishing secrets or harmful payloads. Provider certificates and organization identity data should be revoked or corrected through protected configuration, not committed to source.

## Repository controls

The public `main` branch uses pull-request review and required CI status checks. Production signing is isolated in the protected GitHub `production` Environment and requires review. These controls reduce accidental publication risk but do not replace privacy review or secret-management procedures.
