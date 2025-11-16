/**
 * Fallback line-based chunker for unsupported file types
 */

import type { CodeBlock } from '../types/models.js';
import { hashContent } from '../utils/file-utils.js';

export interface ChunkerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  minChunkSize?: number;
  allowTinyLastChunk?: boolean; // Whether to keep very small last chunks (default: false)
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

      // Determine if we should keep this chunk
      const isLastChunk = endLine === lines.length;
      const isTooSmall = chunkLines.length < minSize;
      const allowTiny = options.allowTinyLastChunk ?? false;

      // Skip chunks that are:
      // - Too small AND not the last chunk, OR
      // - Too small AND last chunk AND we don't allow tiny last chunks
      if (isTooSmall && (!isLastChunk || !allowTiny)) {
        // For last chunks that are too small, merge with previous if possible
        if (isLastChunk && blocks.length > 0 && !allowTiny) {
          const lastBlock = blocks[blocks.length - 1];
          lastBlock.code += '\n' + chunkContent;
          lastBlock.endLine = endLine;
          lastBlock.hash = hashContent(lastBlock.code);
          lastBlock.name = `Chunk ${chunkIndex} (lines ${lastBlock.line}-${endLine})`;
        }
        // Otherwise just skip this chunk
      } else if (chunkContent.trim()) {
        // Only add non-empty chunks
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

      const minSize = options.minChunkSize ?? this.minChunkSize;
      const isLastChunk = startLine >= lines.length - 1;
      const isTooSmall = chunkLines.length < minSize;
      const allowTiny = options.allowTinyLastChunk ?? false;

      // Handle tiny last chunks by merging with previous
      if (isTooSmall && isLastChunk && blocks.length > 0 && !allowTiny) {
        const lastBlock = blocks[blocks.length - 1];
        lastBlock.code += '\n' + chunkContent;
        lastBlock.endLine = endLine;
        lastBlock.hash = hashContent(lastBlock.code);
        lastBlock.name = `Section ${chunkIndex} (lines ${lastBlock.line}-${endLine})`;
      } else if (chunkContent.trim() && (!isTooSmall || allowTiny)) {
        // Only add non-empty chunks that meet minimum size
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
