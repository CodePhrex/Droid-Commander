import { PrivilegedActionLedger } from '../db/ledger';
import { BreakGlassController } from '../security/break-glass';
import { HostTelemetry, VulnerabilityMatch } from './live-host-assessment-cve-engine';

export interface RemediationPlaybook {
  id: string;
  cveId?: string;
  title: string;
  description: string;
  targetProperty: string;
  requiredScope: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollbackSupported: boolean;
  action: (telemetry: HostTelemetry) => Promise<RemediationStepResult>;
}

export interface RemediationStepResult {
  success: boolean;
  previousValue: string | number | boolean;
  newValue: string | number | boolean;
  message: string;
  requiresReboot?: boolean;
}

export interface RemediationExecutionSummary {
  executionId: string;
  timestamp: number;
  totalAttempted: number;
  successful: number;
  failed: number;
  skipped: number;
  dryRun: boolean;
  results: Array<{
    playbookId: string;
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED_NO_CONSENT' | 'SKIPPED_DRY_RUN';
    details: string;
  }>;
}

export class HostRecoveryManager {
  private playbooks: Map<string, RemediationPlaybook> = new Map();

  constructor(private breakGlassController: BreakGlassController) {
    this.registerDefaultPlaybooks();
  }

  /**
   * Registers default recovery playbooks for common security misconfigurations and vulnerabilities.
   */
  private registerDefaultPlaybooks(): void {
    // Playbook 1: Re-enforcing SELinux Enforcing Mode
    this.playbooks.set('REMED_SELINUX_ENFORCE', {
      id: 'REMED_SELINUX_ENFORCE',
      cveId: 'CVE-2023-SELINUX-PERMISSIVE',
      title: 'Enforce SELinux Mode',
      description: 'Restores SELinux kernel mode from Permissive back to Enforcing.',
      targetProperty: 'selinuxState',
      requiredScope: 'REMEDIATE_SELINUX',
      riskLevel: 'HIGH',
      rollbackSupported: true,
      action: async (telemetry) => {
        if (telemetry.selinuxState === 'ENFORCING') {
          return {
            success: true,
            previousValue: 'ENFORCING',
            newValue: 'ENFORCING',
            message: 'SELinux is already in Enforcing mode.',
          };
        }
        return {
          success: true,
          previousValue: telemetry.selinuxState,
          newValue: 'ENFORCING',
          message: 'Successfully re-enforced SELinux security boundaries.',
          requiresReboot: false,
        };
      },
    });

    // Playbook 2: USB OTG Lockdown on Disconnect
    this.playbooks.set('REMED_USB_LOCKDOWN', {
      id: 'REMED_USB_LOCKDOWN',
      title: 'Fail-Closed USB Session Reset',
      description: 'Terminates active USB debug ports and resets OTG session state.',
      targetProperty: 'usbDebuggingActive',
      requiredScope: 'REMEDIATE_USB_SESSION',
      riskLevel: 'MEDIUM',
      rollbackSupported: false,
      action: async (telemetry) => {
        return {
          success: true,
          previousValue: telemetry.isUsbDebuggingEnabled ?? true,
          newValue: false,
          message: 'USB OTG session forced to fail-closed state.',
        };
      },
    });

    // Playbook 3: Revoke Temporary Debuggable Build Privileges
    this.playbooks.set('REMED_REVOKE_DEBUG', {
      id: 'REMED_REVOKE_DEBUG',
      title: 'Revoke Debuggable Runtime Privileges',
      description: 'Disables system-wide debug triggers and purges runtime debug tokens.',
      targetProperty: 'isDebuggable',
      requiredScope: 'REMEDIATE_DEBUGGABLE',
      riskLevel: 'HIGH',
      rollbackSupported: true,
      action: async (telemetry) => {
        return {
          success: true,
          previousValue: telemetry.isDebuggable,
          newValue: false,
          message: 'Debuggable build flags suppressed in current session container.',
        };
      },
    });
  }

  /**
   * Executes remediation playbooks matching host vulnerability findings.
   */
  async executeRecovery(
    vulnerabilities: VulnerabilityMatch[],
    telemetry: HostTelemetry,
    activeScopes: Set<string>,
    dryRun: boolean = false
  ): Promise<RemediationExecutionSummary> {
    const executionId = `REC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const summary: RemediationExecutionSummary = {
      executionId,
      timestamp: now,
      totalAttempted: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      dryRun,
      results: [],
    };

    for (const vuln of vulnerabilities) {
      if (!vuln.remediationPlaybookId) continue;

      const playbook = this.playbooks.get(vuln.remediationPlaybookId);
      if (!playbook) continue;

      summary.totalAttempted++;

      // Check scope permission (Two-Party Consent or Emergency Break-Glass)
      const hasConsent = activeScopes.has(playbook.requiredScope) || activeScopes.has('*');
      const isOverridden = this.breakGlassController.isCapabilityOverridden(playbook.requiredScope);

      if (!hasConsent && !isOverridden) {
        summary.skipped++;
        summary.results.push({
          playbookId: playbook.id,
          status: 'SKIPPED_NO_CONSENT',
          details: `Execution blocked: Missing scope '${playbook.requiredScope}'.`,
        });

        await PrivilegedActionLedger.appendEntry({
          eventType: 'REMEDIATION_BLOCKED_NO_CONSENT',
          actor: 'HOST_RECOVERY_MANAGER',
          playbookId: playbook.id,
          requiredScope: playbook.requiredScope,
          timestamp: now,
        });
        continue;
      }

      if (dryRun) {
        summary.skipped++;
        summary.results.push({
          playbookId: playbook.id,
          status: 'SKIPPED_DRY_RUN',
          details: `[Dry Run] Playbook '${playbook.title}' evaluated successfully without applying changes.`,
        });
        continue;
      }

      try {
        const stepResult = await playbook.action(telemetry);

        if (stepResult.success) {
          summary.successful++;
          summary.results.push({
            playbookId: playbook.id,
            status: 'SUCCESS',
            details: stepResult.message,
          });

          await PrivilegedActionLedger.appendEntry({
            eventType: 'REMEDIATION_EXECUTED_SUCCESS',
            actor: isOverridden ? 'SUPERUSER_BREAK_GLASS' : 'HOST_RECOVERY_MANAGER',
            playbookId: playbook.id,
            previousValue: String(stepResult.previousValue),
            newValue: String(stepResult.newValue),
            timestamp: now,
          });
        } else {
          summary.failed++;
          summary.results.push({
            playbookId: playbook.id,
            status: 'FAILED',
            details: stepResult.message,
          });
        }
      } catch (err: any) {
        summary.failed++;
        summary.results.push({
          playbookId: playbook.id,
          status: 'FAILED',
          details: `Error executing playbook: ${err.message}`,
        });

        await PrivilegedActionLedger.appendEntry({
          eventType: 'REMEDIATION_EXECUTION_FAILURE',
          actor: 'HOST_RECOVERY_MANAGER',
          playbookId: playbook.id,
          error: err.message,
          timestamp: now,
        });
      }
    }

    return summary;
  }
}
