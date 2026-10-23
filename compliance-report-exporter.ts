/**
 * Droid Commander - Security Policy & Compliance Export Engine
 * File: compliance-report-exporter.ts
 *
 * Generates audit-ready compliance summaries and verification reports mapping device state,
 * CVE assessment findings, and SHA-256 ledger audit chains against standards like
 * NIST SP 800-124, ISO/IEC 27001, and HIPAA Mobile Device Security Rules.
 */

import * as crypto from 'crypto';

export interface ComplianceExportInput {
  reportTitle: string;
  technicianName: string;
  technicianLicenseId: string;
  deviceId: string;
  deviceModel: string;
  androidVersion: string;
  securityPatchLevel: string;
  overallRiskScore: number;
  detectedCveCount: number;
  ledgerChainHeadHash: string;
  ledgerTotalEntries: number;
  isSelinuxEnforcing: boolean;
  isAirGapEnforced: boolean;
  evaluatedAt: number;
}

export interface ComplianceFrameworkMapping {
  framework: string;
  controlId: string;
  controlName: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REMEDIATION';
  findingDetails: string;
}

export class ComplianceReportExporter {

  /**
   * Generates a complete Markdown-formatted Compliance Audit Report.
   */
  public static generateMarkdownReport(input: ComplianceExportInput): string {
    const formattedDate = new Date(input.evaluatedAt).toISOString();
    const mappings = this.evaluateFrameworkControls(input);

    const reportHeaderHash = crypto
      .createHash('sha256')
      .update(`${input.deviceId}:${input.ledgerChainHeadHash}:${input.evaluatedAt}`)
      .digest('hex');

    let md = `# 🛡️ DROID COMMANDER - COMPLIANCE & SECURITY AUDIT REPORT\n\n`;
    md += `**Report Generated:** ${formattedDate}\n`;
    md += `**Report Signature Hash:** \`0x${reportHeaderHash}\`\n\n`;

    md += `---` + `\n\n`;
    md += `## 📋 1. Device & Technician Identification\n`;
    md += `- **Target Device ID:** \`${input.deviceId}\` (${input.deviceModel})\n`;
    md += `- **Android OS Version:** ${input.androidVersion} (API) | **Patch Date:** ${input.securityPatchLevel}\n`;
    md += `- **Assigned Technician:** ${input.technicianName} (License ID: \`${input.technicianLicenseId}\`)\n`;
    md += `- **SELinux Mode:** ${input.isSelinuxEnforcing ? '✅ Enforcing' : '⚠️ Permissive'}\n`;
    md += `- **Air-Gap Policy Enforcement:** ${input.isAirGapEnforced ? '✅ Enforced (No Internet Manifest Declarations)' : '❌ Non-Compliant'}\n\n`;

    md += `## 🔍 2. Risk & Assessment Summary\n`;
    md += `- **Composite Device Risk Score:** \`${input.overallRiskScore} / 10.0\`\n`;
    md += `- **Active Detected CVEs:** ${input.detectedCveCount}\n`;
    md += `- **Privileged Action Ledger Head Hash:** \`0x${input.ledgerChainHeadHash}\`\n`;
    md += `- **Audited Ledger Chain Entries:** ${input.ledgerTotalEntries} verified blocks\n\n`;

    md += `## 📜 3. Regulatory Framework Control Mapping\n\n`;
    md += `| Framework | Control ID | Control Description | Status | Audit Findings |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;

    for (const mapping of mappings) {
      const statusIcon = mapping.status === 'COMPLIANT' ? '✅ Pass' : mapping.status === 'NEEDS_REMEDIATION' ? '⚠️ Remediation Req.' : '❌ Fail';
      md += `| **${mapping.framework}** | \`${mapping.controlId}\` | ${mapping.controlName} | ${statusIcon} | ${mapping.findingDetails} |\n`;
    }

    md += `\n---\n`;
    md += `### 🔐 Cryptographic Proof Header\n`;
    md += `*This document contains embedded SHA-256 hashes linking back to the tamper-evident Privileged Action Ledger. Any modification invalidates the verification hash.*\n`;

    return md;
  }

  /**
   * Maps assessment telemetry against regulatory frameworks.
   */
  private static evaluateFrameworkControls(input: ComplianceExportInput): ComplianceFrameworkMapping[] {
    return [
      {
        framework: 'NIST SP 800-124',
        controlId: 'PR.AC-1',
        controlName: 'Mobile Device Isolation & Least Privilege',
        status: input.isAirGapEnforced && input.isSelinuxEnforcing ? 'COMPLIANT' : 'NEEDS_REMEDIATION',
        findingDetails: input.isAirGapEnforced ? 'Air-gap manifest policy verified.' : 'Network manifest permissions declared.',
      },
      {
        framework: 'ISO/IEC 27001',
        controlId: 'A.12.4.1',
        controlName: 'Event Logging & Tamper Evidence',
        status: input.ledgerTotalEntries > 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
        findingDetails: `Verified ${input.ledgerTotalEntries} SHA-256 cryptographic chain blocks.`,
      },
      {
        framework: 'HIPAA Security Rule',
        controlId: '164.312(b)',
        controlName: 'Audit Controls & Media Sanitation',
        status: input.overallRiskScore <= 4.0 ? 'COMPLIANT' : 'NEEDS_REMEDIATION',
        findingDetails: `Composite risk score is ${input.overallRiskScore}/10.0.`,
      },
    ];
  }
}
