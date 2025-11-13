/**
 * Types for embedding providers
 */

/**
 * Embedding result
 */
export interface Embedding {
  values: number[];
  model: string;
  dimensions: number;
}

/**
 * Batch embedding result
 */
export interface BatchEmbeddingResult {
  embeddings: Embedding[];
  totalTokens?: number;
  model: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  dimensions?: number;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  available: boolean;
  model?: string;
  dimensions?: number;
  latency?: number;
  error?: string;
}

/**
 * Embedding request options
 */
export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  taskType?: string; // For some providers like Gemini
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
  requestsRemaining?: number;
  tokensRemaining?: number;
  resetTime?: Date;
}
