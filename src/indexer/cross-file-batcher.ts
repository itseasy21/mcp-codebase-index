/**
 * Cross-file batching for embeddings and storage
 * Optimizes by batching operations across multiple files instead of per-file
 */

import type { EmbeddingProvider } from '../embeddings/base.js';
import type { Storage } from '../storage/index.js';
import type { Point } from '../storage/types.js';
import type { CodeBlock } from '../types/models.js';
import { logger } from '../utils/logger.js';
import { hashContent } from '../utils/file-utils.js';

interface BlockWithFile {
  block: CodeBlock;
  file: string;
  blockIndex: number;
}

interface BatchResult {
  totalBlocks: number;
  files: Set<string>;
  duration: number;
}

/**
 * Convert a SHA256 hash to UUID format
 */
function hashToUUID(hash: string): string {
  const hex = hash.substring(0, 32);
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

export interface CrossFileBatcherConfig {
  embedder: EmbeddingProvider;
  storage: Storage;
  collectionName: string;
  maxBlocksPerBatch: number; // Max blocks to embed in one API call
  maxPointsPerUpsert: number; // Max points to upsert at once
}

/**
 * Batches embedding and storage operations across multiple files
 * to reduce API overhead and improve throughput
 */
export class CrossFileBatcher {
  private pendingBlocks: BlockWithFile[] = [];
  private config: CrossFileBatcherConfig;

  constructor(config: CrossFileBatcherConfig) {
    this.config = config;
  }

  /**
   * Add blocks from a file to the pending batch
   */
  addBlocks(file: string, blocks: CodeBlock[]): void {
    blocks.forEach((block, index) => {
      this.pendingBlocks.push({
        block,
        file,
        blockIndex: index,
      });
    });

    logger.debug(`Added ${blocks.length} blocks from ${file} to batch (total: ${this.pendingBlocks.length})`);
  }

  /**
   * Check if batch should be flushed
   */
  shouldFlush(): boolean {
    return this.pendingBlocks.length >= this.config.maxBlocksPerBatch;
  }

  /**
   * Get number of pending blocks
   */
  getPendingCount(): number {
    return this.pendingBlocks.length;
  }

  /**
   * Flush pending blocks - embed and store them
   */
  async flush(): Promise<BatchResult> {
    if (this.pendingBlocks.length === 0) {
      return {
        totalBlocks: 0,
        files: new Set(),
        duration: 0,
      };
    }

    const startTime = Date.now();
    const blockCount = this.pendingBlocks.length;
    const files = new Set(this.pendingBlocks.map(b => b.file));

    logger.info(`Flushing cross-file batch: ${blockCount} blocks from ${files.size} files`);

    try {
      // Step 1: Prepare texts for embedding
      const MAX_CHARS_PER_BLOCK = 8000;
      const texts = this.pendingBlocks.map(({ block }) => {
        if (block.code.length > MAX_CHARS_PER_BLOCK) {
          return block.code.substring(0, MAX_CHARS_PER_BLOCK) + '\n// ... (truncated)';
        }
        return block.code;
      });

      // Step 2: Batch embed all texts in a single API call
      const embeddingResult = await this.config.embedder.embedBatch(texts);

      // Step 3: Create points for storage
      const points: Point[] = this.pendingBlocks.map(({ block }, index) => {
        const locationHash = hashContent(`${block.file}:${block.line}:${block.endLine}`);
        const pointId = hashToUUID(locationHash);

        return {
          id: pointId,
          vector: embeddingResult.embeddings[index].values,
          payload: {
            file: block.file,
            line: block.line,
            endLine: block.endLine,
            code: block.code,
            type: block.type,
            name: block.name,
            language: block.language,
            metadata: block.metadata || {},
            hash: hashContent(block.code),
            indexed_at: new Date().toISOString(),
          },
        };
      });

      // Step 4: Batch upsert to storage
      // Split into chunks if necessary
      const upsertChunkSize = this.config.maxPointsPerUpsert;
      for (let i = 0; i < points.length; i += upsertChunkSize) {
        const chunk = points.slice(i, i + upsertChunkSize);
        await this.config.storage.vectors.upsertBatch(this.config.collectionName, chunk);
      }

      // Clear arrays for garbage collection
      texts.length = 0;
      points.length = 0;
      this.pendingBlocks.length = 0;

      const duration = Date.now() - startTime;
      logger.info(`Cross-file batch complete: ${blockCount} blocks in ${duration}ms (${(blockCount / (duration / 1000)).toFixed(0)} blocks/sec)`);

      return {
        totalBlocks: blockCount,
        files,
        duration,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Cross-file batch failed: ${message}`);

      // Clear the batch on error to prevent retry loops
      this.pendingBlocks.length = 0;

      throw error;
    }
  }

  /**
   * Clear all pending blocks without processing
   */
  clear(): void {
    this.pendingBlocks.length = 0;
  }

  /**
   * Get statistics about pending batch
   */
  getStats() {
    const files = new Set(this.pendingBlocks.map(b => b.file));
    return {
      pendingBlocks: this.pendingBlocks.length,
      pendingFiles: files.size,
    };
  }
}
