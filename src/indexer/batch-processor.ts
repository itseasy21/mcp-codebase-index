/**
 * Batch processor for indexing files
 */

import { join } from 'path';
import type { CodeParser } from '../parser/index.js';
import type { EmbeddingProvider } from '../embeddings/base.js';
import type { Storage } from '../storage/index.js';
import type { Point } from '../storage/types.js';
import type { FileIndexingResult, BatchIndexingResult } from './types.js';
import { logger } from '../utils/logger.js';
import { IndexingError } from '../utils/errors.js';
import { hashContent } from '../utils/file-utils.js';

/**
 * Convert a SHA256 hash to UUID format
 * Takes first 32 hex chars (128 bits) and formats as UUID (8-4-4-4-12)
 */
function hashToUUID(hash: string): string {
  // Take first 32 characters (128 bits)
  const hex = hash.substring(0, 32);
  // Format as UUID: 8-4-4-4-12
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

export interface BatchProcessorOptions {
  basePath: string;
  collectionName: string;
  concurrency?: number;
  batchSize?: number;
}

/**
 * Process files in batches with concurrency control
 */
export class BatchProcessor {
  private concurrency: number;
  private batchSize: number;
  private activeProcessing = 0;

  constructor(
    private parser: CodeParser,
    private embedder: EmbeddingProvider,
    private storage: Storage,
    private options: BatchProcessorOptions
  ) {
    // Lower defaults for better memory management
    this.concurrency = options.concurrency || 3;
    this.batchSize = options.batchSize || 20;
  }

  /**
   * Process a single file
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

      // Generate embeddings for all blocks with truncation for large code
      const MAX_CHARS_PER_BLOCK = 8000; // ~8KB limit per block for safety
      const texts = parseResult.blocks.map((block) => {
        if (block.code.length > MAX_CHARS_PER_BLOCK) {
          return block.code.substring(0, MAX_CHARS_PER_BLOCK) + '\n// ... (truncated)';
        }
        return block.code;
      });
      const embeddingResult = await this.embedder.embedBatch(texts);

      // Create points for Qdrant with UUID-formatted IDs
      const points: Point[] = parseResult.blocks.map((block, index) => {
        // Create a unique point ID by hashing file location and converting to UUID format
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

      // Store in Qdrant
      await this.storage.vectors.upsertBatch(this.options.collectionName, points);

      const duration = Date.now() - startTime;
      const blocksIndexed = points.length;
      logger.info(`Indexed ${file}: ${blocksIndexed} blocks in ${duration}ms`);

      // Clear large objects to help garbage collection
      texts.length = 0;
      points.length = 0;

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

        // Suggest garbage collection if available (only works with --expose-gc flag)
        if (global.gc) {
          global.gc();
        }
      }
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
      throw new IndexingError(`Failed to delete file: ${message}`, file);
    }
  }
}
