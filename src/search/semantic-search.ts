/**
 * Semantic search using vector similarity
 */

import type { EmbeddingProvider } from '../embeddings/base.js';
import type { Storage } from '../storage/index.js';
import type { SearchQuery, EnhancedSearchResult } from './types.js';
import { logger } from '../utils/logger.js';
import { SearchError } from '../utils/errors.js';
import { buildPathPrefixFilter } from '../utils/path-utils.js';

/**
 * Semantic search implementation
 */
export class SemanticSearch {
  constructor(
    private embedder: EmbeddingProvider,
    private storage: Storage,
    private collectionName: string
  ) {}

  /**
   * Search using semantic similarity
   */
  async search(query: SearchQuery): Promise<EnhancedSearchResult[]> {
    try {
      const startTime = Date.now();

      // Generate embedding for query
      logger.debug(`Generating embedding for query: "${query.query}"`);
      const embeddingStartTime = Date.now();
      const embedding = await this.embedder.embed(query.query);
      const embeddingTime = Date.now() - embeddingStartTime;

      logger.debug(`Embedding generated in ${embeddingTime}ms`);

      // Build filter
      const filter = this.buildFilter(query);

      // Search in Qdrant with HNSW optimization
      const searchStartTime = Date.now();
      const qdrantResults = await this.storage.vectors.search(
        this.collectionName,
        embedding.values,
        {
          limit: query.limit || 10,
          scoreThreshold: query.threshold || 0.7,
          filter,
          withPayload: true,
          withVector: false,
          // HNSW search parameters for optimal query performance
          params: {
            hnsw_ef: 128, // Query-time search width (balance between speed and recall)
            exact: false, // Use approximate search for speed
          } as any,
        }
      );
      const searchTime = Date.now() - searchStartTime;

      logger.debug(`Search completed in ${searchTime}ms, found ${qdrantResults.length} results`);

      // Convert to search results
      const results: EnhancedSearchResult[] = qdrantResults.map((result) => ({
        file: result.payload.file as string,
        line: result.payload.line as number,
        code: result.payload.code as string,
        type: result.payload.type as any,
        name: result.payload.name as string,
        score: result.score,
        language: result.payload.language as string,
        metadata: result.payload.metadata,
      }));

      const totalTime = Date.now() - startTime;
      logger.info(
        `Semantic search completed: ${results.length} results in ${totalTime}ms (embedding: ${embeddingTime}ms, search: ${searchTime}ms)`
      );

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Semantic search failed: ${message}`);
      throw new SearchError(`Semantic search failed: ${message}`);
    }
  }

  /**
   * Build Qdrant filter from query
   */
  private buildFilter(query: SearchQuery): any {
    const conditions: any[] = [];
    const mustNotConditions: any[] = [];

    // NEW: Always exclude metadata points from search results
    mustNotConditions.push({
      key: 'type',
      match: { value: 'metadata' },
    });

    // NEW: Filter by directory prefix (most efficient filter)
    if (query.directoryPrefix) {
      const pathSegmentFilters = buildPathPrefixFilter(query.directoryPrefix);
      conditions.push(...pathSegmentFilters);
      logger.debug(`Filtering by directory prefix: ${query.directoryPrefix} (${pathSegmentFilters.length} segments)`);
    }

    // Filter by file types
    if (query.fileTypes && query.fileTypes.length > 0) {
      // Extract extensions for matching
      const extensions = query.fileTypes.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));
      conditions.push({
        key: 'file',
        match: {
          any: extensions.map((ext) => ({ value: ext })),
        },
      });
    }

    // Filter by paths
    if (query.paths && query.paths.length > 0) {
      const pathConditions = query.paths.map((path) => ({
        key: 'file',
        match: { value: path },
      }));

      if (pathConditions.length === 1) {
        conditions.push(pathConditions[0]);
      } else {
        conditions.push({
          should: pathConditions,
        });
      }
    }

    // Filter by languages
    if (query.languages && query.languages.length > 0) {
      if (query.languages.length === 1) {
        conditions.push({
          key: 'language',
          match: { value: query.languages[0] },
        });
      } else {
        conditions.push({
          key: 'language',
          match: {
            any: query.languages.map((lang) => ({ value: lang })),
          },
        });
      }
    }

    // Filter by block types
    if (query.blockTypes && query.blockTypes.length > 0) {
      if (query.blockTypes.length === 1) {
        conditions.push({
          key: 'type',
          match: { value: query.blockTypes[0] },
        });
      } else {
        conditions.push({
          key: 'type',
          match: {
            any: query.blockTypes.map((type) => ({ value: type })),
          },
        });
      }
    }

    // Build final filter
    if (conditions.length === 0 && mustNotConditions.length === 0) {
      return undefined;
    }

    const filter: any = {};
    if (conditions.length > 0) {
      filter.must = conditions;
    }
    if (mustNotConditions.length > 0) {
      filter.must_not = mustNotConditions;
    }

    return filter;
  }

  /**
   * Search with multiple queries (batch)
   */
  async searchBatch(queries: SearchQuery[]): Promise<EnhancedSearchResult[][]> {
    const results: EnhancedSearchResult[][] = [];

    for (const query of queries) {
      const queryResults = await this.search(query);
      results.push(queryResults);
    }

    return results;
  }

  /**
   * Find similar code blocks to a given block
   */
  async findSimilar(
    file: string,
    line: number,
    limit = 10
  ): Promise<EnhancedSearchResult[]> {
    try {
      // Get the code block
      const pointId = `${file}:${line}`;
      const point = await this.storage.vectors.get(this.collectionName, pointId);

      if (!point) {
        throw new SearchError(`Code block not found: ${pointId}`);
      }

      // Search for similar vectors
      const results = await this.storage.vectors.search(this.collectionName, point.vector, {
        limit: limit + 1, // +1 to account for the original block
        withPayload: true,
      });

      // Filter out the original block and convert to search results
      return results
        .filter((result) => result.id !== pointId)
        .slice(0, limit)
        .map((result) => ({
          file: result.payload.file as string,
          line: result.payload.line as number,
          code: result.payload.code as string,
          type: result.payload.type as any,
          name: result.payload.name as string,
          score: result.score,
          language: result.payload.language as string,
          metadata: result.payload.metadata,
        }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Find similar failed: ${message}`);
      throw new SearchError(`Find similar failed: ${message}`);
    }
  }
}
