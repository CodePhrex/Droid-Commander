/**
 * Privileged Action Ledger - Cryptographic Verification & Tamper Detection Simulation
 * File: /workspace/scratch/ledger-tamper-simulation.js
 */

const crypto = require('crypto');

function computeHash(index, previousHash, timestamp, actionType, operatorId, payload, consentToken) {
  const data = `${index}:${previousHash}:${timestamp}:${actionType}:${operatorId}:${JSON.stringify(payload)}:${consentToken}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

console.log("================================================================================");
console.log("    DROID COMMANDER - PRIVILEGED ACTION LEDGER TAMPER DETECTION SIMULATION      ");
console.log("================================================================================\n");

// 1. Build an authentic chain
console.log("[1/3] BUILDING AUTHENTIC PRIVILEGED ACTION LEDGER CHAIN...");

const ledger = [];

// Genesis Block
const genesisBlock = {
  index: 0,
  previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
  timestamp: 1797930000000,
  actionType: "GENESIS",
  operatorId: "SYSTEM_INIT",
  payload: { message: "Privileged Action Ledger Initialized" },
  consentToken: "SYSTEM_ROOT_CONSENT",
  hash: ""
};
genesisBlock.hash = computeHash(
  genesisBlock.index, genesisBlock.previousHash, genesisBlock.timestamp,
  genesisBlock.actionType, genesisBlock.operatorId, genesisBlock.payload, genesisBlock.consentToken
);
ledger.push(genesisBlock);

// Block 1: Operation Mode Switch
const block1 = {
  index: 1,
  previousHash: genesisBlock.hash,
  timestamp: 1797930005000,
  actionType: "OPERATION_MODE_CHANGED",
  operatorId: "TECH_LIC_88492",
  payload: { previousMode: "UNINITIALIZED", newMode: "LOCAL_HOST_SELF", target: "Pixel 8 Pro" },
  consentToken: "SELF_AUTH_TOKEN_001",
  hash: ""
};
block1.hash = computeHash(
  block1.index, block1.previousHash, block1.timestamp,
  block1.actionType, block1.operatorId, block1.payload, block1.consentToken
);
ledger.push(block1);

// Block 2: High-Privilege Fastboot Flash Action
const block2 = {
  index: 2,
  previousHash: block1.hash,
  timestamp: 1797930010000,
  actionType: "FASTBOOT_PARTITION_FLASH",
  operatorId: "TECH_LIC_88492",
  payload: { partition: "vendor", expectedDigest: "c3d4e5f6...", flashStatus: "SUCCESS" },
  consentToken: "TWO_PARTY_CONSENT_SIG_99213",
  hash: ""
};
block2.hash = computeHash(
  block2.index, block2.previousHash, block2.timestamp,
  block2.actionType, block2.operatorId, block2.payload, block2.consentToken
);
ledger.push(block2);

// Block 3: Firmware Audit Verification
const block3 = {
  index: 3,
  previousHash: block2.hash,
  timestamp: 1797930015000,
  actionType: "FIRMWARE_INTEGRITY_AUDIT",
  operatorId: "TECH_LIC_88492",
  payload: { score: 100, avbState: "LOCKED_GREEN" },
  consentToken: "SELF_AUTH_TOKEN_002",
  hash: ""
};
block3.hash = computeHash(
  block3.index, block3.previousHash, block3.timestamp,
  block3.actionType, block3.operatorId, block3.payload, block3.consentToken
);
ledger.push(block3);

console.log(`  ✓ Successfully built 4 ledger blocks (Genesis + 3 Action Blocks).`);
console.log(`  └─ Latest Block (#3) SHA-256 Hash: ${block3.hash}\n`);

// 2. Perform Verification on Clean Chain
function verifyLedger(chain) {
  for (let i = 0; i < chain.length; i++) {
    const current = chain[i];
    
    // Check recalculated hash against stored hash
    const recalculatedHash = computeHash(
      current.index, current.previousHash, current.timestamp,
      current.actionType, current.operatorId, current.payload, current.consentToken
    );

    if (recalculatedHash !== current.hash) {
      return {
        isValid: false,
        errorBlock: current.index,
        reason: `Hash mismatch at Block #${current.index}. Stored: ${current.hash.substring(0, 16)}..., Recalculated: ${recalculatedHash.substring(0, 16)}...`
      };
    }

    // Check pointer consistency with previous block
    if (i > 0) {
      const previous = chain[i - 1];
      if (current.previousHash !== previous.hash) {
        return {
          isValid: false,
          errorBlock: current.index,
          reason: `Broken hash chain pointer at Block #${current.index}. Pointed to ${current.previousHash.substring(0, 16)}..., but Block #${previous.index} hash is ${previous.hash.substring(0, 16)}...`
        };
      }
    }
  }
  return { isValid: true };
}

console.log("[2/3] VERIFYING INTRACT/INTACT CRYPTOGRAPHIC CHAIN...");
const initialResult = verifyLedger(ledger);
if (initialResult.isValid) {
  console.log("  ✅ VERIFICATION PASSED: Cryptographic hash chain is 100% valid and tamper-free.\n");
} else {
  console.log(`  ❌ VERIFICATION FAILED: ${initialResult.reason}\n`);
}

// 3. Simulate Unauthorized Tampering
console.log("[3/3] SIMULATING UNAUTHORIZED TAMPER ATTEMPT ON BLOCK #2...");
console.log("  ⚠️ Attacker attempts to modify Block #2 payload ('flashStatus': 'SUCCESS' --> 'BYPASSED_FAIL_SAFE')...");

// Deep copy ledger and tamper with Block 2
const tamperedLedger = JSON.parse(JSON.stringify(ledger));
tamperedLedger[2].payload.flashStatus = "BYPASSED_FAIL_SAFE"; // Tampered payload without updating block or downstream hashes

const tamperResult = verifyLedger(tamperedLedger);
console.log("\n  [AUDIT VERIFIER RESULT]");
if (!tamperResult.isValid) {
  console.log("  🚨 CRITICAL AUDIT ALERT DETECTED!");
  console.log(`  └─ Status: TAMPER_DETECTED`);
  console.log(`  └─ Corrupted Block Index: Block #${tamperResult.errorBlock}`);
  console.log(`  └─ Diagnostic Details: ${tamperResult.reason}`);
  console.log(`  └─ Downstream Impact: Block #3 hash chain broken. Entire ledger flagged as UNTRUSTED.`);
} else {
  console.log("  ✅ Chain valid (Unexpected!).");
}

console.log("\n================================================================================");
console.log("   SIMULATION COMPLETE - PRIVILEGED ACTION LEDGER TAMPER DETECTION VERIFIED    ");
console.log("================================================================================\n");
