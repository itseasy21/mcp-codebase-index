/**
 * Tests for Markdown parser
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownParser } from '../../../src/parser/markdown-parser.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;
  const sampleFilePath = join(process.cwd(), 'tests/fixtures/sample.md');
  let sampleContent: string;

  beforeEach(() => {
    parser = new MarkdownParser();
    sampleContent = readFileSync(sampleFilePath, 'utf-8');
  });

  describe('parse', () => {
    it('should parse markdown file into sections', () => {
      const blocks = parser.parse(sampleFilePath, sampleContent);

      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should extract header-based sections', () => {
      const blocks = parser.parse(sampleFilePath, sampleContent);

      // Should have multiple sections based on headers
      expect(blocks.length).toBeGreaterThanOrEqual(5);

      // Check for specific headers
      const intro = blocks.find(b => b.name === 'Introduction');
      expect(intro).toBeDefined();

      const features = blocks.find(b => b.name === 'Features');
      expect(features).toBeDefined();
    });

    it('should set correct block types', () => {
      const blocks = parser.parse(sampleFilePath, sampleContent);

      blocks.forEach(block => {
        expect(block.type).toBe('markdown_section');
        expect(block.language).toBe('markdown');
      });
    });

    it('should include header level in metadata', () => {
      const blocks = parser.parse(sampleFilePath, sampleContent);

      blocks.forEach(block => {
        if (block.metadata?.level) {
          expect(block.metadata.level).toBeGreaterThanOrEqual(0);
          expect(block.metadata.level).toBeLessThanOrEqual(6);
        }
      });
    });

    it('should set correct line numbers', () => {
      const blocks = parser.parse(sampleFilePath, sampleContent);

      blocks.forEach(block => {
        expect(block.line).toBeGreaterThan(0);
        expect(block.endLine).toBeGreaterThanOrEqual(block.line);
      });
    });

    it('should handle nested headers', () => {
      const content = `# Level 1\n\n## Level 2\n\n### Level 3\n\nContent`;
      const blocks = parser.parse('test.md', content);

      expect(blocks.length).toBe(3);
      expect(blocks[0].metadata?.level).toBe(1);
      expect(blocks[1].metadata?.level).toBe(2);
      expect(blocks[2].metadata?.level).toBe(3);
    });

    it('should handle content before first header', () => {
      const content = `Some preamble text\n\n# First Header\n\nContent`;
      const blocks = parser.parse('test.md', content);

      // Should have preamble section
      const preamble = blocks.find(b => b.name === 'Preamble');
      expect(preamble).toBeDefined();
    });

    it('should generate content hashes', () => {
      const blocks = parser.parse(sampleFilePath, sampleContent);

      blocks.forEach(block => {
        expect(block.hash).toBeDefined();
        expect(typeof block.hash).toBe('string');
        expect(block.hash.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty file', () => {
      const blocks = parser.parse('empty.md', '');

      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBe(0);
    });

    it('should handle file with no headers', () => {
      const content = 'Just some plain text without any headers';
      const blocks = parser.parse('plain.md', content);

      expect(blocks.length).toBe(1);
      // Content before first header is labeled as 'Preamble'
      expect(blocks[0].name).toBe('Preamble');
    });
  });

  describe('extractHeadings', () => {
    it('should extract all headings with correct levels', () => {
      const headings = parser.extractHeadings(sampleContent);

      expect(headings).toBeDefined();
      expect(Array.isArray(headings)).toBe(true);
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should extract heading titles correctly', () => {
      const headings = parser.extractHeadings(sampleContent);

      const mainHeading = headings.find(h => h.title === 'Sample Markdown Document');
      expect(mainHeading).toBeDefined();
      expect(mainHeading?.level).toBe(1);

      const intro = headings.find(h => h.title === 'Introduction');
      expect(intro).toBeDefined();
      expect(intro?.level).toBe(2);
    });

    it('should set correct line numbers', () => {
      const headings = parser.extractHeadings(sampleContent);

      headings.forEach(heading => {
        expect(heading.line).toBeGreaterThan(0);
      });

      // Line numbers should be in ascending order
      for (let i = 1; i < headings.length; i++) {
        expect(headings[i].line).toBeGreaterThan(headings[i - 1].line);
      }
    });

    it('should handle empty content', () => {
      const headings = parser.extractHeadings('');

      expect(headings).toBeDefined();
      expect(Array.isArray(headings)).toBe(true);
      expect(headings.length).toBe(0);
    });

    it('should handle content with no headings', () => {
      const content = 'Just plain text\nwith multiple lines\nbut no headings';
      const headings = parser.extractHeadings(content);

      expect(headings.length).toBe(0);
    });
  });
});
