/**
 * Priority queue for indexing tasks
 */

import type { IndexingTask } from './types.js';
import { logger } from '../utils/logger.js';

/**
 * Priority-based indexing queue
 */
export class IndexingQueue {
  private queue: IndexingTask[] = [];
  private processing: Set<string> = new Set();
  private maxRetries: number;

  constructor(maxRetries = 3) {
    this.maxRetries = maxRetries;
  }

  /**
   * Add task to queue
   */
  add(file: string, priority = 0, reason?: IndexingTask['reason']): void {
    // Check if already in queue or processing
    if (this.has(file) || this.processing.has(file)) {
      logger.debug(`File ${file} already in queue or processing, skipping`);
      return;
    }

    const task: IndexingTask = {
      file,
      priority,
      retries: 0,
      addedAt: Date.now(),
      reason,
    };

    this.queue.push(task);
    this.sortQueue();

    logger.debug(`Added ${file} to queue (priority: ${priority}, reason: ${reason})`);
  }

  /**
   * Add multiple tasks
   */
  addBatch(files: string[], priority = 0, reason?: IndexingTask['reason']): void {
    for (const file of files) {
      this.add(file, priority, reason);
    }
  }

  /**
   * Get next task from queue
   */
  next(): IndexingTask | null {
    if (this.queue.length === 0) {
      return null;
    }

    const task = this.queue.shift()!;
    this.processing.add(task.file);

    return task;
  }

  /**
   * Get multiple tasks for batch processing
   */
  nextBatch(count: number): IndexingTask[] {
    const tasks: IndexingTask[] = [];

    for (let i = 0; i < count && this.queue.length > 0; i++) {
      const task = this.queue.shift()!;
      this.processing.add(task.file);
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Mark task as completed
   */
  complete(file: string): void {
    this.processing.delete(file);
    logger.debug(`Completed indexing: ${file}`);
  }

  /**
   * Mark task as failed and retry or remove
   */
  fail(file: string, error: string): void {
    this.processing.delete(file);

    // Find original task to get retry count
    const existingTask = this.queue.find((t) => t.file === file);
    const retries = existingTask ? existingTask.retries : 0;

    if (retries < this.maxRetries) {
      // Re-add with lower priority and incremented retry count
      const task: IndexingTask = {
        file,
        priority: -1, // Lower priority for retries
        retries: retries + 1,
        addedAt: Date.now(),
        reason: 'modified',
      };

      this.queue.push(task);
      this.sortQueue();

      logger.warn(`Failed to index ${file} (retry ${retries + 1}/${this.maxRetries}): ${error}`);
    } else {
      logger.error(`Failed to index ${file} after ${this.maxRetries} retries: ${error}`);
    }
  }

  /**
   * Remove task from queue
   */
  remove(file: string): boolean {
    const index = this.queue.findIndex((t) => t.file === file);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if file is in queue or processing
   */
  has(file: string): boolean {
    return this.queue.some((t) => t.file === file);
  }

  /**
   * Check if file is currently being processed
   */
  isProcessing(file: string): boolean {
    return this.processing.has(file);
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get number of files being processed
   */
  processingCount(): number {
    return this.processing.size;
  }

  /**
   * Get all files in queue
   */
  getFiles(): string[] {
    return this.queue.map((t) => t.file);
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.processing.clear();
    logger.info('Indexing queue cleared');
  }

  /**
   * Sort queue by priority (highest first)
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Earlier tasks first if same priority
      return a.addedAt - b.addedAt;
    });
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const reasonCounts: Record<string, number> = {};
    for (const task of this.queue) {
      const reason = task.reason || 'unknown';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }

    const retryingTasks = this.queue.filter((t) => t.retries > 0).length;

    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      retrying: retryingTasks,
      byReason: reasonCounts,
    };
  }
}
