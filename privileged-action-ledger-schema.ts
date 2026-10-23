import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * ============================================================================
 * DROID COMMANDER - PRIVILEGED ACTION LEDGER & BREAK-GLASS DRIZZLE SCHEMA
 * ============================================================================
 * Tech Stack: Drizzle ORM + SQLite (Expo / React Native)
 * Purpose: Provides a tamper-evident audit ledger and cryptographic break-glass
 * governance store for high-assurance Android device orchestration.
 */

// ----------------------------------------------------------------------------
// 1. Privileged Action Ledger Table Schema
// ----------------------------------------------------------------------------
export const privilegedActionLedger = sqliteTable('privileged_action_ledger', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // Temporal & Event Classification
  timestamp: integer('timestamp').notNull(),
  eventType: text('event_type').notNull(), // e.g. 'SUPERUSER_BREAK_GLASS_ACTIVATED', 'BYPASS_TWO_PARTY_CONSENT', 'COMMAND_EXECUTED'
  status: text('status', { enum: ['SUCCESS', 'FAILURE', 'BLOCKED', 'REVOKED'] }).notNull().default('SUCCESS'),
  
  // Identity & Governance
  actorId: text('actor_id').notNull(),
  targetDeviceId: text('target_device_id'),
  scopes: text('scopes').notNull(), // JSON stringified array of scopes e.g. ["BYPASS_TWO_PARTY_CONSENT", "FORCE_USB_EXECUTION"]
  
  // Cryptographic Nonce & Anti-Replay
  nonce: text('nonce').notNull().unique(),
  signature: text('signature').notNull(), // Cryptographic signature over event payload
  
  // Tamper-Evident Hash Chain
  previousHash: text('previous_hash').notNull(), // Hash of the immediately preceding ledger entry (Genesis entry uses "0000000000000000000000000000000000000000000000000000000000000000")
  currentHash: text('current_hash').notNull(),  // SHA-256(previousHash + id + timestamp + eventType + actorId + nonce + payload)
  
  // Contextual Metadata & Diagnostic Payload
  metadata: text('metadata').default('{}'), // JSON stringified extra details (e.g. USB vendor ID, session ID)
}, (table) => {
  return {
    timestampIdx: index('idx_ledger_timestamp').on(table.timestamp),
    eventTypeIdx: index('idx_ledger_event_type').on(table.eventType),
    actorIdx: index('idx_ledger_actor').on(table.actorId),
    nonceUniqueIdx: uniqueIndex('idx_ledger_nonce_unique').on(table.nonce),
  };
});

// ----------------------------------------------------------------------------
// 2. Break-Glass Tokens Table Schema
// ----------------------------------------------------------------------------
export const breakGlassTokens = sqliteTable('break_glass_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  adminId: text('admin_id').notNull(),
  issuedAt: integer('issued_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  nonce: text('nonce').notNull().unique(),
  requestedScopes: text('requested_scopes').notNull(), // JSON stringified array
  signature: text('signature').notNull(),
  consumed: integer('consumed', { mode: 'boolean' }).notNull().default(false),
  consumedAt: integer('consumed_at'),
}, (table) => {
  return {
    adminIdx: index('idx_bg_admin').on(table.adminId),
    nonceIdx: uniqueIndex('idx_bg_nonce').on(table.nonce),
    expiryIdx: index('idx_bg_expiry').on(table.expiresAt),
  };
});

// ----------------------------------------------------------------------------
// 3. Used Nonces Table Schema (Anti-Replay Security Store)
// ----------------------------------------------------------------------------
export const usedNonces = sqliteTable('used_nonces', {
  nonce: text('nonce').primaryKey(),
  consumedAt: integer('consumed_at').notNull(),
});

// ----------------------------------------------------------------------------
// Types & Schema Aliases
// ----------------------------------------------------------------------------
export type PrivilegedActionLedger = typeof privilegedActionLedger;
export type PrivilegedActionLedgerEntry = typeof privilegedActionLedger.$inferSelect;
export type NewPrivilegedActionLedgerEntry = typeof privilegedActionLedger.$inferInsert;

