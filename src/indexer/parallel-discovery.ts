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
  timeoutMs?: number; // Maximum time for discovery
}

/**
 * Discovers files in parallel by processing multiple directories concurrently
 */
export class ParallelFileDiscovery {
  private config: ParallelDiscoveryConfig;
  private activeDirs = 0;
  private maxConcurrent: number;
  private excludeDirs: Set<string>;
  private visitedDirs: Set<string> = new Set(); // Track visited dirs to avoid symlink loops
  private fileCount = 0;
  private dirCount = 0;
  private progressTimer: NodeJS.Timeout | null = null;

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

    // Start progress logging
    this.startProgressLogging();

    try {
      // Add timeout wrapper
      const timeoutMs = this.config.timeoutMs || 120000; // Default 2 minutes
      const discoveryPromise = this.walkParallel(this.config.basePath, files, errors);

      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error(
            `File discovery timed out after ${timeoutMs / 1000}s. ` +
            `Found ${files.length} files in ${this.dirCount} directories before timeout. ` +
            `This may indicate a symlink loop or very large codebase.`
          ));
        }, timeoutMs);
      });

      await Promise.race([discoveryPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      logger.info(
        `Parallel discovery complete: ${files.length} files found in ${duration}ms ` +
        `(${(files.length / (duration / 1000)).toFixed(0)} files/sec, ${this.dirCount} directories scanned)`
      );

      if (errors.length > 0) {
        logger.warn(`Encountered ${errors.length} errors during discovery:`);
        errors.slice(0, 5).forEach(err => logger.warn(`  - ${err}`));
        if (errors.length > 5) {
          logger.warn(`  ... and ${errors.length - 5} more errors`);
        }
      }

      return files;
    } finally {
      this.stopProgressLogging();
    }
  }

  /**
   * Start periodic progress logging
   */
  private startProgressLogging(): void {
    this.progressTimer = setInterval(() => {
      logger.info(
        `Discovery progress: ${this.fileCount} files found, ` +
        `${this.dirCount} directories scanned, ` +
        `${this.activeDirs} active`
      );
    }, 10000); // Log every 10 seconds
  }

  /**
   * Stop progress logging
   */
  private stopProgressLogging(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
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
      // Resolve to real path to detect symlink loops
      const realPath = await fs.realpath(dir);

      // Check if we've already visited this directory (symlink loop detection)
      if (this.visitedDirs.has(realPath)) {
        logger.debug(`Skipping already visited directory: ${dir}`);
        return;
      }

      this.visitedDirs.add(realPath);
      this.dirCount++;

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
        } else if (entry.isSymbolicLink()) {
          // Log symlinks for debugging
          logger.debug(`Skipping symlink: ${join(dir, entry.name)}`);
        }
      }

      // Add files immediately
      files.push(...localFiles);
      this.fileCount += localFiles.length;

      // Process subdirectories with concurrency control
      if (subdirs.length > 0) {
        await this.processDirectoriesWithLimit(subdirs, files, errors);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Only log permission errors at debug level to avoid spam
      if (message.includes('EACCES') || message.includes('EPERM')) {
        logger.debug(`Permission denied: ${dir}`);
      } else {
        logger.warn(`Failed to read directory ${dir}: ${message}`);
      }
      errors.push(`Failed to read ${dir}: ${message}`);
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
