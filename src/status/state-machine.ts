/**
 * Status state machine for managing indexing status transitions
 */

import type { IndexingStatus } from '../types/models.js';
import type { StatusChangeEvent } from './types.js';
import { logger } from '../utils/logger.js';

/**
 * Valid status transitions
 */
const VALID_TRANSITIONS: Record<IndexingStatus, IndexingStatus[]> = {
  standby: ['indexing'],
  indexing: ['indexed', 'error', 'standby'],
  indexed: ['indexing', 'standby'],
  error: ['indexing', 'standby'],
};

/**
 * Status state machine
 */
export class StatusStateMachine {
  private currentStatus: IndexingStatus = 'standby';
  private history: StatusChangeEvent[] = [];
  private listeners: Array<(event: StatusChangeEvent) => void> = [];

  constructor(initialStatus: IndexingStatus = 'standby') {
    this.currentStatus = initialStatus;
  }

  /**
   * Get current status
   */
  getStatus(): IndexingStatus {
    return this.currentStatus;
  }

  /**
   * Transition to a new status
   */
  transition(newStatus: IndexingStatus, reason?: string): boolean {
    if (this.currentStatus === newStatus) {
      logger.debug(`Already in status: ${newStatus}`);
      return true;
    }

    // Check if transition is valid
    const validTransitions = VALID_TRANSITIONS[this.currentStatus];
    if (!validTransitions.includes(newStatus)) {
      logger.warn(
        `Invalid status transition: ${this.currentStatus} -> ${newStatus}`
      );
      return false;
    }

    const previousStatus = this.currentStatus;
    this.currentStatus = newStatus;

    const event: StatusChangeEvent = {
      previousStatus,
      newStatus,
      timestamp: new Date(),
      reason,
    };

    // Add to history
    this.history.push(event);

    // Notify listeners
    this.notifyListeners(event);

    logger.info(`Status changed: ${previousStatus} -> ${newStatus}${reason ? ` (${reason})` : ''}`);

    return true;
  }

  /**
   * Set to standby status
   */
  setStandby(reason?: string): boolean {
    return this.transition('standby', reason);
  }

  /**
   * Set to indexing status
   */
  setIndexing(reason?: string): boolean {
    return this.transition('indexing', reason);
  }

  /**
   * Set to indexed status
   */
  setIndexed(reason?: string): boolean {
    return this.transition('indexed', reason);
  }

  /**
   * Set to error status
   */
  setError(reason?: string): boolean {
    return this.transition('error', reason);
  }

  /**
   * Check if in specific status
   */
  is(status: IndexingStatus): boolean {
    return this.currentStatus === status;
  }

  /**
   * Check if indexing is active
   */
  isActive(): boolean {
    return this.currentStatus === 'indexing';
  }

  /**
   * Check if has error
   */
  hasError(): boolean {
    return this.currentStatus === 'error';
  }

  /**
   * Get status history
   */
  getHistory(): StatusChangeEvent[] {
    return [...this.history];
  }

  /**
   * Get last status change
   */
  getLastChange(): StatusChangeEvent | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Add status change listener
   */
  addListener(listener: (event: StatusChangeEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove status change listener
   */
  removeListener(listener: (event: StatusChangeEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: StatusChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('Error in status change listener:', error);
      }
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.currentStatus = 'standby';
    this.history = [];
  }
}
