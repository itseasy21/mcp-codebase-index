/**
 * Custom error classes for the MCP Codebase Index server
 */

/**
 * Base error class for all custom errors
 */
export class CodebaseIndexError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends CodebaseIndexError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
  }
}

/**
 * Parsing-related errors
 */
export class ParsingError extends CodebaseIndexError {
  constructor(message: string, public readonly file?: string) {
    super(message, 'PARSING_ERROR');
  }
}

/**
 * Embedding-related errors
 */
export class EmbeddingError extends CodebaseIndexError {
  constructor(message: string, public readonly provider?: string) {
    super(message, 'EMBEDDING_ERROR');
  }
}

/**
 * Storage-related errors
 */
export class StorageError extends CodebaseIndexError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR');
  }
}

/**
 * Indexing-related errors
 */
export class IndexingError extends CodebaseIndexError {
  constructor(message: string, public readonly file?: string) {
    super(message, 'INDEXING_ERROR');
  }
}

/**
 * Search-related errors
 */
export class SearchError extends CodebaseIndexError {
  constructor(message: string) {
    super(message, 'SEARCH_ERROR');
  }
}

/**
 * Validation-related errors
 */
export class ValidationError extends CodebaseIndexError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends CodebaseIndexError {
  constructor(message: string, public readonly url?: string) {
    super(message, 'NETWORK_ERROR');
  }
}

/**
 * File system-related errors
 */
export class FileSystemError extends CodebaseIndexError {
  constructor(message: string, public readonly path?: string) {
    super(message, 'FILE_SYSTEM_ERROR');
  }
}

/**
 * Check if an error is a known error type
 */
export function isKnownError(error: unknown): error is CodebaseIndexError {
  return error instanceof CodebaseIndexError;
}

/**
 * Format error for user display
 */
export function formatError(error: unknown): string {
  if (isKnownError(error)) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Create a retry-able error wrapper
 */
export class RetryableError extends CodebaseIndexError {
  constructor(message: string, public readonly retryAfter?: number) {
    super(message, 'RETRYABLE_ERROR');
  }
}
