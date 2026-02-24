import { webcrypto } from "crypto";

// Polyfill crypto for Node test environment (needed by BetterAuth internals)
if (!globalThis.crypto) {
  // @ts-expect-error — Node's webcrypto is compatible but types differ slightly
  globalThis.crypto = webcrypto;
}
