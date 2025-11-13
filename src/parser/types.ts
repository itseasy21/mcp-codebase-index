/**
 * Types for code parsing
 */

import type { CodeBlock, CodeBlockType } from '../types/models.js';

/**
 * Parser result containing extracted code blocks
 */
export interface ParseResult {
  blocks: CodeBlock[];
  language: string;
  file: string;
  errors?: ParseError[];
}

/**
 * Parse error
 */
export interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Language information
 */
export interface LanguageInfo {
  name: string;
  extensions: string[];
  aliases?: string[];
  treeSitterName?: string;
  hasGrammar: boolean;
}

/**
 * Parser options
 */
export interface ParserOptions {
  maxFileSize?: number;
  excludeBinaries?: boolean;
  excludeImages?: boolean;
  fallbackChunking?: boolean;
  markdownHeaderParsing?: boolean;
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * File parsing context
 */
export interface FileContext {
  path: string;
  content: string;
  language: string;
  size: number;
  hash?: string;
}

/**
 * Tree-sitter node information
 */
export interface NodeInfo {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children?: NodeInfo[];
}

/**
 * Extraction result from a single node
 */
export interface ExtractionResult {
  type: CodeBlockType;
  name: string;
  startLine: number;
  endLine: number;
  text: string;
  metadata?: any;
}
