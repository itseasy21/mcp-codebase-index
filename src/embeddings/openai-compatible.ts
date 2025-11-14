/**
 * OpenAI-compatible embedding provider
 * For services like Azure OpenAI, TogetherAI, Anyscale, etc.
 */

import OpenAI from 'openai';
import { BaseEmbeddingProvider } from './base.js';
import type {
  Embedding,
  BatchEmbeddingResult,
  ProviderConfig,
  ProviderHealth,
  EmbeddingOptions,
} from './types.js';
import { EmbeddingError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * OpenAI-compatible embedding provider implementation
 */
export class OpenAICompatibleProvider extends BaseEmbeddingProvider {
  readonly name = 'openai-compatible';
  readonly defaultModel = 'text-embedding-ada-002';
  readonly defaultDimensions = 1536;

  private client: OpenAI | null = null;

  constructor(config: ProviderConfig) {
    super(config);

    if (!config.baseUrl) {
      throw new EmbeddingError(
        'Base URL is required for OpenAI-compatible provider',
        'openai-compatible'
      );
    }

    if (!config.apiKey) {
      throw new EmbeddingError(
        'API key is required for OpenAI-compatible provider',
        'openai-compatible'
      );
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 2,
    });

    logger.info(`Initialized OpenAI-compatible provider with base URL: ${config.baseUrl}`);
  }

  async embed(text: string, options?: EmbeddingOptions): Promise<Embedding> {
    this.validateText(text);

    if (!this.client) {
      throw new EmbeddingError(
        'OpenAI-compatible client not initialized',
        'openai-compatible'
      );
    }

    try {
      const model = this.getModel(options);
      const cleanedText = this.cleanText(text);

      logger.debug(
        `Generating embedding with OpenAI-compatible provider (${cleanedText.length} chars)`
      );

      const response = await this.client.embeddings.create({
        model,
        input: cleanedText,
      });

      if (!response.data || response.data.length === 0) {
        throw new EmbeddingError(
          'Invalid embedding response from provider',
          'openai-compatible'
        );
      }

      const embedding = response.data[0].embedding;

      return {
        values: embedding,
        model,
        dimensions: embedding.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`OpenAI-compatible embedding failed: ${message}`);
      throw new EmbeddingError(
        `OpenAI-compatible embedding failed: ${message}`,
        'openai-compatible'
      );
    }
  }

  async embedBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<BatchEmbeddingResult> {
    this.validateTexts(texts);

    if (!this.client) {
      throw new EmbeddingError(
        'OpenAI-compatible client not initialized',
        'openai-compatible'
      );
    }

    try {
      const model = this.getModel(options);

      logger.debug(
        `Generating embeddings with OpenAI-compatible provider for ${texts.length} texts`
      );

      const cleanedTexts = texts.map(text => this.cleanText(text));

      const response = await this.client.embeddings.create({
        model,
        input: cleanedTexts,
      });

      if (!response.data || response.data.length === 0) {
        throw new EmbeddingError(
          'Invalid embedding response from provider',
          'openai-compatible'
        );
      }

      const embeddings: Embedding[] = response.data.map(item => ({
        values: item.embedding,
        model,
        dimensions: item.embedding.length,
      }));

      return {
        embeddings,
        totalTokens: response.usage?.total_tokens,
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`OpenAI-compatible batch embedding failed: ${message}`);
      throw new EmbeddingError(
        `OpenAI-compatible batch embedding failed: ${message}`,
        'openai-compatible'
      );
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      if (!this.client) {
        return {
          available: false,
          error: 'Client not initialized',
        };
      }

      // Try a simple embedding to check health
      const startTime = Date.now();
      await this.embed('test');
      const latency = Date.now() - startTime;

      return {
        available: true,
        model: this.getModel(),
        dimensions: this.getDimensions(),
        latency,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
