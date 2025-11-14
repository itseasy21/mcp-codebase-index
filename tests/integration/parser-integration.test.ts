/**
 * Integration tests for parser system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CodeParser } from '../../src/parser/index.js';
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

  describe('Markdown File Parsing', () => {
    const sampleFile = join(process.cwd(), 'tests/fixtures/sample.md');

    it('should parse Markdown file end-to-end', async () => {
      const result = await parser.parseFile(sampleFile);

      expect(result.blocks).toBeDefined();
      expect(Array.isArray(result.blocks)).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.language).toBe('markdown');
    });

    it('should extract markdown sections', async () => {
      const result = await parser.parseFile(sampleFile);
      const blocks = result.blocks;

      blocks.forEach(block => {
        expect(block.type).toBe('markdown_section');
        expect(block.language).toBe('markdown');
      });
    });

    it('should include header levels in metadata', async () => {
      const result = await parser.parseFile(sampleFile);
      const blocks = result.blocks;

      const withLevels = blocks.filter(b => b.metadata?.level !== undefined);
      expect(withLevels.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw on missing files', async () => {
      await expect(async () => {
        await parser.parseFile('nonexistent-file-that-does-not-exist.ts');
      }).rejects.toThrow();
    });
  });
});
