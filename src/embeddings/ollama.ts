/**
 * Ollama embedding provider (local embeddings)
 */

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
 * Ollama embedding provider implementation
 */
export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
  readonly name = 'ollama';
  readonly defaultModel = 'nomic-embed-text';
  readonly defaultDimensions = 768;

  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);

    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }

  async embed(text: string, options?: EmbeddingOptions): Promise<Embedding> {
    this.validateText(text);

    try {
      const model = this.getModel(options);
      const cleanedText = this.cleanText(text);

      logger.debug(`Generating Ollama embedding for text (${cleanedText.length} chars)`);

      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: cleanedText,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as { embedding?: number[] };

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new EmbeddingError('Invalid embedding response from Ollama', 'ollama');
      }

      return {
        values: data.embedding,
        model,
        dimensions: data.embedding.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Ollama embedding failed: ${message}`);
      throw new EmbeddingError(`Ollama embedding failed: ${message}`, 'ollama');
    }
  }

  async embedBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<BatchEmbeddingResult> {
    this.validateTexts(texts);

    try {
      logger.debug(`Generating Ollama embeddings for ${texts.length} texts`);

      // Ollama doesn't have native batch support, so we'll process sequentially
      const embeddings: Embedding[] = [];

      for (const text of texts) {
        const embedding = await this.embed(text, options);
        embeddings.push(embedding);
      }

      return {
        embeddings,
        model: this.getModel(options),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Ollama batch embedding failed: ${message}`);
      throw new EmbeddingError(`Ollama batch embedding failed: ${message}`, 'ollama');
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      // Check if Ollama server is running
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          available: false,
          error: `Ollama server returned ${response.status}`,
        };
      }

      const data = await response.json() as { models?: Array<{ name: string }> };

      // Check if the model is available
      const model = this.defaultModel;
      const modelAvailable = data.models?.some((m) => m.name.includes(model));

      if (!modelAvailable) {
        return {
          available: false,
          error: `Model ${model} not found. Please pull it with: ollama pull ${model}`,
        };
      }

      // Try a test embedding
      const startTime = Date.now();
      await this.embed('test');
      const latency = Date.now() - startTime;

      return {
        available: true,
        model,
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
