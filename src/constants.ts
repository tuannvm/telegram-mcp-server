/**
 * Time-related constants for the Telegram MCP server
 */

/** Default timeout for API requests in milliseconds */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/** Default timeout for Telegram long polling in seconds */
export const DEFAULT_POLL_TIMEOUT_SECONDS = 10;

/** Maximum poll timeout allowed by Telegram API in seconds */
export const MAX_POLL_TIMEOUT_SECONDS = 10;

/** Milliseconds per second for time conversions */
export const MS_PER_SECOND = 1000;

/** Default timeout for waiting for replies in seconds */
export const DEFAULT_REPLY_TIMEOUT_SECONDS = 300;

/** Default poll interval for checking replies in seconds */
export const DEFAULT_REPLY_POLL_INTERVAL_SECONDS = 5;

/** Maximum length for error message preview */
export const MAX_ERROR_PREVIEW_LENGTH = 200;
