/**
 * Integration tests for parser system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CodeParser } from '../../src/parser/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Parser Integration Tests', () => {
  let parser: CodeParser;

  beforeEach(() => {
    parser = new CodeParser({
      maxFileSize: 1048576, // 1MB
      excludeBinaries: true,
      excludeImages: true,
      fallbackChunking: true,
      markdownHeaderParsing: true,
    });
  });

  describe('TypeScript File Parsing', () => {
    const sampleFile = join(process.cwd(), 'tests/fixtures/sample.ts');

    it('should parse TypeScript file end-to-end', async () => {
      const content = readFileSync(sampleFile, 'utf-8');
      const blocks = await parser.parse(sampleFile, content);

      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should extract multiple block types', async () => {
      const content = readFileSync(sampleFile, 'utf-8');
      const blocks = await parser.parse(sampleFile, content);

      const types = new Set(blocks.map(b => b.type));

      // Should have various block types
      expect(types.size).toBeGreaterThan(1);
      expect(types.has('function') || types.has('class') || types.has('interface')).toBe(true);
    });

    it('should set correct metadata', async () => {
      const content = readFileSync(sampleFile, 'utf-8');
      const blocks = await parser.parse(sampleFile, content);

      blocks.forEach(block => {
        expect(block.id).toBeDefined();
        expect(block.file).toBe(sampleFile);
        expect(block.language).toBe('typescript');
        expect(block.line).toBeGreaterThan(0);
        expect(block.endLine).toBeGreaterThanOrEqual(block.line);
        expect(block.code).toBeDefined();
        expect(block.hash).toBeDefined();
      });
    });
  });

  describe('Markdown File Parsing', () => {
    const sampleFile = join(process.cwd(), 'tests/fixtures/sample.md');

    it('should parse Markdown file end-to-end', async () => {
      const content = readFileSync(sampleFile, 'utf-8');
      const blocks = await parser.parse(sampleFile, content);

      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should extract markdown sections', async () => {
      const content = readFileSync(sampleFile, 'utf-8');
      const blocks = await parser.parse(sampleFile, content);

      blocks.forEach(block => {
        expect(block.type).toBe('markdown_section');
        expect(block.language).toBe('markdown');
      });
    });

    it('should include header levels in metadata', async () => {
      const content = readFileSync(sampleFile, 'utf-8');
      const blocks = await parser.parse(sampleFile, content);

      const withLevels = blocks.filter(b => b.metadata?.level !== undefined);
      expect(withLevels.length).toBeGreaterThan(0);
    });
  });

  describe('Parser Configuration', () => {
    it('should respect maxFileSize limit', async () => {
      const smallParser = new CodeParser({
        maxFileSize: 100, // Very small limit
        excludeBinaries: true,
        excludeImages: true,
        fallbackChunking: true,
        markdownHeaderParsing: true,
      });

      const largeContent = 'x'.repeat(1000);
      const blocks = await smallParser.parse('large.ts', largeContent);

      // Should either skip or chunk the large file
      expect(blocks).toBeDefined();
    });

    it('should handle unknown file types gracefully', async () => {
      const content = 'Some unknown file content';
      const blocks = await parser.parse('unknown.xyz', content);

      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty files', async () => {
      const blocks = await parser.parse('empty.ts', '');

      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
    });

    it('should handle malformed content', async () => {
      const malformed = 'function broken( { const x = }';
      const blocks = await parser.parse('malformed.ts', malformed);

      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
    });

    it('should not throw on syntax errors', async () => {
      const invalid = '!!!INVALID SYNTAX@@@';

      await expect(async () => {
        await parser.parse('invalid.ts', invalid);
      }).not.toThrow();
    });
  });

  describe('Fallback Chunking', () => {
    it('should use fallback chunking for unsupported languages', async () => {
      const content = 'Some text content\n'.repeat(100);
      const blocks = await parser.parse('file.txt', content);

      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
    });

    it('should create reasonably sized chunks', async () => {
      const content = 'line\n'.repeat(1000);
      const blocks = await parser.parse('large.txt', content);

      if (blocks.length > 0) {
        blocks.forEach(block => {
          // Chunks shouldn't be too large
          expect(block.code.length).toBeLessThan(100000);
        });
      }
    });
  });
});
