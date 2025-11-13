/**
 * Progress tracking for indexing operations
 */

import type { ProgressInfo } from './types.js';

/**
 * Track indexing progress
 */
export class ProgressTracker {
  private filesProcessed = 0;
  private filesTotal = 0;
  private currentFile?: string;
  private startTime?: number;
  private processedTimestamps: number[] = [];
  private maxTimestamps = 100; // Keep last 100 timestamps for rate calculation

  /**
   * Start tracking progress
   */
  start(totalFiles: number): void {
    this.filesTotal = totalFiles;
    this.filesProcessed = 0;
    this.currentFile = undefined;
    this.startTime = Date.now();
    this.processedTimestamps = [];
  }

  /**
   * Update progress with new file
   */
  update(fileName?: string): void {
    this.filesProcessed++;
    this.currentFile = fileName;
    this.processedTimestamps.push(Date.now());

    // Keep only recent timestamps
    if (this.processedTimestamps.length > this.maxTimestamps) {
      this.processedTimestamps.shift();
    }
  }

  /**
   * Set total files
   */
  setTotal(total: number): void {
    this.filesTotal = total;
  }

  /**
   * Set processed count
   */
  setProcessed(count: number): void {
    this.filesProcessed = count;
  }

  /**
   * Set current file
   */
  setCurrentFile(file?: string): void {
    this.currentFile = file;
  }

  /**
   * Get current progress
   */
  getProgress(): ProgressInfo {
    const percentage = this.calculatePercentage();
    const rate = this.calculateRate();
    const estimatedTimeRemaining = this.calculateEstimatedTime(rate);

    return {
      percentage,
      filesProcessed: this.filesProcessed,
      filesTotal: this.filesTotal,
      currentFile: this.currentFile,
      estimatedTimeRemaining,
      rate,
    };
  }

  /**
   * Calculate percentage complete
   */
  private calculatePercentage(): number {
    if (this.filesTotal === 0) {
      return 0;
    }
    return Math.min(100, (this.filesProcessed / this.filesTotal) * 100);
  }

  /**
   * Calculate processing rate (files per second)
   */
  private calculateRate(): number {
    if (this.processedTimestamps.length < 2) {
      return 0;
    }

    const firstTimestamp = this.processedTimestamps[0];
    const lastTimestamp = this.processedTimestamps[this.processedTimestamps.length - 1];
    const timeElapsed = (lastTimestamp - firstTimestamp) / 1000; // seconds

    if (timeElapsed === 0) {
      return 0;
    }

    return this.processedTimestamps.length / timeElapsed;
  }

  /**
   * Calculate estimated time remaining (milliseconds)
   */
  private calculateEstimatedTime(rate: number): number | undefined {
    if (rate === 0 || this.filesTotal === 0) {
      return undefined;
    }

    const filesRemaining = this.filesTotal - this.filesProcessed;
    if (filesRemaining <= 0) {
      return 0;
    }

    return (filesRemaining / rate) * 1000; // milliseconds
  }

  /**
   * Get elapsed time (milliseconds)
   */
  getElapsedTime(): number {
    if (!this.startTime) {
      return 0;
    }
    return Date.now() - this.startTime;
  }

  /**
   * Format time (milliseconds) to human readable
   */
  formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Check if completed
   */
  isComplete(): boolean {
    return this.filesTotal > 0 && this.filesProcessed >= this.filesTotal;
  }

  /**
   * Reset progress
   */
  reset(): void {
    this.filesProcessed = 0;
    this.filesTotal = 0;
    this.currentFile = undefined;
    this.startTime = undefined;
    this.processedTimestamps = [];
  }
}
