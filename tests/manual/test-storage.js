#!/usr/bin/env node

// Note: The storage module has been deprecated and removed.
// The server now uses getUpdates polling instead.
// This test is no longer functional - use test-polling.js instead.

console.error('The storage module has been removed.');
console.error('The server now uses Telegram getUpdates API for polling.');
console.error('Use test-polling.js or test-bidirectional.js instead.');
process.exit(1);
