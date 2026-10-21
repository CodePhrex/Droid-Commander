import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import {
  canonicalizeLedgerValue,
  validatePrivilegedActionInput,
  type PrivilegedActionEvent,
  type PrivilegedActionInput,
} from "./privileged-action-core";

const STORAGE_KEY = "@droidcmd/privileged-action-ledger/v1";

type StoredLedger = { version: 1; events: PrivilegedActionEvent[] };
export type MobileLedgerVerification = { valid: boolean; entries: number; lastHash: string | null; error?: string };

async function hashEvent(event: Omit<PrivilegedActionEvent, "hash">) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonicalizeLedgerValue(event));
}

function emptyLedger(): StoredLedger { return { version: 1, events: [] }; }

export class NativePrivilegedActionLedger {
  private writeQueue: Promise<unknown> = Promise.resolve();

  async read(): Promise<PrivilegedActionEvent[]> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as StoredLedger;
    if (parsed.version !== 1 || !Array.isArray(parsed.events)) throw new Error("Unsupported mobile ledger format.");
    return parsed.events;
  }

  async verify(): Promise<MobileLedgerVerification> {
    try {
      const events = await this.read();
      let previousHash: string | null = null;
      for (let index = 0; index < events.length; index += 1) {
        const event = events[index];
        if (event.sequence !== index + 1) return { valid: false, entries: events.length, lastHash: previousHash, error: `Sequence mismatch at entry ${index + 1}.` };
        if (event.previousHash !== previousHash) return { valid: false, entries: events.length, lastHash: previousHash, error: `Previous-hash mismatch at entry ${index + 1}.` };
        const { hash, ...unsigned } = event;
        if (await hashEvent(unsigned) !== hash) return { valid: false, entries: events.length, lastHash: previousHash, error: `Hash mismatch at entry ${index + 1}.` };
        previousHash = hash;
      }
      return { valid: true, entries: events.length, lastHash: previousHash };
    } catch (error) {
      return { valid: false, entries: 0, lastHash: null, error: error instanceof Error ? error.message : "Ledger verification failed." };
    }
  }

  async append(input: PrivilegedActionInput): Promise<PrivilegedActionEvent> {
    validatePrivilegedActionInput(input);
    const operation = this.writeQueue.then(async () => {
      const integrity = await this.verify();
      if (!integrity.valid) throw new Error(`Refusing to append to an invalid ledger: ${integrity.error ?? "integrity check failed"}`);
      const prior = await this.read();
      const unsigned: Omit<PrivilegedActionEvent, "hash"> = {
        ...input,
        eventId: Crypto.randomUUID(),
        sequence: prior.length + 1,
        recordedAt: input.recordedAt ?? new Date().toISOString(),
        previousHash: prior.at(-1)?.hash ?? null,
      };
      const complete = { ...unsigned, hash: await hashEvent(unsigned) };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, events: [...prior, complete] } satisfies StoredLedger));
      return complete;
    });
    this.writeQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async export(format: "json" | "jsonl" = "json") {
    const events = await this.read();
    return format === "jsonl"
      ? events.map((event) => JSON.stringify(event)).join("\n") + (events.length ? "\n" : "")
      : JSON.stringify({ exportedAt: new Date().toISOString(), integrity: await this.verify(), events }, null, 2);
  }

  async clearForTest() { await AsyncStorage.removeItem(STORAGE_KEY); }
}

export const mobilePrivilegedActionLedger = new NativePrivilegedActionLedger();
