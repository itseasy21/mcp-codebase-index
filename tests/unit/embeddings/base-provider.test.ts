/**
 * Tests for embedding providers
 */

import { describe, it, expect } from 'vitest';
import { GeminiEmbeddingProvider } from '../../../src/embeddings/gemini.js';
import { OpenAIEmbeddingProvider } from '../../../src/embeddings/openai.js';
import { OllamaEmbeddingProvider } from '../../../src/embeddings/ollama.js';

describe('Embedding Providers', () => {
  describe('GeminiProvider', () => {
    it('should have correct provider name', () => {
      const provider = new GeminiEmbeddingProvider({
        apiKey: 'dummy-key-for-testing',
        model: 'text-embedding-004',
        dimensions: 768,
      });

      expect(provider.name).toBe('gemini');
    });

    it('should return correct embedding dimensions', () => {
      const provider = new GeminiEmbeddingProvider({
        apiKey: 'dummy-key-for-testing',
        model: 'text-embedding-004',
        dimensions: 768,
      });

      expect(provider.defaultDimensions).toBe(768);
    });
  });

  describe('OpenAIProvider', () => {
    it('should have correct provider name', () => {
      const provider = new OpenAIEmbeddingProvider({
        apiKey: 'dummy-key-for-testing',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      expect(provider.name).toBe('openai');
    });

    it('should return correct embedding dimensions', () => {
      const provider = new OpenAIEmbeddingProvider({
        apiKey: 'dummy-key-for-testing',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      expect(provider.defaultDimensions).toBe(1536);
    });
  });

  describe('OllamaProvider', () => {
    it('should have correct provider name', () => {
      const provider = new OllamaEmbeddingProvider({
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        dimensions: 768,
      });

      expect(provider.name).toBe('ollama');
    });

    it('should return correct embedding dimensions', () => {
      const provider = new OllamaEmbeddingProvider({
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        dimensions: 768,
      });

      expect(provider.defaultDimensions).toBe(768);
    });
  });

  describe('Provider Interface Compliance', () => {
    it('all providers should implement required methods', () => {
      const gemini = new GeminiEmbeddingProvider({
        apiKey: 'test',
        model: 'text-embedding-004',
        dimensions: 768,
      });

      const openai = new OpenAIEmbeddingProvider({
        apiKey: 'test',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      const ollama = new OllamaEmbeddingProvider({
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        dimensions: 768,
      });

      // Check all providers have required methods
      expect(typeof gemini.embed).toBe('function');
      expect(typeof gemini.embedBatch).toBe('function');
      expect(typeof gemini.healthCheck).toBe('function');

      expect(typeof openai.embed).toBe('function');
      expect(typeof openai.embedBatch).toBe('function');
      expect(typeof openai.healthCheck).toBe('function');

      expect(typeof ollama.embed).toBe('function');
      expect(typeof ollama.embedBatch).toBe('function');
      expect(typeof ollama.healthCheck).toBe('function');

      // Check properties
      expect(gemini.name).toBe('gemini');
      expect(openai.name).toBe('openai');
      expect(ollama.name).toBe('ollama');
    });
  });
});
