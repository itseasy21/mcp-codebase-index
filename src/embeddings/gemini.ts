/**
 * Google Gemini embedding provider
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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
 * Gemini embedding provider implementation
 */
export class GeminiEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = 'gemini';
  readonly defaultModel = 'text-embedding-004';
  readonly defaultDimensions = 768;

  private client: GoogleGenerativeAI | null = null;

  constructor(config: ProviderConfig) {
    super(config);

    if (!config.apiKey) {
      throw new EmbeddingError('Gemini API key is required', 'gemini');
    }

    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async embed(text: string, options?: EmbeddingOptions): Promise<Embedding> {
    this.validateText(text);

    if (!this.client) {
      throw new EmbeddingError('Gemini client not initialized', 'gemini');
    }

    try {
      const model = this.getModel(options);
      const cleanedText = this.cleanText(text);

      logger.debug(`Generating Gemini embedding for text (${cleanedText.length} chars)`);

      const embeddingModel = this.client.getGenerativeModel({
        model,
      });

      const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text: cleanedText }] },
        taskType: (options?.taskType as any) || 'RETRIEVAL_DOCUMENT',
      });

      const embedding = result.embedding;

      if (!embedding || !embedding.values) {
        throw new EmbeddingError('Invalid embedding response from Gemini', 'gemini');
      }

      return {
        values: embedding.values,
        model,
        dimensions: embedding.values.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Gemini embedding failed: ${message}`);
      throw new EmbeddingError(`Gemini embedding failed: ${message}`, 'gemini');
    }
  }

  async embedBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<BatchEmbeddingResult> {
    this.validateTexts(texts);

    if (!this.client) {
      throw new EmbeddingError('Gemini client not initialized', 'gemini');
    }

    try {
      const model = this.getModel(options);
      logger.debug(`Generating Gemini embeddings for ${texts.length} texts`);

      const embeddingModel = this.client.getGenerativeModel({
        model,
      });

      // Gemini supports batch embedding
      const requests = texts.map(text => ({
        content: { role: 'user' as const, parts: [{ text: this.cleanText(text) }] },
        taskType: (options?.taskType as any) || 'RETRIEVAL_DOCUMENT',
      }));

      const results = await Promise.all(
        requests.map(request => embeddingModel.embedContent(request))
      );

      const embeddings: Embedding[] = results.map(result => {
        if (!result.embedding || !result.embedding.values) {
          throw new EmbeddingError('Invalid embedding response from Gemini', 'gemini');
        }

        return {
          values: result.embedding.values,
          model,
          dimensions: result.embedding.values.length,
        };
      });

      return {
        embeddings,
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Gemini batch embedding failed: ${message}`);
      throw new EmbeddingError(`Gemini batch embedding failed: ${message}`, 'gemini');
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
      await this.embed('test', { taskType: 'RETRIEVAL_DOCUMENT' });
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
