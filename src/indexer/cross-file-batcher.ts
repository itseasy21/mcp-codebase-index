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
import { decomposePathIntoSegments } from '../utils/path-utils.js';
import { chunkQualityFilter } from './chunk-quality-filter.js';
import { embeddingEnricher } from './embedding-enricher.js';

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
  enableQualityFilter?: boolean; // Filter low-quality chunks (default: true)
  enableEnrichment?: boolean; // Enrich embeddings with metadata (default: true)
}

/**
 * Batches embedding and storage operations across multiple files
 * to reduce API overhead and improve throughput
 */
export class CrossFileBatcher {
  private pendingBlocks: BlockWithFile[] = [];
  private config: CrossFileBatcherConfig;
  private stats = {
    totalBlocks: 0,
    filteredBlocks: 0,
    enrichedBlocks: 0,
  };

  constructor(config: CrossFileBatcherConfig) {
    this.config = {
      ...config,
      enableQualityFilter: config.enableQualityFilter ?? true,
      enableEnrichment: config.enableEnrichment ?? true,
    };

    logger.info(`Cross-file batcher initialized with quality filter: ${this.config.enableQualityFilter}, enrichment: ${this.config.enableEnrichment}`);
  }

  /**
   * Add blocks from a file to the pending batch
   * Filters out low-quality chunks if enabled
   */
  addBlocks(file: string, blocks: CodeBlock[]): void {
    this.stats.totalBlocks += blocks.length;

    let addedCount = 0;

    blocks.forEach((block, index) => {
      // Apply quality filter if enabled
      if (this.config.enableQualityFilter) {
        if (!chunkQualityFilter.isHighQuality(block)) {
          this.stats.filteredBlocks++;
          logger.debug(`Filtered low-quality chunk: ${file}:${block.line} (${block.name})`);
          return; // Skip this block
        }
      }

      this.pendingBlocks.push({
        block,
        file,
        blockIndex: index,
      });
      addedCount++;
    });

    logger.debug(
      `Added ${addedCount}/${blocks.length} blocks from ${file} to batch (total: ${this.pendingBlocks.length}, filtered: ${blocks.length - addedCount})`
    );
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
      // Step 1: Prepare texts for embedding (with enrichment if enabled)
      const MAX_CHARS_PER_BLOCK = 8000;
      const texts = this.pendingBlocks.map(({ block }) => {
        let text: string;

        // Use enriched text if enabled, otherwise raw code
        if (this.config.enableEnrichment) {
          text = embeddingEnricher.enrich(block, { format: 'structured' });
          this.stats.enrichedBlocks++;
        } else {
          text = block.code;
        }

        // Truncate if too long
        if (text.length > MAX_CHARS_PER_BLOCK) {
          return text.substring(0, MAX_CHARS_PER_BLOCK) + '\n// ... (truncated)';
        }
        return text;
      });

      // Step 2: Batch embed all texts in a single API call
      const embeddingResult = await this.config.embedder.embedBatch(texts);

      // Step 3: Create points for storage
      const points: Point[] = this.pendingBlocks.map(({ block }, index) => {
        const locationHash = hashContent(`${block.file}:${block.line}:${block.endLine}`);
        const pointId = hashToUUID(locationHash);

        // Decompose file path into indexed segments for efficient directory filtering
        const pathSegments = decomposePathIntoSegments(block.file);

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
            pathSegments, // Add path segments for directory-based filtering
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
      const filterRate = this.stats.totalBlocks > 0
        ? ((this.stats.filteredBlocks / this.stats.totalBlocks) * 100).toFixed(1)
        : '0';

      logger.info(
        `Cross-file batch complete: ${blockCount} blocks in ${duration}ms ` +
        `(${(blockCount / (duration / 1000)).toFixed(0)} blocks/sec, ` +
        `${filterRate}% filtered, enrichment: ${this.config.enableEnrichment})`
      );

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
   * Get statistics about pending batch and filtering
   */
  getStats() {
    const files = new Set(this.pendingBlocks.map(b => b.file));
    return {
      pendingBlocks: this.pendingBlocks.length,
      pendingFiles: files.size,
      totalProcessed: this.stats.totalBlocks,
      filteredBlocks: this.stats.filteredBlocks,
      enrichedBlocks: this.stats.enrichedBlocks,
      filterRate: this.stats.totalBlocks > 0
        ? (this.stats.filteredBlocks / this.stats.totalBlocks) * 100
        : 0,
    };
  }
}
