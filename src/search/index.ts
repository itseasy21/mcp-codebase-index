/**
 * Main search orchestrator
 */

import type { EmbeddingProvider } from '../embeddings/base.js';
import type { Storage } from '../storage/index.js';
import { SemanticSearch } from './semantic-search.js';
import { ResultRanker, type RankingOptions } from './result-ranker.js';
import { ContextExtractor, type ContextOptions } from './context-extractor.js';
import { LRUCache, hashKey } from '../utils/cache.js';
import type { SearchQuery, SearchResponse, SearchStats, EnhancedSearchResult } from './types.js';
import { logger } from '../utils/logger.js';

export interface SearchConfig {
  basePath: string;
  collectionName: string;
  embedder: EmbeddingProvider;
  storage: Storage;
  rankingOptions?: RankingOptions;
  enableCache?: boolean;
  cacheSize?: number;
  cacheTTL?: number;
}

/**
 * Main search orchestrator
 */
export class Search {
  private semanticSearch: SemanticSearch;
  private ranker: ResultRanker;
  private contextExtractor: ContextExtractor;
  private cache: LRUCache<SearchResponse> | null = null;

  constructor(private config: SearchConfig) {
    this.semanticSearch = new SemanticSearch(
      config.embedder,
      config.storage,
      config.collectionName
    );

    this.ranker = new ResultRanker(config.rankingOptions);
    this.contextExtractor = new ContextExtractor(config.basePath);

    // Initialize cache if enabled
    if (config.enableCache) {
      this.cache = new LRUCache<SearchResponse>({
        maxSize: config.cacheSize || 100,
        ttl: config.cacheTTL || 300000, // 5 minutes default
      });
    }
  }

  /**
   * Perform semantic search
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      logger.info(`Search query: "${query.query}"`);

      // Check cache
      if (this.cache) {
        const cacheKey = this.getCacheKey(query);
        const cached = this.cache.get(cacheKey);

        if (cached) {
          logger.debug('Returning cached results');
          return cached;
        }
      }

      // Perform semantic search
      const searchStartTime = Date.now();
      let results = await this.semanticSearch.search(query);
      const searchTime = Date.now() - searchStartTime;

      // Rank results
      const rankingStartTime = Date.now();
      results = this.ranker.rank(query.query, results);
      results = this.ranker.deduplicate(results);
      const rankingTime = Date.now() - rankingStartTime;

      // Apply limit after ranking
      if (query.limit) {
        results = results.slice(0, query.limit);
      }

      // Add context if requested
      if (query.includeContext) {
        const contextOptions: ContextOptions = {
          linesBefore: query.contextLines,
          linesAfter: query.contextLines,
          includeLineNumbers: true,
        };
        results = await this.contextExtractor.addContext(results, contextOptions);
      }

      const queryTime = Date.now() - startTime;

      const response: SearchResponse = {
        results,
        stats: {
          totalResults: results.length,
          queryTime,
          searchTime,
          rankingTime,
        },
        query: query.query,
      };

      // Cache response
      if (this.cache) {
        const cacheKey = this.getCacheKey(query);
        this.cache.set(cacheKey, response);
      }

      logger.info(
        `Search complete: ${results.length} results in ${queryTime}ms (search: ${searchTime}ms, ranking: ${rankingTime}ms)`
      );

      return response;
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Find similar code blocks
   */
  async findSimilar(
    file: string,
    line: number,
    limit = 10
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      logger.info(`Finding similar code to ${file}:${line}`);

      const results = await this.semanticSearch.findSimilar(file, line, limit);
      const queryTime = Date.now() - startTime;

      return {
        results,
        stats: {
          totalResults: results.length,
          queryTime,
        },
        query: `Similar to ${file}:${line}`,
      };
    } catch (error) {
      logger.error('Find similar failed:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    if (!this.cache) {
      return null;
    }

    return this.cache.stats();
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
      logger.info('Search cache cleared');
    }
  }

  /**
   * Generate cache key for query
   */
  private getCacheKey(query: SearchQuery): string {
    return hashKey(
      query.query,
      String(query.limit || 10),
      String(query.threshold || 0.7),
      JSON.stringify(query.fileTypes || []),
      JSON.stringify(query.paths || []),
      JSON.stringify(query.languages || []),
      String(query.includeContext || false)
    );
  }
}

// Re-export types
export type {
  SearchQuery,
  SearchResponse,
  SearchStats,
  EnhancedSearchResult,
  RelevanceFactors,
} from './types.js';

export { SemanticSearch } from './semantic-search.js';
export { ResultRanker } from './result-ranker.js';
export { ContextExtractor } from './context-extractor.js';
