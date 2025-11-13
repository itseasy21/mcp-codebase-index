/**
 * Types for search operations
 */

import type { SearchResult, CodeBlockType } from '../types/models.js';

/**
 * Search query options
 */
export interface SearchQuery {
  query: string;
  limit?: number;
  threshold?: number;
  fileTypes?: string[];
  paths?: string[];
  languages?: string[];
  blockTypes?: CodeBlockType[];
  includeContext?: boolean;
  contextLines?: number;
  useHybrid?: boolean;
}

/**
 * Search result with enhanced metadata
 */
export interface EnhancedSearchResult extends SearchResult {
  rank?: number;
  relevanceFactors?: RelevanceFactors;
  highlights?: string[];
}

/**
 * Relevance factors for ranking
 */
export interface RelevanceFactors {
  vectorScore: number;
  nameMatch?: number;
  exactMatch?: boolean;
  recency?: number;
  complexity?: number;
  popularity?: number;
}

/**
 * Search statistics
 */
export interface SearchStats {
  totalResults: number;
  queryTime: number;
  embeddingTime?: number;
  searchTime?: number;
  rankingTime?: number;
}

/**
 * Search response
 */
export interface SearchResponse {
  results: EnhancedSearchResult[];
  stats: SearchStats;
  query: string;
}

/**
 * Filter condition for search
 */
export interface SearchFilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: any;
}

/**
 * Search filter
 */
export interface SearchFilter {
  must?: SearchFilterCondition[];
  should?: SearchFilterCondition[];
  mustNot?: SearchFilterCondition[];
}
