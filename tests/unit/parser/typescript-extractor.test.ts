/**
 * Tests for TypeScript parsing via tree-sitter
 */

import { describe, it, expect } from 'vitest';
import { treeSitterParser } from '../../../src/parser/tree-sitter.js';

describe('TypeScript Parsing', () => {
  describe('language support', () => {
    it('should support TypeScript', () => {
      expect(treeSitterParser.isLanguageSupported('typescript')).toBe(true);
    });

    it('should support JavaScript', () => {
      expect(treeSitterParser.isLanguageSupported('javascript')).toBe(true);
    });

    it('should support Python', () => {
      expect(treeSitterParser.isLanguageSupported('python')).toBe(true);
    });

    it('should not support markdown', () => {
      expect(treeSitterParser.isLanguageSupported('markdown')).toBe(false);
    });
  });

  // Note: Actual parsing tests are skipped in unit tests due to tree-sitter
  // async language loading complexity. These are covered by integration tests.
  describe('extract (covered by integration tests)', () => {
    it.skip('should extract code blocks from TypeScript file', () => {
      // Tree-sitter language loading requires complex async setup
      // This functionality is tested in integration tests
    });
  });
});
