/**
 * File content hashing for cache invalidation
 */

import { createHash } from 'crypto';

/**
 * Hash cache for file contents
 */
export class FileHashCache {
  private cache: Map<string, string> = new Map();

  /**
   * Calculate and cache hash for file content
   */
  hash(filePath: string, content: string): string {
    const hash = this.calculateHash(content);
    this.cache.set(filePath, hash);
    return hash;
  }

  /**
   * Get cached hash for file
   */
  get(filePath: string): string | undefined {
    return this.cache.get(filePath);
  }

  /**
   * Check if file content has changed
   */
  hasChanged(filePath: string, content: string): boolean {
    const cachedHash = this.cache.get(filePath);
    if (!cachedHash) return true;

    const currentHash = this.calculateHash(content);
    return cachedHash !== currentHash;
  }

  /**
   * Update hash for file
   */
  update(filePath: string, content: string): string {
    return this.hash(filePath, content);
  }

  /**
   * Remove file from cache
   */
  remove(filePath: string): void {
    this.cache.delete(filePath);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Calculate SHA-256 hash of content
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}

// Global hash cache instance
export const fileHashCache = new FileHashCache();
