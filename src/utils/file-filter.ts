/**
 * File filtering based on .gitignore and .mcpignore patterns
 */

import { promises as fs } from 'fs';
import { join, relative, sep } from 'path';
import { logger } from './logger.js';

/**
 * Simple gitignore-style pattern matcher
 */
export class FileFilter {
  private patterns: Set<string> = new Set();
  private negatePatterns: Set<string> = new Set();
  private directoryPatterns: Set<string> = new Set();

  constructor(private basePath: string) {}

  /**
   * Load patterns from .gitignore file
   */
  async loadGitignore(): Promise<void> {
    const gitignorePath = join(this.basePath, '.gitignore');
    await this.loadPatterns(gitignorePath);
  }

  /**
   * Load patterns from .mcpignore file
   */
  async loadMcpignore(): Promise<void> {
    const mcpignorePath = join(this.basePath, '.mcpignore');
    await this.loadPatterns(mcpignorePath);
  }

  /**
   * Load patterns from a file
   */
  async loadPatterns(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Handle negation patterns (starting with !)
        if (trimmed.startsWith('!')) {
          this.negatePatterns.add(trimmed.substring(1));
        } else {
          this.patterns.add(trimmed);

          // Track directory patterns (ending with /)
          if (trimmed.endsWith('/')) {
            this.directoryPatterns.add(trimmed);
          }
        }
      }

      logger.debug(`Loaded ${this.patterns.size} patterns from ${filePath}`);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn(`Failed to load patterns from ${filePath}:`, error);
      }
    }
  }

  /**
   * Add a pattern manually
   */
  addPattern(pattern: string): void {
    if (pattern.startsWith('!')) {
      this.negatePatterns.add(pattern.substring(1));
    } else {
      this.patterns.add(pattern);
    }
  }

  /**
   * Add multiple patterns
   */
  addPatterns(patterns: string[]): void {
    patterns.forEach(p => this.addPattern(p));
  }

  /**
   * Check if a file should be ignored
   */
  shouldIgnore(filePath: string): boolean {
    const relativePath = relative(this.basePath, filePath);

    // Always ignore .git directory
    if (relativePath.startsWith('.git' + sep) || relativePath === '.git') {
      return true;
    }

    // Check if negated (explicitly included)
    if (this.isNegated(relativePath)) {
      return false;
    }

    // Check against patterns
    return this.matchesAnyPattern(relativePath);
  }

  /**
   * Check if path matches any ignore pattern
   */
  private matchesAnyPattern(path: string): boolean {
    const pathParts = path.split(sep);

    for (const pattern of this.patterns) {
      if (this.matchPattern(path, pathParts, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if path is explicitly negated (included)
   */
  private isNegated(path: string): boolean {
    const pathParts = path.split(sep);

    for (const pattern of this.negatePatterns) {
      if (this.matchPattern(path, pathParts, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Match a path against a gitignore-style pattern
   */
  private matchPattern(path: string, pathParts: string[], pattern: string): boolean {
    // Remove trailing slash for comparison
    const cleanPattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;

    // Exact match
    if (path === cleanPattern) {
      return true;
    }

    // Pattern with wildcards
    if (cleanPattern.includes('*')) {
      const regex = this.patternToRegex(cleanPattern);
      return regex.test(path);
    }

    // Directory match (pattern/)
    if (pattern.endsWith('/')) {
      return pathParts.includes(cleanPattern);
    }

    // Pattern starting with / matches from root
    if (pattern.startsWith('/')) {
      return path.startsWith(cleanPattern.substring(1));
    }

    // Pattern matches any directory level
    return pathParts.includes(cleanPattern) || path.endsWith(sep + cleanPattern);
  }

  /**
   * Convert gitignore pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except * and ?
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '{{DOUBLESTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/{{DOUBLESTAR}}/g, '.*');

    // If pattern doesn't start with /, match at any level
    if (!pattern.startsWith('/')) {
      regexPattern = '(^|/)' + regexPattern;
    } else {
      regexPattern = '^' + regexPattern.substring(1);
    }

    return new RegExp(regexPattern);
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns.clear();
    this.negatePatterns.clear();
    this.directoryPatterns.clear();
  }

  /**
   * Get number of loaded patterns
   */
  getPatternCount(): number {
    return this.patterns.size + this.negatePatterns.size;
  }
}

/**
 * Create and initialize a file filter
 */
export async function createFileFilter(
  basePath: string,
  options: {
    respectGitignore?: boolean;
    useMcpignore?: boolean;
    additionalPatterns?: string[];
  } = {}
): Promise<FileFilter> {
  const filter = new FileFilter(basePath);

  if (options.respectGitignore) {
    await filter.loadGitignore();
  }

  if (options.useMcpignore) {
    await filter.loadMcpignore();
  }

  if (options.additionalPatterns) {
    filter.addPatterns(options.additionalPatterns);
  }

  return filter;
}
