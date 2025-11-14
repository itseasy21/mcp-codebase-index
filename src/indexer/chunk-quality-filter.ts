/**
 * Filter to identify and reject low-quality code chunks
 * Prevents indexing trivial/boilerplate chunks that pollute search results
 */

import type { CodeBlock } from '../types/models.js';
import { logger } from '../utils/logger.js';

export interface ChunkQualityMetrics {
  isHighQuality: boolean;
  score: number;
  reasons: string[];
}

/**
 * Analyzes chunk quality to filter out trivial/boilerplate content
 */
export class ChunkQualityFilter {
  private readonly MIN_QUALITY_SCORE = 0.3;

  /**
   * Determine if a chunk is high enough quality to index
   */
  isHighQuality(block: CodeBlock): boolean {
    const metrics = this.analyzeQuality(block);
    return metrics.isHighQuality;
  }

  /**
   * Analyze chunk quality with detailed scoring
   */
  analyzeQuality(block: CodeBlock): ChunkQualityMetrics {
    let score = 0;
    const reasons: string[] = [];

    const code = block.code.trim();
    const lines = code.split('\n').filter(line => line.trim().length > 0);

    // Skip empty chunks
    if (lines.length === 0) {
      return { isHighQuality: false, score: 0, reasons: ['Empty chunk'] };
    }

    // Check 1: Meaningful content ratio (not just whitespace/braces)
    const meaningfulContentRatio = this.getMeaningfulContentRatio(code);
    if (meaningfulContentRatio < 0.1) {
      reasons.push('Too little meaningful content (mostly whitespace/braces)');
    } else {
      score += meaningfulContentRatio * 0.3;
    }

    // Check 2: Diversity of characters (not repetitive)
    const characterDiversity = this.getCharacterDiversity(code);
    if (characterDiversity < 0.15) {
      reasons.push('Low character diversity (repetitive content)');
    } else {
      score += characterDiversity * 0.2;
    }

    // Check 3: Has meaningful tokens (identifiers, keywords)
    const meaningfulTokens = this.countMeaningfulTokens(code);
    if (meaningfulTokens < 3) {
      reasons.push('Too few meaningful tokens');
    } else {
      score += Math.min(meaningfulTokens / 20, 1) * 0.2;
    }

    // Check 4: Not just closing tags/braces
    const isJustClosing = this.isJustClosingTags(code);
    if (isJustClosing) {
      reasons.push('Contains only closing tags/braces');
      score *= 0.1; // Heavy penalty
    }

    // Check 5: Block type quality
    const typeBonus = this.getTypeQualityBonus(block.type);
    score += typeBonus;
    if (typeBonus > 0) {
      reasons.push(`Semantic block type: ${block.type}`);
    }

    // Check 6: Has a meaningful name
    if (block.name && !block.name.includes('Chunk') && !block.name.includes('Section')) {
      score += 0.15;
      reasons.push('Has meaningful name');
    }

    // Check 7: Sufficient length but not too long
    const lengthScore = this.getLengthQualityScore(code.length);
    score += lengthScore * 0.1;

    // Normalize score to 0-1 range
    score = Math.min(score, 1);

    const isHighQuality = score >= this.MIN_QUALITY_SCORE;

    if (!isHighQuality) {
      logger.debug(`Low quality chunk in ${block.file}:${block.line} (score: ${score.toFixed(2)}): ${reasons.join(', ')}`);
    }

    return { isHighQuality, score, reasons };
  }

  /**
   * Calculate ratio of meaningful content vs whitespace/syntax
   */
  private getMeaningfulContentRatio(code: string): number {
    // Remove whitespace, braces, semicolons, etc.
    const meaningfulChars = code.replace(/[\s{}[\]();,]/g, '').length;
    const totalChars = code.length;

    return totalChars > 0 ? meaningfulChars / totalChars : 0;
  }

  /**
   * Calculate character diversity (unique chars / total chars)
   */
  private getCharacterDiversity(code: string): number {
    const normalized = code.toLowerCase().replace(/\s+/g, '');
    if (normalized.length === 0) return 0;

    const uniqueChars = new Set(normalized).size;
    return uniqueChars / Math.min(normalized.length, 50); // Normalize against first 50 chars
  }

  /**
   * Count meaningful tokens (identifiers, keywords, strings)
   */
  private countMeaningfulTokens(code: string): number {
    // Match identifiers, keywords, strings
    const tokenPattern = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b|"[^"]*"|'[^']*'|`[^`]*`/g;
    const tokens = code.match(tokenPattern) || [];

    // Filter out common noise tokens
    const noiseTokens = new Set(['div', 'span', 'var', 'let', 'const', 'if', 'else', 'return']);
    const meaningfulTokens = tokens.filter(t => !noiseTokens.has(t.toLowerCase()));

    return meaningfulTokens.length;
  }

  /**
   * Check if chunk is just closing tags/braces
   */
  private isJustClosingTags(code: string): boolean {
    const lines = code.split('\n').filter(line => line.trim().length > 0);

    // Check what percentage of lines are just closing syntax
    let closingLines = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      // Match closing patterns: }, </tag>, >, );, ], etc.
      if (/^(}|<\/\w+>|>|\)|;|\]|};|\);|}\)|}<\/\w+>)(\s|\/\/.*|\/\*.*)?$/.test(trimmed)) {
        closingLines++;
      }
    }

    // If more than 70% of lines are closing syntax, consider it trivial
    return lines.length > 0 && (closingLines / lines.length) > 0.7;
  }

  /**
   * Get quality bonus based on block type
   */
  private getTypeQualityBonus(type: string): number {
    // Semantic types are higher quality than fallback chunks
    const typeScores: Record<string, number> = {
      function: 0.2,
      method: 0.2,
      class: 0.25,
      interface: 0.2,
      type: 0.15,
      struct: 0.2,
      enum: 0.15,
      module: 0.15,
      namespace: 0.15,
      trait: 0.2,
      impl: 0.2,
      constant: 0.1,
      variable: 0.05,
      markdown_section: 0.15,
      chunk: 0, // No bonus for fallback chunks
    };

    return typeScores[type] || 0;
  }

  /**
   * Get quality score based on code length
   */
  private getLengthQualityScore(length: number): number {
    // Ideal range: 100-2000 characters
    if (length < 20) return 0; // Too short
    if (length < 100) return 0.3;
    if (length < 2000) return 1.0;
    if (length < 5000) return 0.8;
    return 0.6; // Very long chunks are harder to search
  }

  /**
   * Get statistics about filtered chunks
   */
  getFilterStats(blocks: CodeBlock[]): {
    total: number;
    filtered: number;
    kept: number;
    averageScore: number;
  } {
    let totalScore = 0;
    let filtered = 0;

    for (const block of blocks) {
      const metrics = this.analyzeQuality(block);
      totalScore += metrics.score;
      if (!metrics.isHighQuality) {
        filtered++;
      }
    }

    return {
      total: blocks.length,
      filtered,
      kept: blocks.length - filtered,
      averageScore: blocks.length > 0 ? totalScore / blocks.length : 0,
    };
  }
}

// Export singleton
export const chunkQualityFilter = new ChunkQualityFilter();
