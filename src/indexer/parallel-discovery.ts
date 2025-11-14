/**
 * Parallel file discovery for faster codebase scanning
 * Uses concurrent directory traversal to speed up file discovery
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { detectLanguage } from '../utils/file-utils.js';
import { logger } from '../utils/logger.js';

export interface ParallelDiscoveryConfig {
  basePath: string;
  maxConcurrentDirs?: number;
  excludeDirs?: string[];
}

/**
 * Discovers files in parallel by processing multiple directories concurrently
 */
export class ParallelFileDiscovery {
  private config: ParallelDiscoveryConfig;
  private activeDirs = 0;
  private maxConcurrent: number;
  private excludeDirs: Set<string>;

  constructor(config: ParallelDiscoveryConfig) {
    this.config = config;
    this.maxConcurrent = config.maxConcurrentDirs || 10;
    this.excludeDirs = new Set(config.excludeDirs || [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.vscode',
      '.idea',
      'vendor',
      '__pycache__',
    ]);
  }

  /**
   * Discover all files in the codebase using parallel traversal
   */
  async discover(): Promise<string[]> {
    const startTime = Date.now();
    const files: string[] = [];
    const errors: string[] = [];

    logger.info('Starting parallel file discovery...');

    await this.walkParallel(this.config.basePath, files, errors);

    const duration = Date.now() - startTime;
    logger.info(
      `Parallel discovery complete: ${files.length} files found in ${duration}ms (${(files.length / (duration / 1000)).toFixed(0)} files/sec)`
    );

    if (errors.length > 0) {
      logger.warn(`Encountered ${errors.length} errors during discovery`);
    }

    return files;
  }

  /**
   * Walk directory tree in parallel with concurrency control
   */
  private async walkParallel(
    dir: string,
    files: string[],
    errors: string[]
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      // Separate files and directories
      const localFiles: string[] = [];
      const subdirs: string[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = join(dir, entry.name);
          if (detectLanguage(entry.name)) {
            localFiles.push(fullPath);
          }
        } else if (entry.isDirectory()) {
          // Skip excluded directories
          if (!this.excludeDirs.has(entry.name)) {
            subdirs.push(join(dir, entry.name));
          }
        }
      }

      // Add files immediately
      files.push(...localFiles);

      // Process subdirectories with concurrency control
      if (subdirs.length > 0) {
        await this.processDirectoriesWithLimit(subdirs, files, errors);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to read ${dir}: ${message}`);
      logger.warn(`Failed to read directory ${dir}: ${message}`);
    }
  }

  /**
   * Process multiple directories with concurrency limit
   */
  private async processDirectoriesWithLimit(
    dirs: string[],
    files: string[],
    errors: string[]
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const dir of dirs) {
      // Wait if we've hit concurrency limit
      if (this.activeDirs >= this.maxConcurrent) {
        await Promise.race(promises);
      }

      // Start processing directory
      this.activeDirs++;
      const promise = this.walkParallel(dir, files, errors).finally(() => {
        this.activeDirs--;
      });

      promises.push(promise);
    }

    // Wait for all remaining directories
    await Promise.all(promises);
  }

  /**
   * Get discovery statistics
   */
  getStats() {
    return {
      maxConcurrent: this.maxConcurrent,
      excludedDirs: Array.from(this.excludeDirs),
    };
  }
}
