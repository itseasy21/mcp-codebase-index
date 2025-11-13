/**
 * Extract code context around search results
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { EnhancedSearchResult } from './types.js';
import { logger } from '../utils/logger.js';

export interface ContextOptions {
  linesBefore?: number;
  linesAfter?: number;
  includeLineNumbers?: boolean;
}

/**
 * Extract context around code blocks
 */
export class ContextExtractor {
  constructor(private basePath: string) {}

  /**
   * Add context to search results
   */
  async addContext(
    results: EnhancedSearchResult[],
    options: ContextOptions = {}
  ): Promise<EnhancedSearchResult[]> {
    const linesBefore = options.linesBefore ?? 3;
    const linesAfter = options.linesAfter ?? 3;

    const resultsWithContext: EnhancedSearchResult[] = [];

    for (const result of results) {
      try {
        const context = await this.extractContext(result.file, result.line, {
          linesBefore,
          linesAfter,
          includeLineNumbers: options.includeLineNumbers,
        });

        resultsWithContext.push({
          ...result,
          context,
        });
      } catch (error) {
        logger.warn(`Failed to extract context for ${result.file}:${result.line}`);
        resultsWithContext.push(result);
      }
    }

    return resultsWithContext;
  }

  /**
   * Extract context lines from file
   */
  private async extractContext(
    file: string,
    targetLine: number,
    options: ContextOptions
  ): Promise<string> {
    try {
      const filePath = join(this.basePath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      const linesBefore = options.linesBefore ?? 3;
      const linesAfter = options.linesAfter ?? 3;

      // Calculate range
      const startLine = Math.max(0, targetLine - 1 - linesBefore);
      const endLine = Math.min(lines.length, targetLine + linesAfter);

      // Extract lines
      const contextLines = lines.slice(startLine, endLine);

      // Add line numbers if requested
      if (options.includeLineNumbers) {
        return contextLines
          .map((line, index) => {
            const lineNum = startLine + index + 1;
            const marker = lineNum === targetLine ? '>' : ' ';
            return `${marker} ${lineNum.toString().padStart(4, ' ')} | ${line}`;
          })
          .join('\n');
      }

      return contextLines.join('\n');
    } catch (error) {
      logger.debug(`Failed to read file for context: ${file}`, error);
      return '';
    }
  }

  /**
   * Extract full function/class containing the line
   */
  async extractFullBlock(
    file: string,
    startLine: number,
    endLine: number
  ): Promise<string> {
    try {
      const filePath = join(this.basePath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Extract the full block
      const blockLines = lines.slice(startLine - 1, endLine);
      return blockLines.join('\n');
    } catch (error) {
      logger.debug(`Failed to extract full block from ${file}`, error);
      return '';
    }
  }

  /**
   * Highlight query matches in context
   */
  highlightMatches(text: string, query: string): string {
    if (!query) return text;

    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(Boolean);

    let highlighted = text;
    for (const word of words) {
      const regex = new RegExp(`(${this.escapeRegex(word)})`, 'gi');
      highlighted = highlighted.replace(regex, '**$1**');
    }

    return highlighted;
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get line range for a result
   */
  getLineRange(result: EnhancedSearchResult): { start: number; end: number } {
    return {
      start: result.line,
      end: result.metadata?.endLine || result.line,
    };
  }
}
