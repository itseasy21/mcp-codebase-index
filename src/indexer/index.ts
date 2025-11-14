/**
 * Main indexer orchestrator
 */

import { promises as fs } from 'fs';
import { join, relative } from 'path';
import type { CodeParser } from '../parser/index.js';
import type { EmbeddingProvider } from '../embeddings/base.js';
import type { Storage } from '../storage/index.js';
import { FileWatcher } from './file-watcher.js';
import { IndexingQueue } from './indexing-queue.js';
import { BatchProcessor } from './batch-processor.js';
import { GitBranchWatcher, isGitRepository } from '../utils/git-utils.js';
import { FileHashCache } from '../utils/file-hash.js';
import type {
  IndexingOptions,
  IndexerState,
  FileChangeEvent,
} from './types.js';
import { logger } from '../utils/logger.js';
import { detectLanguage } from '../utils/file-utils.js';

export interface IndexerConfig {
  basePath: string;
  collectionName: string;
  parser: CodeParser;
  embedder: EmbeddingProvider;
  storage: Storage;
  options?: IndexingOptions;
  watchFiles?: boolean;
  watchBranches?: boolean;
  respectGitignore?: boolean;
  useMcpignore?: boolean;
}

/**
 * Main indexer orchestrator
 */
export class Indexer {
  private fileWatcher: FileWatcher | null = null;
  private branchWatcher: GitBranchWatcher | null = null;
  private queue: IndexingQueue;
  private processor: BatchProcessor;
  private fileHashCache: FileHashCache;

  private state: IndexerState = {
    isRunning: false,
    isWatching: false,
    queueSize: 0,
    progress: {
      status: 'standby',
      filesProcessed: 0,
      filesTotal: 0,
      percentage: 0,
      startTime: 0,
    },
    stats: {
      totalBlocks: 0,
      totalVectors: 0,
      totalFiles: 0,
      languages: {},
      indexingTime: 0,
      averageBlocksPerFile: 0,
      failureRate: 0,
    },
    errors: [],
  };

  constructor(private config: IndexerConfig) {
    this.queue = new IndexingQueue();
    this.fileHashCache = new FileHashCache();

    this.processor = new BatchProcessor(
      config.parser,
      config.embedder,
      config.storage,
      {
        basePath: config.basePath,
        collectionName: config.collectionName,
        concurrency: config.options?.concurrency,
        batchSize: config.options?.batchSize,
      }
    );
  }

  /**
   * Initialize and start initial indexing
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing indexer...');

      // Ensure storage collection exists
      const vectorSize = this.config.embedder.defaultDimensions;
      await this.config.storage.collections.ensure({
        name: this.config.collectionName,
        vectorSize,
        distance: 'Cosine',
      });

      // Start file watcher if enabled
      if (this.config.watchFiles) {
        await this.startFileWatcher();
      }

      // Start branch watcher if enabled and in git repo
      if (this.config.watchBranches && (await isGitRepository(this.config.basePath))) {
        await this.startBranchWatcher();
      }

      logger.info('Indexer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize indexer:', error);
      throw error;
    }
  }

  /**
   * Index all files in the codebase
   */
  async indexAll(options: IndexingOptions = {}): Promise<void> {
    if (this.state.isRunning) {
      logger.warn('Indexing is already in progress');
      return;
    }

    try {
      this.state.isRunning = true;
      this.state.progress.status = 'indexing';
      this.state.progress.startTime = Date.now();

      logger.info('Starting full indexing...');

      // Discover all files
      const files = await this.discoverFiles();

      // Filter files if needed
      const filteredFiles = options.force
        ? files
        : await this.filterUnchangedFiles(files);

      logger.info(`Found ${filteredFiles.length} files to index`);

      // Add to queue
      this.queue.addBatch(filteredFiles, 1, 'initial');
      this.state.progress.filesTotal = filteredFiles.length;

      // Process queue
      await this.processQueue();

      // Update stats
      await this.updateStats();

      this.state.progress.status = 'indexed';
      logger.info('Full indexing complete');
    } catch (error) {
      logger.error('Full indexing failed:', error);
      this.state.progress.status = 'error';
      throw error;
    } finally {
      this.state.isRunning = false;
    }
  }

