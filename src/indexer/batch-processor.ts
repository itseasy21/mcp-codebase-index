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
    this.concurrency = options.concurrency || 5;
    this.batchSize = options.batchSize || 50;
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

      // Create points for Qdrant with sanitized IDs
      const points: Point[] = parseResult.blocks.map((block, index) => {
        // Create a safe point ID using hash to avoid special characters
        const idHash = hashContent(`${block.file}:${block.line}:${block.endLine}`);
        return {
          id: idHash,
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
      logger.info(`Indexed ${file}: ${points.length} blocks in ${duration}ms`);

      return {
        file,
        success: true,
        blocksIndexed: points.length,
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

    // Process files with concurrency limit
    const processing: Promise<FileIndexingResult>[] = [];

    for (const file of files) {
      // Wait if we've hit concurrency limit
      if (this.activeProcessing >= this.concurrency) {
        const result = await Promise.race(processing);
        results.push(result);

        // Remove completed promise
        const index = processing.findIndex((p) => p === Promise.resolve(result));
        if (index !== -1) {
          processing.splice(index, 1);
        }

        this.activeProcessing--;

        if (!result.success && result.error) {
          errors.push({ file: result.file, error: result.error });
        }
      }

      // Start processing file
      this.activeProcessing++;
      const promise = this.processFile(file);
      processing.push(promise);
    }

    // Wait for remaining files
    const remainingResults = await Promise.all(processing);
    results.push(...remainingResults);

    this.activeProcessing = 0;

    // Collect errors from remaining results
    for (const result of remainingResults) {
      if (!result.success && result.error) {
        errors.push({ file: result.file, error: result.error });
      }
    }

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
