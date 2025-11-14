/**
 * Embedding provider factory and exports
 */

import type { EmbeddingProvider } from './base.js';
import type { ProviderConfig } from './types.js';
import { GeminiEmbeddingProvider } from './gemini.js';
import { OpenAIEmbeddingProvider } from './openai.js';
import { OllamaEmbeddingProvider } from './ollama.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import { ConfigurationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export type ProviderType = 'gemini' | 'openai' | 'ollama' | 'openai-compatible';

/**
 * Create an embedding provider based on type and configuration
 */
export function createEmbeddingProvider(
  type: ProviderType,
  config: ProviderConfig
): EmbeddingProvider {
  logger.info(`Creating embedding provider: ${type}`);

  switch (type) {
    case 'gemini':
      return new GeminiEmbeddingProvider(config);

    case 'openai':
      return new OpenAIEmbeddingProvider(config);

    case 'ollama':
      return new OllamaEmbeddingProvider(config);

    case 'openai-compatible':
      return new OpenAICompatibleProvider(config);

    default:
      throw new ConfigurationError(`Unknown embedding provider type: ${type}`);
  }
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(type: ProviderType, config: ProviderConfig): string[] {
  const errors: string[] = [];

  switch (type) {
    case 'gemini':
      if (!config.apiKey) {
        errors.push('Gemini API key is required');
      }
      break;

    case 'openai':
      if (!config.apiKey) {
        errors.push('OpenAI API key is required');
      }
      break;

    case 'ollama':
      if (!config.baseUrl) {
        errors.push('Ollama base URL is required');
      }
      break;

    case 'openai-compatible':
      if (!config.apiKey) {
        errors.push('API key is required for OpenAI-compatible provider');
      }
      if (!config.baseUrl) {
        errors.push('Base URL is required for OpenAI-compatible provider');
      }
      break;

    default:
      errors.push(`Unknown provider type: ${type}`);
  }

  return errors;
}

/**
 * Get default configuration for provider
 */
export function getDefaultProviderConfig(type: ProviderType): Partial<ProviderConfig> {
  switch (type) {
    case 'gemini':
      return {
        model: 'text-embedding-004',
        dimensions: 768,
      };

    case 'openai':
      return {
        model: 'text-embedding-3-small',
        dimensions: 1536,
      };

    case 'ollama':
      return {
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        dimensions: 768,
      };

    case 'openai-compatible':
      return {
        model: 'text-embedding-ada-002',
        dimensions: 1536,
      };

    default:
      return {};
  }
}

// Re-export types and classes
export type { EmbeddingProvider } from './base.js';
export type {
  Embedding,
  BatchEmbeddingResult,
  ProviderConfig,
  ProviderHealth,
  EmbeddingOptions,
} from './types.js';

export { GeminiEmbeddingProvider } from './gemini.js';
export { OpenAIEmbeddingProvider } from './openai.js';
export { OllamaEmbeddingProvider } from './ollama.js';
export { OpenAICompatibleProvider } from './openai-compatible.js';
