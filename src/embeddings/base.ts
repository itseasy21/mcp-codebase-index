/**
 * Base embedding provider interface
 */

import type {
  Embedding,
  BatchEmbeddingResult,
  ProviderConfig,
  ProviderHealth,
  EmbeddingOptions,
} from './types.js';

/**
 * Base interface for embedding providers
 */
export interface EmbeddingProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Get default model name
   */
  readonly defaultModel: string;

  /**
   * Get default dimensions
   */
  readonly defaultDimensions: number;

  /**
   * Generate embedding for a single text
   */
  embed(_text: string, _options?: EmbeddingOptions): Promise<Embedding>;

  /**
   * Generate embeddings for multiple texts
   */
  embedBatch(_texts: string[], _options?: EmbeddingOptions): Promise<BatchEmbeddingResult>;

  /**
   * Check provider health and availability
   */
  healthCheck(): Promise<ProviderHealth>;

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig;

  /**
   * Update provider configuration
   */
  updateConfig(_config: Partial<ProviderConfig>): void;
}

/**
 * Abstract base class for embedding providers
 */
export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  abstract readonly name: string;
  abstract readonly defaultModel: string;
  abstract readonly defaultDimensions: number;

  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = { ...config };
  }

  abstract embed(_text: string, _options?: EmbeddingOptions): Promise<Embedding>;

  abstract embedBatch(_texts: string[], _options?: EmbeddingOptions): Promise<BatchEmbeddingResult>;

  abstract healthCheck(): Promise<ProviderHealth>;

  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  updateConfig(_config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ..._config };
  }

  /**
   * Validate text before embedding
   */
  protected validateText(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }
  }

  /**
   * Validate texts array
   */
  protected validateTexts(texts: string[]): void {
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    for (const text of texts) {
      this.validateText(text);
    }
  }

  /**
   * Clean text for embedding
   */
  protected cleanText(text: string): string {
    // Remove excessive whitespace
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Truncate text to maximum length
   */
  protected truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength);
  }

  /**
   * Get model to use for embedding
   */
  protected getModel(options?: EmbeddingOptions): string {
    return options?.model || this.config.model || this.defaultModel;
  }

  /**
   * Get dimensions to use for embedding
   */
  protected getDimensions(options?: EmbeddingOptions): number {
    return options?.dimensions || this.config.dimensions || this.defaultDimensions;
  }
}
