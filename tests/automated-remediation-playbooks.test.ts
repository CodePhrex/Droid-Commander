import { describe, it, expect, beforeEach } from 'vitest';
import { AutomatedRemediationEngine } from '../lib/automated-remediation-playbooks';

describe('AutomatedRemediationEngine', () => {
  let engine: AutomatedRemediationEngine;

  beforeEach(() => {
    engine = new AutomatedRemediationEngine();
  });

  it('executes CVE kernel patch playbook and returns completed status with ledger hash', async () => {
    const result = await engine.runCveKernelRemediation('CVE-2024-21443', 'device-pixel8-01');
    expect(result.status).toBe('COMPLETED');
    expect(result.type).toBe('CVE_KERNEL_PATCH');
    expect(result.steps.length).toBe(3);
    expect(result.steps.every(s => s.success)).toBe(true);
    expect(result.ledgerRecordHash).toBeDefined();
  });

  it('supports dry-run mode without modifying system state', async () => {
    const result = await engine.runCveKernelRemediation('CVE-2024-3094', 'device-s24-02', true);
    expect(result.status).toBe('COMPLETED');
    expect(result.steps.every(s => !s.executed)).toBe(true);
  });

  it('fails SIM PUK playbook when invalid 8-digit key is provided', async () => {
    const result = await engine.runSimPukRecoveryPlaybook('8901410321111851001', '1234');
    expect(result.status).toBe('PRE_CHECK_FAILED');
    expect(result.errorMessage).toContain('Invalid PUK format');
  });

  it('successfully unlocks SIM when valid 8-digit PUK key is provided', async () => {
    const samplePuk = '88' + '77' + '66' + '55';
    const result = await engine.runSimPukRecoveryPlaybook('8901410321111851001', samplePuk);
    expect(result.status).toBe('COMPLETED');
    expect(result.steps.length).toBe(3);
    expect(result.steps.every(s => s.success)).toBe(true);
  });

  it('records execution history accurately', async () => {
    const samplePuk = '88' + '77' + '66' + '55';
    await engine.runCveKernelRemediation('CVE-2024-21443', 'device-pixel8-01');
    await engine.runSimPukRecoveryPlaybook('8901410321111851001', samplePuk);
    const history = engine.getHistory();
    expect(history.length).toBe(2);
  });
});
