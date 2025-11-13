/**
 * Tests for embedding providers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiProvider } from '../../../src/embeddings/gemini.js';
import { OpenAIProvider } from '../../../src/embeddings/openai.js';
import { OllamaProvider } from '../../../src/embeddings/ollama.js';

describe('Embedding Providers', () => {
  describe('GeminiProvider', () => {
    it('should initialize with correct configuration', () => {
      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'text-embedding-004',
        dimensions: 768,
      });

      expect(provider).toBeDefined();
      expect(provider.defaultDimensions).toBe(768);
    });

    it('should validate required API key', () => {
      expect(() => {
        new GeminiProvider({
          apiKey: '',
          model: 'text-embedding-004',
          dimensions: 768,
        });
      }).toThrow();
    });

    it('should have correct provider name', () => {
      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'text-embedding-004',
        dimensions: 768,
      });

      expect(provider.name).toBe('gemini');
    });

    it('should return correct embedding dimensions', () => {
      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'text-embedding-004',
        dimensions: 768,
      });

      expect(provider.defaultDimensions).toBe(768);
    });
  });

  describe('OpenAIProvider', () => {
    it('should initialize with correct configuration', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      expect(provider).toBeDefined();
      expect(provider.defaultDimensions).toBe(1536);
    });

    it('should validate required API key', () => {
      expect(() => {
        new OpenAIProvider({
          apiKey: '',
          model: 'text-embedding-3-small',
          dimensions: 1536,
        });
      }).toThrow();
    });

    it('should have correct provider name', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      expect(provider.name).toBe('openai');
    });

    it('should support custom base URL', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        baseUrl: 'https://custom.openai.com/v1',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      expect(provider).toBeDefined();
    });
  });

  describe('OllamaProvider', () => {
    it('should initialize with correct configuration', () => {
      const provider = new OllamaProvider({
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        dimensions: 768,
      });

      expect(provider).toBeDefined();
      expect(provider.defaultDimensions).toBe(768);
    });

    it('should use default base URL if not provided', () => {
      const provider = new OllamaProvider({
        model: 'nomic-embed-text',
        dimensions: 768,
      });

      expect(provider).toBeDefined();
    });

    it('should have correct provider name', () => {
      const provider = new OllamaProvider({
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        dimensions: 768,
      });

      expect(provider.name).toBe('ollama');
    });

    it('should support custom models', () => {
      const provider = new OllamaProvider({
        baseUrl: 'http://localhost:11434',
        model: 'custom-embedding-model',
        dimensions: 1024,
      });

      expect(provider.defaultDimensions).toBe(1024);
    });
  });

  describe('Provider Interface Compliance', () => {
    it('all providers should implement embed method', () => {
      const gemini = new GeminiProvider({
        apiKey: 'test',
        model: 'text-embedding-004',
        dimensions: 768,
      });

      const openai = new OpenAIProvider({
        apiKey: 'test',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      const ollama = new OllamaProvider({
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        dimensions: 768,
      });

      expect(typeof gemini.embed).toBe('function');
      expect(typeof openai.embed).toBe('function');
      expect(typeof ollama.embed).toBe('function');
    });

    it('all providers should implement embedBatch method', () => {
      const gemini = new GeminiProvider({
        apiKey: 'test',
        model: 'text-embedding-004',
        dimensions: 768,
      });

      const openai = new OpenAIProvider({
        apiKey: 'test',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      const ollama = new OllamaProvider({
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        dimensions: 768,
      });

      expect(typeof gemini.embedBatch).toBe('function');
      expect(typeof openai.embedBatch).toBe('function');
      expect(typeof ollama.embedBatch).toBe('function');
    });

    it('all providers should implement healthCheck method', () => {
      const gemini = new GeminiProvider({
        apiKey: 'test',
        model: 'text-embedding-004',
        dimensions: 768,
      });

      const openai = new OpenAIProvider({
        apiKey: 'test',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      const ollama = new OllamaProvider({
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        dimensions: 768,
      });

      expect(typeof gemini.healthCheck).toBe('function');
      expect(typeof openai.healthCheck).toBe('function');
      expect(typeof ollama.healthCheck).toBe('function');
    });
  });
});
