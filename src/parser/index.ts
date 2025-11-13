/**
 * Main parser orchestrator
 */

import type { CodeBlock } from '../types/models.js';
import type { ParserOptions, ParseResult } from './types.js';
import { treeSitterParser } from './tree-sitter.js';
import { markdownParser } from './markdown-parser.js';
import { fallbackChunker } from './fallback-chunker.js';
import {
  detectLanguage,
  isBinaryFile,
  isImageFile,
  readFileContent,
  isFileTooLarge,
  shouldExcludeFile,
} from '../utils/file-utils.js';
import { logger } from '../utils/logger.js';
import { ParsingError } from '../utils/errors.js';

/**
 * Main parser that orchestrates different parsing strategies
 */
export class CodeParser {
  private options: Required<ParserOptions>;

  constructor(options: ParserOptions = {}) {
    this.options = {
      maxFileSize: options.maxFileSize ?? 1048576, // 1MB
      excludeBinaries: options.excludeBinaries ?? true,
      excludeImages: options.excludeImages ?? true,
      fallbackChunking: options.fallbackChunking ?? true,
      markdownHeaderParsing: options.markdownHeaderParsing ?? true,
      chunkSize: options.chunkSize ?? 512,
      chunkOverlap: options.chunkOverlap ?? 50,
    };
  }

  /**
   * Parse a file and extract code blocks
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const errors: Array<{ line: number; column: number; message: string; severity: 'error' | 'warning' }> = [];

    try {
      // Pre-flight checks
      await this.validateFile(filePath);

      // Detect language
      const language = detectLanguage(filePath);
      if (!language) {
        throw new ParsingError(`Could not detect language for ${filePath}`, filePath);
      }

      // Read file content
      const content = await readFileContent(filePath);

      // Parse based on language and available parsers
      const blocks = await this.parseContent(filePath, content, language);

      return {
        blocks,
        language,
        file: filePath,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error(`Failed to parse ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Parse content with appropriate strategy
   */
  private async parseContent(
    filePath: string,
    content: string,
    language: string
  ): Promise<CodeBlock[]> {
    // Strategy 1: Markdown files
    if (language === 'markdown' && this.options.markdownHeaderParsing) {
      logger.debug(`Parsing ${filePath} as Markdown`);
      return markdownParser.parse(filePath, content);
    }

    // Strategy 2: Tree-sitter for supported languages
    if (treeSitterParser.isLanguageSupported(language)) {
      try {
        logger.debug(`Parsing ${filePath} with Tree-sitter (${language})`);
        return await treeSitterParser.parse(filePath, content, language);
      } catch (error) {
        logger.warn(`Tree-sitter parsing failed for ${filePath}, falling back to chunking:`, error);
        // Fall through to fallback chunking
      }
    }

    // Strategy 3: Fallback chunking for unsupported languages
    if (this.options.fallbackChunking) {
      logger.debug(`Using fallback chunking for ${filePath}`);
      return fallbackChunker.chunkSmart(filePath, content, language, {
        chunkSize: this.options.chunkSize,
        chunkOverlap: this.options.chunkOverlap,
      });
    }

    // No parsing strategy available
    logger.warn(`No parsing strategy available for ${filePath} (${language})`);
    return [];
  }

  /**
   * Validate file before parsing
   */
  private async validateFile(filePath: string): Promise<void> {
    // Check if file should be excluded by name
    if (shouldExcludeFile(filePath)) {
      throw new ParsingError(`File ${filePath} is excluded by name pattern`, filePath);
    }

    // Check if binary
    if (this.options.excludeBinaries && isBinaryFile(filePath)) {
      throw new ParsingError(`File ${filePath} is binary`, filePath);
    }

    // Check if image
    if (this.options.excludeImages && isImageFile(filePath)) {
      throw new ParsingError(`File ${filePath} is an image`, filePath);
    }

    // Check file size
    if (await isFileTooLarge(filePath, this.options.maxFileSize)) {
      throw new ParsingError(
        `File ${filePath} exceeds maximum size (${this.options.maxFileSize} bytes)`,
        filePath
      );
    }
  }

  /**
   * Check if file can be parsed
   */
  async canParse(filePath: string): Promise<boolean> {
    try {
      await this.validateFile(filePath);
      const language = detectLanguage(filePath);
      return language !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return [
      // Tree-sitter supported
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.py',
      '.java',
      '.go',
      '.rs',
      '.c',
      '.h',
      '.cpp',
      '.hpp',
      '.cs',
      '.rb',
      '.php',
      // Markdown
      '.md',
      '.markdown',
      // Fallback chunking (if enabled)
      ...(this.options.fallbackChunking
        ? ['.json', '.yaml', '.yml', '.toml', '.xml', '.html', '.css', '.sql', '.sh']
        : []),
    ];
  }

  /**
   * Update parser options
   */
  updateOptions(options: Partial<ParserOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): Required<ParserOptions> {
    return { ...this.options };
  }
}

// Export singleton instance
export const codeParser = new CodeParser();

// Export classes and utilities
export { TreeSitterParser } from './tree-sitter.js';
export { MarkdownParser } from './markdown-parser.js';
export { FallbackChunker } from './fallback-chunker.js';
export * from './types.js';
