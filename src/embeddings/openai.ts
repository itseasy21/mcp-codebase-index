/**
 * OpenAI embedding provider
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
 * OpenAI embedding provider implementation
 */
export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = 'openai';
  readonly defaultModel = 'text-embedding-3-small';
  readonly defaultDimensions = 1536;

  private client: OpenAI | null = null;

  constructor(config: ProviderConfig) {
    super(config);

    if (!config.apiKey) {
      throw new EmbeddingError('OpenAI API key is required', 'openai');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 2,
    });
  }

  async embed(text: string, options?: EmbeddingOptions): Promise<Embedding> {
    this.validateText(text);

    if (!this.client) {
      throw new EmbeddingError('OpenAI client not initialized', 'openai');
    }

    try {
      const model = this.getModel(options);
      const dimensions = this.getDimensions(options);
      const cleanedText = this.cleanText(text);

      logger.debug(`Generating OpenAI embedding for text (${cleanedText.length} chars)`);

      const response = await this.client.embeddings.create({
        model,
        input: cleanedText,
        dimensions: model === 'text-embedding-3-small' || model === 'text-embedding-3-large'
          ? dimensions
          : undefined,
      });

      if (!response.data || response.data.length === 0) {
        throw new EmbeddingError('Invalid embedding response from OpenAI', 'openai');
      }

      const embedding = response.data[0].embedding;

      return {
        values: embedding,
        model,
        dimensions: embedding.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`OpenAI embedding failed: ${message}`);
      throw new EmbeddingError(`OpenAI embedding failed: ${message}`, 'openai');
    }
  }

  async embedBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<BatchEmbeddingResult> {
    this.validateTexts(texts);

    if (!this.client) {
      throw new EmbeddingError('OpenAI client not initialized', 'openai');
    }

    try {
      const model = this.getModel(options);
      const dimensions = this.getDimensions(options);

      logger.debug(`Generating OpenAI embeddings for ${texts.length} texts`);

      const cleanedTexts = texts.map(text => this.cleanText(text));

      const response = await this.client.embeddings.create({
        model,
        input: cleanedTexts,
        dimensions: model === 'text-embedding-3-small' || model === 'text-embedding-3-large'
          ? dimensions
          : undefined,
      });

      if (!response.data || response.data.length === 0) {
        throw new EmbeddingError('Invalid embedding response from OpenAI', 'openai');
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
      logger.error(`OpenAI batch embedding failed: ${message}`);
      throw new EmbeddingError(`OpenAI batch embedding failed: ${message}`, 'openai');
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
        model: this.defaultModel,
        dimensions: this.defaultDimensions,
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
