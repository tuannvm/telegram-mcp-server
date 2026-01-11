export class ToolExecutionError extends Error {
  constructor(
    public readonly toolName: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(`Failed to execute tool "${toolName}": ${message}`);
    this.name = 'ToolExecutionError';
  }
}

export class ValidationError extends Error {
  constructor(
    public readonly toolName: string,
    message: string
  ) {
    super(`Validation failed for tool "${toolName}": ${message}`);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = 'ConfigurationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(`Network error: ${message}`);
    this.name = 'NetworkError';
  }
}

export function handleError(error: unknown, context: string): string {
  if (error instanceof Error) {
    return `Error in ${context}: ${error.message}`;
  }
  return `Error in ${context}: ${String(error)}`;
}
