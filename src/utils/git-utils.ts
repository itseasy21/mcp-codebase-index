/**
 * Git utilities for branch detection and repository operations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * Check if a directory is a git repository
 */
export async function isGitRepository(path: string): Promise<boolean> {
  try {
    const gitDir = join(path, '.git');
    const stats = await fs.stat(gitDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get current git branch
 */
export async function getCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
    });
    return stdout.trim();
  } catch (error) {
    logger.debug('Failed to get current branch:', error);
    return null;
  }
}

/**
 * Get git HEAD commit hash
 */
export async function getHeadCommit(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git rev-parse HEAD', {
      cwd: repoPath,
    });
    return stdout.trim();
  } catch (error) {
    logger.debug('Failed to get HEAD commit:', error);
    return null;
  }
}

/**
 * Get list of all files tracked by git
 */
export async function getTrackedFiles(repoPath: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync('git ls-files', {
      cwd: repoPath,
    });
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    logger.warn('Failed to get tracked files:', error);
    return [];
  }
}

/**
 * Get modified files since last commit
 */
export async function getModifiedFiles(repoPath: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync('git diff --name-only HEAD', {
      cwd: repoPath,
    });
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    logger.debug('Failed to get modified files:', error);
    return [];
  }
}

/**
 * Get untracked files
 */
export async function getUntrackedFiles(repoPath: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync('git ls-files --others --exclude-standard', {
      cwd: repoPath,
    });
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    logger.debug('Failed to get untracked files:', error);
    return [];
  }
}

/**
 * Watch for branch changes
 */
export class GitBranchWatcher {
  private currentBranch: string | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private repoPath: string,
    private onBranchChange: (oldBranch: string | null, newBranch: string) => void,
    private checkInterval = 5000 // 5 seconds
  ) {}

  /**
   * Start watching for branch changes
   */
  async start(): Promise<void> {
    // Get initial branch
    this.currentBranch = await getCurrentBranch(this.repoPath);
    logger.info(`Git branch watcher started, current branch: ${this.currentBranch || 'unknown'}`);

    // Poll for changes
    this.intervalId = setInterval(async () => {
      try {
        const newBranch = await getCurrentBranch(this.repoPath);

        if (newBranch && newBranch !== this.currentBranch) {
          logger.info(`Branch changed: ${this.currentBranch || 'unknown'} -> ${newBranch}`);
          const oldBranch = this.currentBranch;
          this.currentBranch = newBranch;
          this.onBranchChange(oldBranch, newBranch);
        }
      } catch (error) {
        logger.debug('Error checking branch:', error);
      }
    }, this.checkInterval);
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Git branch watcher stopped');
    }
  }

  /**
   * Get current branch
   */
  getCurrentBranch(): string | null {
    return this.currentBranch;
  }
}
