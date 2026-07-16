// ponytail: jsdom doesn't ship globalThis.crypto.subtle or TextEncoder.
// Polyfill via Node's webcrypto/util so computeHash() works in tests.
const { webcrypto } = require("node:crypto");
const { TextEncoder, TextDecoder } = require("node:util");
if (globalThis.crypto && !globalThis.crypto.subtle) {
	try {
		Object.defineProperty(globalThis.crypto, "subtle", {
			value: webcrypto.subtle,
			configurable: true,
			writable: true,
		});
	} catch {
		// jsdom's crypto stub may be non-extensible; replace entirely.
		Object.defineProperty(globalThis, "crypto", {
			value: webcrypto,
			configurable: true,
			writable: true,
		});
	}
}
if (!globalThis.TextEncoder) {
	globalThis.TextEncoder = TextEncoder;
}
if (!globalThis.TextDecoder) {
	globalThis.TextDecoder = TextDecoder;
}

