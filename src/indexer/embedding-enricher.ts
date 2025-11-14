/**
 * Enriches code chunks with metadata context before embedding
 * Improves search relevance by giving embedding model more semantic information
 */

import type { CodeBlock } from '../types/models.js';
import { basename, dirname } from 'path';

export interface EnrichmentOptions {
  includeFilePath?: boolean;
  includeBlockType?: boolean;
  includeBlockName?: boolean;
  includeComments?: boolean;
  format?: 'compact' | 'descriptive' | 'structured';
}

/**
 * Enriches code blocks with contextual metadata for better embeddings
 */
export class EmbeddingEnricher {
  private readonly defaultOptions: Required<EnrichmentOptions> = {
    includeFilePath: true,
    includeBlockType: true,
    includeBlockName: true,
    includeComments: true,
    format: 'structured',
  };

  /**
   * Enrich a code block with metadata context
   * Returns text that will be embedded instead of raw code
   */
  enrich(block: CodeBlock, options: EnrichmentOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };

    switch (opts.format) {
      case 'compact':
        return this.enrichCompact(block, opts);
      case 'descriptive':
        return this.enrichDescriptive(block, opts);
      case 'structured':
      default:
        return this.enrichStructured(block, opts);
    }
  }

  /**
   * Compact format: Brief metadata prefix + code
   * Example: "file.ts|function:doSomething| <code>"
   */
  private enrichCompact(block: CodeBlock, opts: Required<EnrichmentOptions>): string {
    const parts: string[] = [];

    if (opts.includeFilePath) {
      parts.push(this.getFileContext(block.file));
    }

    if (opts.includeBlockType && opts.includeBlockName && block.name) {
      parts.push(`${block.type}:${block.name}`);
    } else if (opts.includeBlockType) {
      parts.push(block.type);
    }

    const prefix = parts.length > 0 ? parts.join('|') + '|\n' : '';
    return prefix + block.code;
  }

  /**
   * Descriptive format: Natural language description + code
   * Example: "This is a function called 'doSomething' in file.ts:\n<code>"
   */
  private enrichDescriptive(block: CodeBlock, opts: Required<EnrichmentOptions>): string {
    const description = this.buildDescription(block, opts);
    return description ? `${description}\n\n${block.code}` : block.code;
  }

  /**
   * Structured format: Clear sections for metadata and code
   * Example:
   * File: src/utils/file.ts
   * Type: function
   * Name: readFile
   * ---
   * <code>
   */
  private enrichStructured(block: CodeBlock, opts: Required<EnrichmentOptions>): string {
    const parts: string[] = [];

    if (opts.includeFilePath) {
      const fileContext = this.getFileContext(block.file);
      parts.push(`File: ${fileContext}`);
    }

    if (opts.includeBlockType) {
      parts.push(`Type: ${block.type}`);
    }

    if (opts.includeBlockName && block.name) {
      parts.push(`Name: ${block.name}`);
    }

    // Add parameter info for functions/methods
    if (
      (block.type === 'function' || block.type === 'method') &&
      block.metadata?.parameters &&
      block.metadata.parameters.length > 0
    ) {
      parts.push(`Parameters: ${block.metadata.parameters.join(', ')}`);
    }

    // Add return type if available
    if (block.metadata?.returnType) {
      parts.push(`Returns: ${block.metadata.returnType}`);
    }

    // Add comments if available and enabled
    if (opts.includeComments && block.metadata?.comments) {
      const cleanedComments = this.cleanComments(block.metadata.comments);
      if (cleanedComments) {
        parts.push(`Description: ${cleanedComments}`);
      }
    }

    // Add language for context
    if (block.language) {
      parts.push(`Language: ${block.language}`);
    }

    if (parts.length === 0) {
      return block.code;
    }

    return parts.join('\n') + '\n---\n' + block.code;
  }

  /**
   * Build a natural language description of the code block
   */
  private buildDescription(block: CodeBlock, opts: Required<EnrichmentOptions>): string {
    const parts: string[] = [];

    // Start with block type and name
    if (opts.includeBlockType && opts.includeBlockName && block.name) {
      const article = this.getArticle(block.type);
      parts.push(`This is ${article} ${block.type} called '${block.name}'`);
    } else if (opts.includeBlockType) {
      const article = this.getArticle(block.type);
      parts.push(`This is ${article} ${block.type}`);
    }

    // Add file location
    if (opts.includeFilePath) {
      const fileContext = this.getFileContext(block.file);
      if (parts.length > 0) {
        parts.push(`in ${fileContext}`);
      } else {
        parts.push(`Code from ${fileContext}`);
      }
    }

    // Add metadata details
    const details: string[] = [];

    if (block.metadata?.parameters && block.metadata.parameters.length > 0) {
      details.push(`parameters: ${block.metadata.parameters.join(', ')}`);
    }

    if (block.metadata?.returnType) {
      details.push(`returns ${block.metadata.returnType}`);
    }

    if (block.metadata?.isAsync) {
      details.push('async');
    }

    if (block.metadata?.visibility) {
      details.push(block.metadata.visibility);
    }

    if (details.length > 0) {
      parts.push(`(${details.join(', ')})`);
    }

    // Add comments if available
    if (opts.includeComments && block.metadata?.comments) {
      const cleanedComments = this.cleanComments(block.metadata.comments);
      if (cleanedComments) {
        parts.push(`\nDescription: ${cleanedComments}`);
      }
    }

    return parts.join(' ').trim() + ':';
  }

  /**
   * Get meaningful file context (path + filename)
   * Extracts semantic information from path
   */
  private getFileContext(filePath: string): string {
    const filename = basename(filePath);
    const dir = dirname(filePath);

    // For files in root or simple paths, just return filename
    if (dir === '.' || dir === '/') {
      return filename;
    }

    // Extract meaningful path segments
    const segments = dir.split('/').filter(s => s && s !== '.');

    // Keep last 2-3 segments for context without being too verbose
    const relevantSegments = segments.slice(-2);

    if (relevantSegments.length > 0) {
      return `${relevantSegments.join('/')}/${filename}`;
    }

    return filename;
  }

  /**
   * Clean comment text for embedding
   */
  private cleanComments(comments: string): string {
    return comments
      // Remove comment markers
      .replace(/\/\*\*?|\*\/|\/\/|^\s*\*\s?/gm, '')
      // Remove @tags
      .replace(/@\w+/g, '')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Limit length
      .substring(0, 200);
  }

  /**
   * Get appropriate article for a word
   */
  private getArticle(word: string): string {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    return vowels.includes(word[0].toLowerCase()) ? 'an' : 'a';
  }

  /**
   * Batch enrich multiple blocks
   */
  enrichBatch(blocks: CodeBlock[], options: EnrichmentOptions = {}): string[] {
    return blocks.map(block => this.enrich(block, options));
  }
}

// Export singleton
export const embeddingEnricher = new EmbeddingEnricher();
