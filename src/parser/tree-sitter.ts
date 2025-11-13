/**
 * Tree-sitter wrapper for parsing code
 */

import Parser from 'tree-sitter';
import { languageRegistry } from './language-registry.js';
import type { CodeExtractor } from './extractors/base.js';
import { TypeScriptExtractor, JavaScriptExtractor } from './extractors/typescript.js';
import { PythonExtractor } from './extractors/python.js';
import type { CodeBlock } from '../types/models.js';
import { logger } from '../utils/logger.js';
import { ParsingError } from '../utils/errors.js';

/**
 * Tree-sitter based code parser
 */
export class TreeSitterParser {
  private parser: Parser;
  private extractors: Map<string, CodeExtractor>;

  constructor() {
    this.parser = new Parser();
    this.extractors = new Map();
    this.registerExtractors();
  }

  /**
   * Register language-specific extractors
   */
  private registerExtractors(): void {
    // TypeScript/JavaScript
    const tsExtractor = new TypeScriptExtractor();
    const jsExtractor = new JavaScriptExtractor();

    this.extractors.set('typescript', tsExtractor);
    this.extractors.set('javascript', jsExtractor);

    // Python
    const pyExtractor = new PythonExtractor();
    this.extractors.set('python', pyExtractor);

    logger.debug(`Registered ${this.extractors.size} code extractors`);
  }

  /**
   * Parse file content and extract code blocks
   */
  async parse(filePath: string, content: string, language: string): Promise<CodeBlock[]> {
    try {
      // Get the Tree-sitter grammar for this language
      const grammar = await languageRegistry.getParser(language);

      if (!grammar) {
        throw new ParsingError(`No grammar available for language: ${language}`, filePath);
      }

      // Set the language
      this.parser.setLanguage(grammar);

      // Parse the content
      const tree = this.parser.parse(content);

      // Check for syntax errors
      if (tree.rootNode.hasError) {
        logger.warn(`Syntax errors found in ${filePath}, will extract what we can`);
      }

      // Get the extractor for this language
      const extractor = this.getExtractor(language);

      if (!extractor) {
        throw new ParsingError(`No extractor available for language: ${language}`, filePath);
      }

      // Extract code blocks
      const blocks = extractor.extract(tree, filePath, content);

      logger.debug(`Extracted ${blocks.length} blocks from ${filePath}`);

      return blocks;
    } catch (error) {
      if (error instanceof ParsingError) {
        throw error;
      }
      throw new ParsingError(
        `Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  /**
   * Get extractor for language
   */
  private getExtractor(language: string): CodeExtractor | null {
    return this.extractors.get(language) ?? null;
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.extractors.has(language) && languageRegistry.hasGrammar(language);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.extractors.keys());
  }

  /**
   * Register a custom extractor
   */
  registerExtractor(language: string, extractor: CodeExtractor): void {
    this.extractors.set(language, extractor);
    logger.debug(`Registered custom extractor for ${language}`);
  }
}

// Export singleton instance
export const treeSitterParser = new TreeSitterParser();
