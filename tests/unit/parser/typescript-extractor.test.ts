/**
 * Tests for TypeScript parsing via tree-sitter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { treeSitterParser } from '../../../src/parser/tree-sitter.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('TypeScript Parsing', () => {
  const sampleFilePath = join(process.cwd(), 'tests/fixtures/sample.ts');
  let sampleContent: string;

  beforeEach(() => {
    sampleContent = readFileSync(sampleFilePath, 'utf-8');
  });

  describe('extract', () => {
    it('should extract code blocks from TypeScript file', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');

      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should extract function declarations', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');
      const functions = blocks.filter(b => b.type === 'function');

      expect(functions.length).toBeGreaterThan(0);

      // Check for the 'add' function
      const addFunction = functions.find(f => f.name === 'add');
      expect(addFunction).toBeDefined();
      expect(addFunction?.code).toContain('function add');
      expect(addFunction?.line).toBeGreaterThan(0);
    });

    it('should extract class declarations', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');
      const classes = blocks.filter(b => b.type === 'class');

      expect(classes.length).toBeGreaterThan(0);

      // Check for the 'Calculator' class
      const calculatorClass = classes.find(c => c.name === 'Calculator');
      expect(calculatorClass).toBeDefined();
      expect(calculatorClass?.code).toContain('class Calculator');
    });

    it('should extract method declarations', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');
      const methods = blocks.filter(b => b.type === 'method');

      expect(methods.length).toBeGreaterThan(0);

      // Check for methods within Calculator class
      const multiplyMethod = methods.find(m => m.name === 'multiply');
      expect(multiplyMethod).toBeDefined();
      expect(multiplyMethod?.code).toContain('multiply');
    });

    it('should extract interface declarations', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');
      const interfaces = blocks.filter(b => b.type === 'interface');

      expect(interfaces.length).toBeGreaterThan(0);

      // Check for the 'User' interface
      const userInterface = interfaces.find(i => i.name === 'User');
      expect(userInterface).toBeDefined();
      expect(userInterface?.code).toContain('interface User');
    });

    it('should extract type alias declarations', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');
      const types = blocks.filter(b => b.type === 'type');

      expect(types.length).toBeGreaterThan(0);

      // Check for the 'UserId' type
      const userIdType = types.find(t => t.name === 'UserId');
      expect(userIdType).toBeDefined();
      expect(userIdType?.code).toContain('type UserId');
    });

    it('should extract enum declarations', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');
      const enums = blocks.filter(b => b.type === 'enum');

      expect(enums.length).toBeGreaterThan(0);

      // Check for the 'Status' enum
      const statusEnum = enums.find(e => e.name === 'Status');
      expect(statusEnum).toBeDefined();
      expect(statusEnum?.code).toContain('enum Status');
    });

    it('should set correct file paths', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');

      blocks.forEach(block => {
        expect(block.file).toBe(sampleFilePath);
      });
    });

    it('should set correct line numbers', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');

      blocks.forEach(block => {
        expect(block.line).toBeGreaterThan(0);
        expect(block.endLine).toBeGreaterThanOrEqual(block.line);
      });
    });

    it('should generate unique IDs', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');
      const ids = new Set(blocks.map(b => b.id));

      expect(ids.size).toBe(blocks.length);
    });

    it('should generate content hashes', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, sampleContent, 'typescript');

      blocks.forEach(block => {
        expect(block.hash).toBeDefined();
        expect(typeof block.hash).toBe('string');
        expect(block.hash.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty file', async () => {
      const blocks = await treeSitterParser.parse(sampleFilePath, '', 'typescript');

      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBe(0);
    });

    it('should handle malformed TypeScript', async () => {
      const malformed = 'function incomplete( {';
      const blocks = await treeSitterParser.parse(sampleFilePath, malformed, 'typescript');

      // Should not throw, but may return empty or partial results
      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
    });
  });

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
});
