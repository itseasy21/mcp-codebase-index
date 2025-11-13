/**
 * Types for status management
 */

import type { IndexingStatus, StatusInfo } from '../types/models.js';

/**
 * Status icon mapping
 */
export const STATUS_ICONS = {
  standby: '⚪',
  indexing: '🟡',
  indexed: '🟢',
  error: '🔴',
} as const;

/**
 * Status display information
 */
export interface StatusDisplay {
  status: IndexingStatus;
  icon: string;
  message: string;
  color?: string;
}

/**
 * Progress information
 */
export interface ProgressInfo {
  percentage: number;
  filesProcessed: number;
  filesTotal: number;
  currentFile?: string;
  estimatedTimeRemaining?: number;
  rate?: number; // files per second
}

/**
 * Statistics information
 */
export interface StatsInfo {
  totalBlocks: number;
  totalVectors: number;
  totalFiles: number;
  languages: Record<string, number>;
  fileTypes: Record<string, number>;
  lastIndexed?: Date;
  indexingTime: number;
  averageBlocksPerFile: number;
  failureRate: number;
}

/**
 * Error information
 */
export interface ErrorInfo {
  file: string;
  error: string;
  timestamp: Date;
  retries?: number;
}

/**
 * Complete status information
 */
export interface CompleteStatus {
  status: IndexingStatus;
  statusIcon: string;
  progress: ProgressInfo;
  stats: StatsInfo;
  errors: ErrorInfo[];
  isWatching: boolean;
  currentBranch?: string;
  queueSize: number;
}

/**
 * Status change event
 */
export interface StatusChangeEvent {
  previousStatus: IndexingStatus;
  newStatus: IndexingStatus;
  timestamp: Date;
  reason?: string;
}

/**
 * Status history entry
 */
export interface StatusHistoryEntry {
  status: IndexingStatus;
  timestamp: Date;
  duration?: number;
  filesProcessed?: number;
}
