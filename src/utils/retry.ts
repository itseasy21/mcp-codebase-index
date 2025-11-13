/**
 * Retry utility for handling transient failures
 */

import { logger } from './logger.js';
import { RetryableError } from './errors.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: Array<new (...args: any[]) => Error>;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: [RetryableError],
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable = opts.retryableErrors.some(
        (ErrorClass) => error instanceof ErrorClass
      );

      if (!isRetryable || attempt === opts.maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const currentDelay = Math.min(delay, opts.maxDelay);
      logger.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${currentDelay}ms...`,
        { error: lastError.message }
      );

      await sleep(currentDelay);
      delay *= opts.backoffFactor;
    }
  }

  throw lastError || new Error('Retry failed without error');
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