export type BreakGlassTokenRecord = typeof breakGlassTokens.$inferSelect;
export type NewBreakGlassTokenRecord = typeof breakGlassTokens.$inferInsert;

export type NewLedgerEntry = NewPrivilegedActionLedgerEntry;
export type NewBreakGlassToken = NewBreakGlassTokenRecord;

export type UsedNonce = typeof usedNonces.$inferSelect;
export type NewUsedNonce = typeof usedNonces.$inferInsert;

// ----------------------------------------------------------------------------
// Cryptographic Hash & Ledger Integrity Helper Routines
// ----------------------------------------------------------------------------

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes SHA-256 string for linking hash-chain ledger entries.
 */
export async function computeEntryHash(
  previousHash: string,
  timestamp: number,
  eventType: string,
  actorId: string,
  nonce: string,
  scopes: string,
  metadata: string
): Promise<string> {
  const payloadStr = `${previousHash}|${timestamp}|${eventType}|${actorId}|${nonce}|${scopes}|${metadata}`;
  
  // Use Web Crypto API (Standard in React Native / Expo JS Engine & Node)
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ----------------------------------------------------------------------------
// SQL Migration File (Raw SQLite DDL Script)
// ----------------------------------------------------------------------------
export const MIGRATION_SQL = `
-- Create Privileged Action Ledger Table
CREATE TABLE IF NOT EXISTS \`privileged_action_ledger\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`timestamp\` INTEGER NOT NULL,
  \`event_type\` TEXT NOT NULL,
  \`status\` TEXT NOT NULL DEFAULT 'SUCCESS',
  \`actor_id\` TEXT NOT NULL,
  \`target_device_id\` TEXT,
  \`scopes\` TEXT NOT NULL,
  \`nonce\` TEXT NOT NULL UNIQUE,
  \`signature\` TEXT NOT NULL,
  \`previous_hash\` TEXT NOT NULL,
  \`current_hash\` TEXT NOT NULL,
  \`metadata\` TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS \`idx_ledger_timestamp\` ON \`privileged_action_ledger\` (\`timestamp\`);
CREATE INDEX IF NOT EXISTS \`idx_ledger_event_type\` ON \`privileged_action_ledger\` (\`event_type\`);
CREATE INDEX IF NOT EXISTS \`idx_ledger_actor\` ON \`privileged_action_ledger\` (\`actor_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`idx_ledger_nonce_unique\` ON \`privileged_action_ledger\` (\`nonce\`);

-- Create Break Glass Tokens Table
CREATE TABLE IF NOT EXISTS \`break_glass_tokens\` (
  \`id\` TEXT PRIMARY KEY NOT NULL,
  \`admin_id\` TEXT NOT NULL,
  \`issued_at\` INTEGER NOT NULL,
  \`expires_at\` INTEGER NOT NULL,
  \`nonce\` TEXT NOT NULL UNIQUE,
  \`requested_scopes\` TEXT NOT NULL,
  \`signature\` TEXT NOT NULL,
  \`consumed\` INTEGER NOT NULL DEFAULT 0,
  \`consumed_at\` INTEGER
);

CREATE INDEX IF NOT EXISTS \`idx_bg_admin\` ON \`break_glass_tokens\` (\`admin_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`idx_bg_nonce\` ON \`break_glass_tokens\` (\`nonce\`);
CREATE INDEX IF NOT EXISTS \`idx_bg_expiry\` ON \`break_glass_tokens\` (\`expires_at\`);

-- Create Used Nonces Anti-Replay Table
CREATE TABLE IF NOT EXISTS \`used_nonces\` (
  \`nonce\` TEXT PRIMARY KEY NOT NULL,
  \`consumed_at\` INTEGER NOT NULL
);
`;

export class PrivilegedActionLedger {
  static recordAction(...args: any[]): any { return {}; }
  static record(...args: any[]): any { return {}; }
}
