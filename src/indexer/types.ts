/**
 * Types for indexing operations
 */

import type { IndexingStatus } from '../types/models.js';

/**
 * Indexing task
 */
export interface IndexingTask {
  file: string;
  priority: number;
  retries: number;
  addedAt: number;
  reason?: 'initial' | 'modified' | 'created' | 'renamed' | 'branch-switch';
}

/**
 * Indexing result for a single file
 */
export interface FileIndexingResult {
  file: string;
  success: boolean;
  blocksIndexed: number;
  duration: number;
  error?: string;
}

/**
 * Batch indexing result
 */
export interface BatchIndexingResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalBlocks: number;
  duration: number;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Indexing progress
 */
export interface IndexingProgress {
  status: IndexingStatus;
  filesProcessed: number;
  filesTotal: number;
  currentFile?: string;
  percentage: number;
  startTime: number;
  estimatedTimeRemaining?: number;
}

/**
 * Indexing statistics
 */
export interface IndexingStats {
  totalBlocks: number;
  totalVectors: number;
  totalFiles: number;
  languages: Record<string, number>;
  lastIndexed?: Date;
  indexingTime: number;
  averageBlocksPerFile: number;
  failureRate: number;
}

/**
 * File change event
 */
export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: number;
}

/**
 * Indexing options
 */
export interface IndexingOptions {
  batchSize?: number;
  concurrency?: number;
  force?: boolean; // Force reindex even if unchanged
  includePatterns?: string[];
  excludePatterns?: string[];
}

/**
 * Indexer state
 */
export interface IndexerState {
  isRunning: boolean;
  isWatching: boolean;
  currentBranch?: string;
  queueSize: number;
  progress: IndexingProgress;
  stats: IndexingStats;
  errors: Array<{ file: string; error: string; timestamp: Date }>;
}

/**
 * Git branch info
 */
export interface GitBranchInfo {
  current: string;
  previous?: string;
  changed: boolean;
}

/**
 * File metadata for caching
 */
export interface FileMetadata {
  path: string;
  hash: string;
  size: number;
  lastModified: number;
  lastIndexed: number;
  blockCount: number;
}
