/**
 * Fallback line-based chunker for unsupported file types
 */

import type { CodeBlock } from '../types/models.js';
import { hashContent } from '../utils/file-utils.js';

export interface ChunkerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  minChunkSize?: number;
}

/**
 * Simple line-based chunker for files without Tree-sitter support
 */
export class FallbackChunker {
  private readonly defaultChunkSize = 50; // lines
  private readonly defaultOverlap = 5; // lines
  private readonly minChunkSize = 10; // lines

  /**
   * Chunk file content into blocks
   */
  chunk(
    filePath: string,
    content: string,
    language: string,
    options: ChunkerOptions = {}
  ): CodeBlock[] {
    const chunkSize = options.chunkSize ?? this.defaultChunkSize;
    const overlap = options.chunkOverlap ?? this.defaultOverlap;
    const minSize = options.minChunkSize ?? this.minChunkSize;

    const lines = content.split('\n');
    const blocks: CodeBlock[] = [];

    // If file is small enough, return as single block
    if (lines.length <= chunkSize) {
      blocks.push({
        id: `${filePath}:1`,
        file: filePath,
        line: 1,
        endLine: lines.length,
        code: content,
        type: 'chunk',
        name: `Full file`,
        language,
        hash: hashContent(content),
      });
      return blocks;
    }

    // Chunk the file with overlap
    let startLine = 0;
    let chunkIndex = 0;

    while (startLine < lines.length) {
      const endLine = Math.min(startLine + chunkSize, lines.length);
      const chunkLines = lines.slice(startLine, endLine);
      const chunkContent = chunkLines.join('\n');

      // Skip empty or very small chunks
      if (chunkLines.length >= minSize || endLine === lines.length) {
        blocks.push({
          id: `${filePath}:${startLine + 1}`,
          file: filePath,
          line: startLine + 1,
          endLine: endLine,
          code: chunkContent,
          type: 'chunk',
          name: `Chunk ${chunkIndex + 1} (lines ${startLine + 1}-${endLine})`,
          language,
          hash: hashContent(chunkContent),
        });
        chunkIndex++;
      }

      // Move to next chunk with overlap
      startLine += chunkSize - overlap;

      // Prevent infinite loop
      if (chunkSize <= overlap) {
        break;
      }
    }

    return blocks;
  }

  /**
   * Chunk with smart boundary detection (try to split on blank lines)
   */
  chunkSmart(
    filePath: string,
    content: string,
    language: string,
    options: ChunkerOptions = {}
  ): CodeBlock[] {
    const chunkSize = options.chunkSize ?? this.defaultChunkSize;
    const overlap = options.chunkOverlap ?? this.defaultOverlap;

    const lines = content.split('\n');
    const blocks: CodeBlock[] = [];

    if (lines.length <= chunkSize) {
      return this.chunk(filePath, content, language, options);
    }

    let startLine = 0;
    let chunkIndex = 0;

    while (startLine < lines.length) {
      let endLine = Math.min(startLine + chunkSize, lines.length);

      // Try to find a natural break point (blank line) near the target end
      if (endLine < lines.length) {
        const searchStart = endLine - 10;
        const searchEnd = Math.min(endLine + 10, lines.length);

        for (let i = endLine; i < searchEnd; i++) {
          if (lines[i].trim() === '') {
            endLine = i;
            break;
          }
        }

        // If no break found ahead, look backwards
        if (endLine === Math.min(startLine + chunkSize, lines.length)) {
          for (let i = endLine - 1; i > searchStart; i--) {
            if (lines[i].trim() === '') {
              endLine = i;
              break;
            }
          }
        }
      }

      const chunkLines = lines.slice(startLine, endLine);
      const chunkContent = chunkLines.join('\n');

      if (chunkContent.trim()) {
        blocks.push({
          id: `${filePath}:${startLine + 1}`,
          file: filePath,
          line: startLine + 1,
          endLine: endLine,
          code: chunkContent,
          type: 'chunk',
          name: `Section ${chunkIndex + 1} (lines ${startLine + 1}-${endLine})`,
          language,
          hash: hashContent(chunkContent),
        });
        chunkIndex++;
      }

      // Move to next chunk
      const step = endLine - startLine - overlap;
      startLine += Math.max(step, 1);

      // Prevent infinite loop
      if (startLine >= lines.length - 1) {
        break;
      }
    }

    return blocks;
  }
}

// Export singleton instance
export const fallbackChunker = new FallbackChunker();
