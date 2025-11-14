/**
 * Optimized batch processor with cross-file batching
 * Much faster than original by reducing API overhead
 */

import { join } from 'path';
import type { CodeParser } from '../parser/index.js';
import type { EmbeddingProvider } from '../embeddings/base.js';
import type { Storage } from '../storage/index.js';
import type { FileIndexingResult, BatchIndexingResult } from './types.js';
import { CrossFileBatcher } from './cross-file-batcher.js';
import { logger } from '../utils/logger.js';

export interface OptimizedBatchProcessorOptions {
  basePath: string;
  collectionName: string;
  concurrency?: number;
  batchSize?: number;
  crossFileBatchSize?: number; // How many blocks to accumulate before embedding
}

/**
 * Optimized processor that batches embeddings and storage across files
 */
export class OptimizedBatchProcessor {
  private concurrency: number;
  private batchSize: number;
  private crossFileBatcher: CrossFileBatcher;

  constructor(
    private parser: CodeParser,
    private embedder: EmbeddingProvider,
    private storage: Storage,
    private options: OptimizedBatchProcessorOptions
  ) {
    this.concurrency = options.concurrency || 3;
    this.batchSize = options.batchSize || 20;

    // Cross-file batcher for embedding optimization
    this.crossFileBatcher = new CrossFileBatcher({
      embedder,
      storage,
      collectionName: options.collectionName,
      maxBlocksPerBatch: options.crossFileBatchSize || 200, // Batch up to 200 blocks
      maxPointsPerUpsert: 100, // Qdrant batch size
    });
  }

  /**
   * Process a single file - parse and add to cross-file batch
   */
  async processFile(file: string): Promise<FileIndexingResult> {
    const startTime = Date.now();

    try {
      const filePath = join(this.options.basePath, file);

      logger.debug(`Processing file: ${file}`);

      // Parse file to extract code blocks
      const parseResult = await this.parser.parseFile(filePath);

      if (parseResult.blocks.length === 0) {
        logger.debug(`No blocks extracted from ${file}`);
        return {
          file,
          success: true,
          blocksIndexed: 0,
          duration: Date.now() - startTime,
        };
      }

      logger.debug(`Extracted ${parseResult.blocks.length} blocks from ${file}`);

      // Add blocks to cross-file batcher instead of processing immediately
      this.crossFileBatcher.addBlocks(file, parseResult.blocks);

      const blocksIndexed = parseResult.blocks.length;
      const duration = Date.now() - startTime;

      // Flush if batch is full
      if (this.crossFileBatcher.shouldFlush()) {
        await this.crossFileBatcher.flush();
      }

      return {
        file,
        success: true,
        blocksIndexed,
        duration,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to process ${file}: ${message}`);

      return {
        file,
        success: false,
        blocksIndexed: 0,
        duration: Date.now() - startTime,
        error: message,
      };
    }
  }

  /**
   * Process multiple files with concurrency control
   */
  async processBatch(files: string[]): Promise<BatchIndexingResult> {
    const startTime = Date.now();
    const results: FileIndexingResult[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    logger.info(`Processing batch of ${files.length} files (concurrency: ${this.concurrency})`);

    // Process files with proper concurrency control using a pool
    let fileIndex = 0;

    const processNext = async (): Promise<FileIndexingResult | null> => {
      if (fileIndex >= files.length) {
        return null;
      }

      const file = files[fileIndex++];
      const result = await this.processFile(file);

      if (!result.success && result.error) {
        errors.push({ file: result.file, error: result.error });
      }

      return result;
    };

    // Create worker pool with concurrency limit
    const workers = Array(Math.min(this.concurrency, files.length))
      .fill(null)
      .map(async () => {
        const workerResults: FileIndexingResult[] = [];
        let result = await processNext();

        while (result !== null) {
          workerResults.push(result);
          // Allow garbage collection between files
          result = null;
          result = await processNext();
        }

        return workerResults;
      });

    // Wait for all workers to complete
    const workerResults = await Promise.all(workers);

    // Flatten results
    for (const workerResult of workerResults) {
      results.push(...workerResult);
    }

    // Flush any remaining blocks in the cross-file batcher
    if (this.crossFileBatcher.getPendingCount() > 0) {
      await this.crossFileBatcher.flush();
    }

    // Clear references for garbage collection
    workerResults.length = 0;

    const duration = Date.now() - startTime;
    const successfulFiles = results.filter((r) => r.success).length;
    const totalBlocks = results.reduce((sum, r) => sum + r.blocksIndexed, 0);

    logger.info(
      `Batch complete: ${successfulFiles}/${files.length} files, ${totalBlocks} blocks in ${duration}ms`
    );

    return {
      totalFiles: files.length,
      successfulFiles,
      failedFiles: files.length - successfulFiles,
      totalBlocks,
      duration,
      errors,
    };
  }

  /**
   * Process files in smaller chunks
   */
  async processChunked(files: string[]): Promise<BatchIndexingResult> {
    const allResults: BatchIndexingResult[] = [];

    // Split into chunks
    for (let i = 0; i < files.length; i += this.batchSize) {
      const chunk = files.slice(i, i + this.batchSize);

      logger.info(
        `Processing chunk ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(files.length / this.batchSize)}`
      );

      const result = await this.processBatch(chunk);
      allResults.push(result);

      // Allow garbage collection between chunks
      if (i + this.batchSize < files.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Suggest garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }

    // Final flush to ensure all blocks are processed
    if (this.crossFileBatcher.getPendingCount() > 0) {
      await this.crossFileBatcher.flush();
    }

    // Aggregate results
    return {
      totalFiles: allResults.reduce((sum, r) => sum + r.totalFiles, 0),
      successfulFiles: allResults.reduce((sum, r) => sum + r.successfulFiles, 0),
      failedFiles: allResults.reduce((sum, r) => sum + r.failedFiles, 0),
      totalBlocks: allResults.reduce((sum, r) => sum + r.totalBlocks, 0),
      duration: allResults.reduce((sum, r) => sum + r.duration, 0),
      errors: allResults.flatMap((r) => r.errors),
    };
  }

  /**
   * Delete indexed data for a file
   */
  async deleteFile(file: string): Promise<void> {
    try {
      const filePath = join(this.options.basePath, file);

      // Find all points for this file using scroll
      const scrollResult = await this.storage.vectors.scroll(this.options.collectionName, {
        filter: {
          must: [{ key: 'file', match: { value: filePath } }],
        },
        limit: 1000,
      });

      if (scrollResult.points.length > 0) {
        const pointIds = scrollResult.points.map((p) => p.id);
        await this.storage.vectors.delete(this.options.collectionName, pointIds);

        logger.info(`Deleted ${pointIds.length} blocks for ${file}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to delete file ${file}: ${message}`);
      throw error;
    }
  }

  /**
   * Get batcher statistics
   */
  getStats() {
    return {
      ...this.crossFileBatcher.getStats(),
      concurrency: this.concurrency,
      batchSize: this.batchSize,
    };
  }
}
