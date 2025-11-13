/**
 * Result ranking and scoring
 */

import type { EnhancedSearchResult, RelevanceFactors } from './types.js';
import { logger } from '../utils/logger.js';

export interface RankingOptions {
  boostExactMatch?: number;
  boostNameMatch?: number;
  boostRecency?: number;
  penalizeComplexity?: boolean;
}

/**
 * Rank and score search results
 */
export class ResultRanker {
  private options: Required<RankingOptions>;

  constructor(options: RankingOptions = {}) {
    this.options = {
      boostExactMatch: options.boostExactMatch ?? 1.5,
      boostNameMatch: options.boostNameMatch ?? 1.2,
      boostRecency: options.boostRecency ?? 1.1,
      penalizeComplexity: options.penalizeComplexity ?? false,
    };
  }

  /**
   * Rank search results
   */
  rank(query: string, results: EnhancedSearchResult[]): EnhancedSearchResult[] {
    logger.debug(`Ranking ${results.length} results`);

    const queryLower = query.toLowerCase();

    // Calculate relevance factors for each result
    const scoredResults = results.map((result) => {
      const factors = this.calculateRelevanceFactors(queryLower, result);
      const finalScore = this.calculateFinalScore(result.score, factors);

      return {
        ...result,
        score: finalScore,
        relevanceFactors: factors,
      };
    });

    // Sort by final score (descending)
    scoredResults.sort((a, b) => b.score - a.score);

    // Add rank
    return scoredResults.map((result, index) => ({
      ...result,
      rank: index + 1,
    }));
  }

  /**
   * Calculate relevance factors
   */
  private calculateRelevanceFactors(
    query: string,
    result: EnhancedSearchResult
  ): RelevanceFactors {
    const factors: RelevanceFactors = {
      vectorScore: result.score,
    };

    // Check for exact match in code
    if (result.code.toLowerCase().includes(query)) {
      factors.exactMatch = true;
    }

    // Check for name match
    const nameLower = result.name.toLowerCase();
    if (nameLower.includes(query) || query.includes(nameLower)) {
      factors.nameMatch = this.calculateNameMatchScore(query, nameLower);
    }

    // Recency (if indexed_at is available in metadata)
    if (result.metadata?.indexed_at) {
      factors.recency = this.calculateRecencyScore(result.metadata.indexed_at);
    }

    // Complexity (if available in metadata)
    if (result.metadata?.complexity) {
      factors.complexity = result.metadata.complexity;
    }

    return factors;
  }

  /**
   * Calculate name match score
   */
  private calculateNameMatchScore(query: string, name: string): number {
    // Exact match
    if (query === name) {
      return 1.0;
    }

    // Starts with query
    if (name.startsWith(query)) {
      return 0.9;
    }

    // Contains query
    if (name.includes(query)) {
      return 0.7;
    }

    // Fuzzy match (simple character overlap)
    const overlap = this.calculateCharacterOverlap(query, name);
    return overlap * 0.5;
  }

  /**
   * Calculate character overlap ratio
   */
  private calculateCharacterOverlap(str1: string, str2: string): number {
    const chars1 = new Set(str1.split(''));
    const chars2 = new Set(str2.split(''));

    let overlap = 0;
    for (const char of chars1) {
      if (chars2.has(char)) {
        overlap++;
      }
    }

    return overlap / Math.max(chars1.size, chars2.size);
  }

  /**
   * Calculate recency score
   */
  private calculateRecencyScore(indexedAt: string): number {
    try {
      const indexedDate = new Date(indexedAt);
      const now = new Date();
      const ageInDays = (now.getTime() - indexedDate.getTime()) / (1000 * 60 * 60 * 24);

      // Decay over 30 days
      if (ageInDays <= 7) return 1.0;
      if (ageInDays <= 14) return 0.9;
      if (ageInDays <= 30) return 0.8;
      return 0.7;
    } catch {
      return 1.0; // Default if date parsing fails
    }
  }

  /**
   * Calculate final score based on relevance factors
   */
  private calculateFinalScore(baseScore: number, factors: RelevanceFactors): number {
    let score = baseScore;

    // Boost for exact match
    if (factors.exactMatch) {
      score *= this.options.boostExactMatch;
    }

    // Boost for name match
    if (factors.nameMatch) {
      score *= 1 + (factors.nameMatch * (this.options.boostNameMatch - 1));
    }

    // Boost for recency
    if (factors.recency) {
      score *= 1 + (factors.recency - 1) * this.options.boostRecency;
    }

    // Penalize high complexity if enabled
    if (this.options.penalizeComplexity && factors.complexity) {
      const complexityPenalty = Math.max(0.5, 1 - (factors.complexity / 50));
      score *= complexityPenalty;
    }

    return score;
  }

  /**
   * Filter results by minimum score
   */
  filterByScore(results: EnhancedSearchResult[], minScore: number): EnhancedSearchResult[] {
    return results.filter((result) => result.score >= minScore);
  }

  /**
   * Deduplicate results
   */
  deduplicate(results: EnhancedSearchResult[]): EnhancedSearchResult[] {
    const seen = new Set<string>();
    const deduplicated: EnhancedSearchResult[] = [];

    for (const result of results) {
      const key = `${result.file}:${result.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      }
    }

    logger.debug(`Deduplicated ${results.length} results to ${deduplicated.length}`);
    return deduplicated;
  }

  /**
   * Group results by file
   */
  groupByFile(results: EnhancedSearchResult[]): Map<string, EnhancedSearchResult[]> {
    const groups = new Map<string, EnhancedSearchResult[]>();

    for (const result of results) {
      const existing = groups.get(result.file) || [];
      existing.push(result);
      groups.set(result.file, existing);
    }

    return groups;
  }
}