  /**
   * Process indexing queue
   */
  private async processQueue(): Promise<void> {
    while (this.queue.size() > 0) {
      const tasks = this.queue.nextBatch(this.config.options?.batchSize || 20);

      if (tasks.length === 0) {
        break;
      }

      const files = tasks.map((t) => t.file);

      // Update progress
      this.state.progress.currentFile = files[0];

      // Process batch
      const result = await this.processor.processBatch(files);

      // Update queue and progress
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const fileResult = result.errors.find((e) => e.file === task.file);

        if (fileResult) {
          this.queue.fail(task.file, fileResult.error);
          this.state.errors.push({
            file: task.file,
            error: fileResult.error,
            timestamp: new Date(),
          });
        } else {
          this.queue.complete(task.file);
          this.state.progress.filesProcessed++;
        }
      }

      // Update progress percentage
      if (this.state.progress.filesTotal > 0) {
        this.state.progress.percentage =
          (this.state.progress.filesProcessed / this.state.progress.filesTotal) * 100;
      }

      this.state.queueSize = this.queue.size();

      logger.info(
        `Progress: ${this.state.progress.filesProcessed}/${this.state.progress.filesTotal} (${this.state.progress.percentage.toFixed(1)}%)`
      );

      // Allow brief pause between batches for memory cleanup
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * Discover all files in the codebase
   */
  private async discoverFiles(): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip certain directories
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
            continue;
          }
          await walk(fullPath);
        } else if (entry.isFile()) {
          // Check if we can parse this file
          if (detectLanguage(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    }

    await walk(this.config.basePath);

    // Convert to relative paths
    return files.map((f) => relative(this.config.basePath, f));
  }

  /**
   * Filter out files that haven't changed
   */
  private async filterUnchangedFiles(files: string[]): Promise<string[]> {
    const changed: string[] = [];

    for (const file of files) {
      const fullPath = join(this.config.basePath, file);

      try {
        // Use file stats instead of reading entire content
        const stats = await fs.stat(fullPath);
        const statsKey = `${fullPath}:${stats.mtime.getTime()}:${stats.size}`;

        // Check if we've seen this exact file state before
        if (this.fileHashCache.hasChanged(fullPath, statsKey)) {
          changed.push(file);
        }
      } catch (_error) {
        // If we can't read the file, include it anyway
        changed.push(file);
      }
    }

    logger.info(`${changed.length}/${files.length} files have changed`);
    return changed;
  }

  /**
   * Start file watcher
   */
  private async startFileWatcher(): Promise<void> {
    this.fileWatcher = new FileWatcher({
      basePath: this.config.basePath,
      includePatterns: this.config.options?.includePatterns,
      excludePatterns: this.config.options?.excludePatterns,
      respectGitignore: this.config.respectGitignore,
      useMcpignore: this.config.useMcpignore,
      onFileChange: (event) => this.handleFileChange(event),
      onError: (error) => logger.error('File watcher error:', error),
    });

    await this.fileWatcher.start();
    this.state.isWatching = true;
  }

  /**
   * Start branch watcher
   */
  private async startBranchWatcher(): Promise<void> {
    this.branchWatcher = new GitBranchWatcher(
      this.config.basePath,
      (oldBranch, newBranch) => this.handleBranchChange(oldBranch, newBranch)
    );

    await this.branchWatcher.start();
    this.state.currentBranch = this.branchWatcher.getCurrentBranch() || undefined;
  }

  /**
   * Handle file change event
   */
  private handleFileChange(event: FileChangeEvent): void {
    logger.debug(`File ${event.type}: ${event.path}`);

    switch (event.type) {
      case 'add':
      case 'change':
        this.queue.add(event.path, 2, event.type === 'add' ? 'created' : 'modified');
        // Process queue if not already running
        if (!this.state.isRunning) {
          this.processQueue().catch((error) =>
            logger.error('Failed to process queue:', error)
          );
        }
        break;

      case 'unlink':
        this.processor.deleteFile(event.path).catch((error) =>
          logger.error(`Failed to delete file ${event.path}:`, error)
        );
        break;
    }
  }

  /**
   * Handle branch change
   */
  private handleBranchChange(oldBranch: string | null, newBranch: string): void {
    logger.info(`Branch changed from ${oldBranch} to ${newBranch}, triggering reindex`);
    this.state.currentBranch = newBranch;

    // Trigger full reindex
    this.indexAll({ force: false }).catch((error) =>
      logger.error('Failed to reindex after branch change:', error)
    );
  }

  /**
   * Update statistics
   */
  private async updateStats(): Promise<void> {
    try {
      const collectionInfo = await this.config.storage.collections.info(
        this.config.collectionName
      );

      this.state.stats.totalVectors = collectionInfo.pointsCount;
      this.state.stats.totalFiles = this.state.progress.filesProcessed;
      this.state.stats.totalBlocks = collectionInfo.pointsCount;
      this.state.stats.lastIndexed = new Date();
      this.state.stats.indexingTime = Date.now() - this.state.progress.startTime;

      if (this.state.stats.totalFiles > 0) {
        this.state.stats.averageBlocksPerFile =
          this.state.stats.totalBlocks / this.state.stats.totalFiles;
      }

      if (this.state.progress.filesTotal > 0) {
        this.state.stats.failureRate =
          ((this.state.progress.filesTotal - this.state.progress.filesProcessed) /
            this.state.progress.filesTotal) *
          100;
      }
    } catch (error) {
      logger.error('Failed to update stats:', error);
    }
  }

  /**
   * Get current state
   */
  getState(): IndexerState {
    return { ...this.state };
  }

  /**
   * Stop indexer
   */
  async stop(): Promise<void> {
    logger.info('Stopping indexer...');

    if (this.fileWatcher) {
      await this.fileWatcher.stop();
      this.fileWatcher = null;
    }

    if (this.branchWatcher) {
      this.branchWatcher.stop();
      this.branchWatcher = null;
    }

    this.queue.clear();
    this.state.isWatching = false;

    logger.info('Indexer stopped');
  }
}

export * from './types.js';
