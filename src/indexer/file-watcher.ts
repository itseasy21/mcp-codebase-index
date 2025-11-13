/**
 * File system watcher for detecting changes
 */

import chokidar, { FSWatcher } from 'chokidar';
import type { FileChangeEvent } from './types.js';
import { logger } from '../utils/logger.js';
import { createFileFilter, type FileFilter } from '../utils/file-filter.js';
import { isBinaryFile, isImageFile, shouldExcludeFile } from '../utils/file-utils.js';

export interface FileWatcherOptions {
  basePath: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  respectGitignore?: boolean;
  useMcpignore?: boolean;
  debounceDelay?: number;
  onFileChange: (event: FileChangeEvent) => void;
  onError?: (error: Error) => void;
}

/**
 * File watcher using chokidar
 */
export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private fileFilter: FileFilter | null = null;
  private isWatching = false;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private options: FileWatcherOptions) {}

  /**
   * Start watching files
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      logger.warn('File watcher is already running');
      return;
    }

    try {
      logger.info(`Starting file watcher for: ${this.options.basePath}`);

      // Initialize file filter
      this.fileFilter = await createFileFilter(this.options.basePath, {
        respectGitignore: this.options.respectGitignore,
        useMcpignore: this.options.useMcpignore,
        additionalPatterns: this.options.excludePatterns,
      });

      // Configure chokidar
      const patterns = this.options.includePatterns || ['**/*'];

      this.watcher = chokidar.watch(patterns, {
        cwd: this.options.basePath,
        ignored: (path: string) => this.shouldIgnoreFile(path),
        ignoreInitial: true, // Don't emit events for existing files
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100,
        },
      });

      // Register event handlers
      this.watcher
        .on('add', (path) => this.handleFileChange('add', path))
        .on('change', (path) => this.handleFileChange('change', path))
        .on('unlink', (path) => this.handleFileChange('unlink', path))
        .on('error', (error) => this.handleError(error instanceof Error ? error : new Error(String(error))))
        .on('ready', () => {
          logger.info('File watcher is ready');
          this.isWatching = true;
        });
    } catch (error) {
      logger.error('Failed to start file watcher:', error);
      throw error;
    }
  }

  /**
   * Stop watching files
   */
  async stop(): Promise<void> {
    if (!this.isWatching || !this.watcher) {
      return;
    }

    logger.info('Stopping file watcher...');

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close watcher
    await this.watcher.close();
    this.watcher = null;
    this.isWatching = false;

    logger.info('File watcher stopped');
  }

  /**
   * Check if file should be ignored
   */
  private shouldIgnoreFile(path: string): boolean {
    // Ignore hidden files and directories
    if (path.startsWith('.')) {
      return true;
    }

    // Ignore binary files
    if (isBinaryFile(path)) {
      return true;
    }

    // Ignore image files
    if (isImageFile(path)) {
      return true;
    }

    // Ignore by name patterns
    if (shouldExcludeFile(path)) {
      return true;
    }

    // Use file filter if available
    if (this.fileFilter) {
      return this.fileFilter.shouldIgnore(path);
    }

    return false;
  }

  /**
   * Handle file change event with debouncing
   */
  private handleFileChange(type: FileChangeEvent['type'], path: string): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const delay = this.options.debounceDelay || 1000;
    const timer = setTimeout(() => {
      this.debounceTimers.delete(path);

      const event: FileChangeEvent = {
        type,
        path,
        timestamp: Date.now(),
      };

      logger.debug(`File ${type}: ${path}`);
      this.options.onFileChange(event);
    }, delay);

    this.debounceTimers.set(path, timer);
  }

  /**
   * Handle watcher error
   */
  private handleError(error: Error): void {
    logger.error('File watcher error:', error);
    if (this.options.onError) {
      this.options.onError(error);
    }
  }

  /**
   * Check if watching
   */
  isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Get watched paths count
   */
  getWatchedPaths(): string[] {
    if (!this.watcher) {
      return [];
    }
    return Object.keys(this.watcher.getWatched());
  }
}
