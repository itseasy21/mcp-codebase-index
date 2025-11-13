/**
 * Main status manager
 */

import type { Storage } from '../storage/index.js';
import { StatusStateMachine } from './state-machine.js';
import { ProgressTracker } from './progress-tracker.js';
import type {
  CompleteStatus,
  ErrorInfo,
  StatsInfo,
  StatusDisplay,
  STATUS_ICONS,
} from './types.js';
import type { IndexingStatus } from '../types/models.js';
import { logger } from '../utils/logger.js';

export interface StatusManagerConfig {
  storage: Storage;
  collectionName: string;
}

/**
 * Main status manager
 */
export class StatusManager {
  private stateMachine: StatusStateMachine;
  private progressTracker: ProgressTracker;
  private errors: ErrorInfo[] = [];
  private isWatching = false;
  private currentBranch?: string;
  private queueSize = 0;
  private stats: StatsInfo = {
    totalBlocks: 0,
    totalVectors: 0,
    totalFiles: 0,
    languages: {},
    fileTypes: {},
    indexingTime: 0,
    averageBlocksPerFile: 0,
    failureRate: 0,
  };

  constructor(private config: StatusManagerConfig) {
    this.stateMachine = new StatusStateMachine();
    this.progressTracker = new ProgressTracker();
  }

  /**
   * Start indexing
   */
  startIndexing(totalFiles: number): void {
    this.stateMachine.setIndexing('Started indexing');
    this.progressTracker.start(totalFiles);
    this.errors = [];
  }

  /**
   * Update progress
   */
  updateProgress(currentFile?: string): void {
    this.progressTracker.update(currentFile);
  }

  /**
   * Complete indexing
   */
  async completeIndexing(): Promise<void> {
    await this.updateStats();
    this.stateMachine.setIndexed('Indexing completed');
  }

  /**
   * Set error status
   */
  setError(error: string): void {
    this.stateMachine.setError(error);
  }

  /**
   * Set standby status
   */
  setStandby(): void {
    this.stateMachine.setStandby();
  }

  /**
   * Add error
   */
  addError(file: string, error: string, retries?: number): void {
    this.errors.push({
      file,
      error,
      timestamp: new Date(),
      retries,
    });

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors.shift();
    }
  }

  /**
   * Set watching status
   */
  setWatching(watching: boolean): void {
    this.isWatching = watching;
  }

  /**
   * Set current branch
   */
  setCurrentBranch(branch?: string): void {
    this.currentBranch = branch;
  }

  /**
   * Set queue size
   */
  setQueueSize(size: number): void {
    this.queueSize = size;
  }

  /**
   * Update statistics from storage
   */
  async updateStats(): Promise<void> {
    try {
      const collectionInfo = await this.config.storage.collections.info(
        this.config.collectionName
      );

      this.stats.totalVectors = collectionInfo.pointsCount;
      this.stats.totalBlocks = collectionInfo.pointsCount;

      const progress = this.progressTracker.getProgress();
      this.stats.totalFiles = progress.filesProcessed;
      this.stats.indexingTime = this.progressTracker.getElapsedTime();

      if (this.stats.totalFiles > 0) {
        this.stats.averageBlocksPerFile = this.stats.totalBlocks / this.stats.totalFiles;
      }

      if (progress.filesTotal > 0) {
        this.stats.failureRate =
          ((progress.filesTotal - progress.filesProcessed) / progress.filesTotal) * 100;
      }

      this.stats.lastIndexed = new Date();

      logger.debug('Statistics updated', this.stats);
    } catch (error) {
      logger.error('Failed to update statistics:', error);
    }
  }

  /**
   * Update language statistics
   */
  updateLanguageStats(language: string, count = 1): void {
    this.stats.languages[language] = (this.stats.languages[language] || 0) + count;
  }

  /**
   * Update file type statistics
   */
  updateFileTypeStats(fileType: string, count = 1): void {
    this.stats.fileTypes[fileType] = (this.stats.fileTypes[fileType] || 0) + count;
  }

  /**
   * Get complete status
   */
  async getCompleteStatus(detailed = false): Promise<CompleteStatus> {
    const status = this.stateMachine.getStatus();
    const progress = this.progressTracker.getProgress();

    // Update stats if not in standby
    if (status !== 'standby') {
      await this.updateStats();
    }

    return {
      status,
      statusIcon: this.getStatusIcon(status),
      progress,
      stats: { ...this.stats },
      errors: detailed ? [...this.errors] : this.errors.slice(-10),
      isWatching: this.isWatching,
      currentBranch: this.currentBranch,
      queueSize: this.queueSize,
    };
  }

  /**
   * Get status display
   */
  getStatusDisplay(): StatusDisplay {
    const status = this.stateMachine.getStatus();
    const progress = this.progressTracker.getProgress();

    let message = '';
    switch (status) {
      case 'standby':
        message = this.isWatching ? 'Watching for changes' : 'Ready to index';
        break;
      case 'indexing':
        message = `Indexing... ${progress.percentage.toFixed(1)}% (${progress.filesProcessed}/${progress.filesTotal})`;
        if (progress.estimatedTimeRemaining) {
          message += ` - ${this.progressTracker.formatTime(progress.estimatedTimeRemaining)} remaining`;
        }
        break;
      case 'indexed':
        message = `Indexed ${this.stats.totalFiles} files, ${this.stats.totalBlocks} blocks`;
        break;
      case 'error':
        message = `Error: ${this.errors.length} errors occurred`;
        break;
    }

    return {
      status,
      icon: this.getStatusIcon(status),
      message,
    };
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: IndexingStatus): string {
    const icons: Record<IndexingStatus, string> = {
      standby: '⚪',
      indexing: '🟡',
      indexed: '🟢',
      error: '🔴',
    };
    return icons[status];
  }

  /**
   * Get current status
   */
  getStatus(): IndexingStatus {
    return this.stateMachine.getStatus();
  }

  /**
   * Get progress
   */
  getProgress() {
    return this.progressTracker.getProgress();
  }

  /**
   * Get statistics
   */
  getStats(): StatsInfo {
    return { ...this.stats };
  }

  /**
   * Get errors
   */
  getErrors(limit?: number): ErrorInfo[] {
    if (limit) {
      return this.errors.slice(-limit);
    }
    return [...this.errors];
  }

  /**
   * Clear errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Reset status
   */
  reset(): void {
    this.stateMachine.reset();
    this.progressTracker.reset();
    this.errors = [];
    this.stats = {
      totalBlocks: 0,
      totalVectors: 0,
      totalFiles: 0,
      languages: {},
      fileTypes: {},
      indexingTime: 0,
      averageBlocksPerFile: 0,
      failureRate: 0,
    };
  }
}

// Re-export types
export type { CompleteStatus, StatusDisplay, ProgressInfo, StatsInfo, ErrorInfo } from './types.js';
export { StatusStateMachine } from './state-machine.js';
export { ProgressTracker } from './progress-tracker.js';
