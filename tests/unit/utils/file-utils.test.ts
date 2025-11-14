/**
 * Tests for file utility functions
 */

import { describe, it, expect } from 'vitest';
import { detectLanguage, hashContent } from '../../../src/utils/file-utils.js';

describe('File Utils', () => {
  describe('detectLanguage', () => {
    it('should detect TypeScript files', () => {
      expect(detectLanguage('test.ts')).toBe('typescript');
      expect(detectLanguage('component.tsx')).toBe('typescript');
    });

    it('should detect JavaScript files', () => {
      expect(detectLanguage('script.js')).toBe('javascript');
      expect(detectLanguage('app.jsx')).toBe('javascript');
      expect(detectLanguage('module.mjs')).toBe('javascript');
      expect(detectLanguage('common.cjs')).toBe('javascript');
    });

    it('should detect Python files', () => {
      expect(detectLanguage('script.py')).toBe('python');
      expect(detectLanguage('app.pyw')).toBe('python');
    });

    it('should detect Go files', () => {
      expect(detectLanguage('main.go')).toBe('go');
    });

    it('should detect Rust files', () => {
      expect(detectLanguage('main.rs')).toBe('rust');
    });

    it('should detect Java files', () => {
      expect(detectLanguage('Main.java')).toBe('java');
    });

    it('should detect C files', () => {
      expect(detectLanguage('program.c')).toBe('c');
      expect(detectLanguage('header.h')).toBe('c');
    });

    it('should detect C++ files', () => {
      expect(detectLanguage('main.cpp')).toBe('cpp');
      expect(detectLanguage('app.cc')).toBe('cpp');
      expect(detectLanguage('lib.cxx')).toBe('cpp');
      expect(detectLanguage('header.hpp')).toBe('cpp');
    });

    it('should detect C# files', () => {
      expect(detectLanguage('Program.cs')).toBe('csharp');
    });

    it('should detect Ruby files', () => {
      expect(detectLanguage('script.rb')).toBe('ruby');
    });

    it('should detect PHP files', () => {
      expect(detectLanguage('index.php')).toBe('php');
    });

    it('should detect Markdown files', () => {
      expect(detectLanguage('README.md')).toBe('markdown');
      expect(detectLanguage('doc.markdown')).toBe('markdown');
    });

    it('should be case-insensitive', () => {
      expect(detectLanguage('TEST.TS')).toBe('typescript');
      expect(detectLanguage('SCRIPT.PY')).toBe('python');
    });

    it('should handle paths', () => {
      expect(detectLanguage('/path/to/file.ts')).toBe('typescript');
      expect(detectLanguage('C:\\Users\\test\\file.py')).toBe('python');
    });

    it('should return null for unknown extensions', () => {
      expect(detectLanguage('file.txt')).toBeNull();
      expect(detectLanguage('image.png')).toBeNull();
      expect(detectLanguage('document.pdf')).toBeNull();
    });

    it('should return null for files without extension', () => {
      expect(detectLanguage('Makefile')).toBeNull();
      expect(detectLanguage('README')).toBeNull();
    });
  });

  describe('hashContent', () => {
    it('should generate hash for content', () => {
      const content = 'function test() { return 42; }';
      const hash = hashContent(content);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate consistent hashes', () => {
      const content = 'const x = 100;';
      const hash1 = hashContent(content);
      const hash2 = hashContent(content);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const content1 = 'const a = 1;';
      const content2 = 'const b = 2;';

      const hash1 = hashContent(content1);
      const hash2 = hashContent(content2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty content', () => {
      const hash = hashContent('');

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle whitespace differences', () => {
      const content1 = 'const x = 1;';
      const content2 = 'const  x  =  1;';

      const hash1 = hashContent(content1);
      const hash2 = hashContent(content2);

      // Whitespace should affect hash
      expect(hash1).not.toBe(hash2);
    });

    it('should handle unicode content', () => {
      const content = '// 中文注释\nconst emoji = "🚀";';
      const hash = hashContent(content);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle large content', () => {
      const largeContent = 'x'.repeat(100000);
      const hash = hashContent(largeContent);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });
});
