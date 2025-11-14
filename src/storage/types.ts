/**
 * Types for vector storage
 */

/**
 * Qdrant collection configuration
 */
export interface CollectionConfig {
  name: string;
  vectorSize: number;
  distance: 'Cosine' | 'Euclidean' | 'Dot';
  onDiskPayload?: boolean;
  optimizerConfig?: {
    deletedThreshold?: number;
    vacuumMinVectorNumber?: number;
    defaultSegmentNumber?: number;
  };
}

/**
 * Collection information
 */
export interface CollectionInfo {
  name: string;
  vectorSize: number;
  pointsCount: number;
  indexedVectorsCount: number;
  status: 'green' | 'yellow' | 'red';
  created?: Date;
  modified?: Date;
}

/**
 * Point (vector with payload) for Qdrant
 */
export interface Point {
  id: string | number;
  vector: number[];
  payload: Record<string, any>;
}

/**
 * Search options
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  scoreThreshold?: number;
  filter?: SearchFilter;
  withPayload?: boolean;
  withVector?: boolean;
}

/**
 * Search filter
 */
export interface SearchFilter {
  must?: FilterCondition[];
  should?: FilterCondition[];
  mustNot?: FilterCondition[];
}

/**
 * Filter condition
 */
export interface FilterCondition {
  key: string;
  match?: {
    value: string | number | boolean;
  };
  range?: {
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };
}

/**
 * Search result from Qdrant
 */
export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload: Record<string, any>;
  vector?: number[];
}

/**
 * Batch upsert result
 */
export interface BatchUpsertResult {
  status: 'completed' | 'failed';
  pointsProcessed: number;
  errors?: string[];
  duration: number;
}

/**
 * Delete result
 */
export interface DeleteResult {
  status: 'completed' | 'failed';
  pointsDeleted: number;
  error?: string;
}

/**
 * Storage health
 */
export interface StorageHealth {
  connected: boolean;
  version?: string;
  collections: number;
  totalPoints: number;
  latency?: number;
  error?: string;
}

/**
 * Collection schema version
 */
export interface SchemaVersion {
  version: number;
  vectorSize: number;
  distance: string;
  created: Date;
  migrationRequired: boolean;
}

/**
 * Scroll options for pagination
 */
export interface ScrollOptions {
  limit?: number;
  offset?: string | number;
  filter?: SearchFilter;
  withPayload?: boolean;
  withVector?: boolean;
}

/**
 * Scroll result
 */
export interface ScrollResult {
  points: Point[];
  nextOffset?: string | number;
}

/**
 * Update operation
 */
export interface UpdateOperation {
  type: 'upsert' | 'delete';
  points?: Point[];
  pointIds?: Array<string | number>;
}
