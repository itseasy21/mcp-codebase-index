/**
 * Storage orchestrator and exports
 */

import { QdrantClientWrapper, type QdrantConfig } from './qdrant-client.js';
import { CollectionManager } from './collection-manager.js';
import { VectorStore } from './vector-store.js';
import type {
  CollectionConfig,
  CollectionInfo,
  Point,
  SearchOptions,
  QdrantSearchResult,
  StorageHealth,
  BatchUpsertResult,
  DeleteResult,
} from './types.js';
import { logger } from '../utils/logger.js';
import { StorageError } from '../utils/errors.js';

/**
 * Main storage orchestrator
 */
export class Storage {
  private client: QdrantClientWrapper;
  private collectionManager: CollectionManager;
  private vectorStore: VectorStore;

  constructor(config: QdrantConfig) {
    this.client = new QdrantClientWrapper(config);
    this.collectionManager = new CollectionManager(this.client);
    this.vectorStore = new VectorStore(this.client);
  }

  /**
   * Initialize storage and ensure collection exists
   */
  async initialize(collectionConfig: CollectionConfig): Promise<void> {
    try {
      logger.info('Initializing storage...');

      // Test connection
      const connected = await this.client.testConnection();
      if (!connected) {
        throw new StorageError('Failed to connect to Qdrant');
      }

      // Ensure collection exists
      await this.collectionManager.ensureCollection(collectionConfig);

      logger.info('Storage initialized successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Storage initialization failed: ${message}`);
      throw error;
    }
  }

  /**
   * Get storage health
   */
  async healthCheck(): Promise<StorageHealth> {
    return await this.client.healthCheck();
  }

  /**
   * Collection operations
   */
  get collections() {
    return {
      create: (config: CollectionConfig) => this.collectionManager.createCollection(config),
      delete: (name: string) => this.collectionManager.deleteCollection(name),
      exists: (name: string) => this.collectionManager.exists(name),
      info: (name: string) => this.collectionManager.getCollectionInfo(name),
      list: () => this.collectionManager.listCollections(),
      clear: (name: string) => this.collectionManager.clearCollection(name),
      ensure: (config: CollectionConfig) => this.collectionManager.ensureCollection(config),
      recreate: (name: string, config: CollectionConfig) =>
        this.collectionManager.recreateCollection(name, config),
    };
  }

  /**
   * Vector operations
   */
  get vectors() {
    return {
      upsert: (collection: string, point: Point) =>
        this.vectorStore.upsert(collection, point),
      upsertBatch: (collection: string, points: Point[]) =>
        this.vectorStore.upsertBatch(collection, points),
      upsertBatchChunked: (collection: string, points: Point[], chunkSize?: number) =>
        this.vectorStore.upsertBatchChunked(collection, points, chunkSize),
      delete: (collection: string, pointIds: Array<string | number>) =>
        this.vectorStore.delete(collection, pointIds),
      deleteByFilter: (collection: string, filter: any) =>
        this.vectorStore.deleteByFilter(collection, filter),
      search: (collection: string, vector: number[], options?: SearchOptions) =>
        this.vectorStore.search(collection, vector, options),
      get: (collection: string, pointId: string | number) =>
        this.vectorStore.getPoint(collection, pointId),
      scroll: (collection: string, options?: any) =>
        this.vectorStore.scroll(collection, options),
      count: (collection: string, filter?: any) =>
        this.vectorStore.count(collection, filter),
    };
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.client.close();
  }

  /**
   * Get underlying client
   */
  getClient(): QdrantClientWrapper {
    return this.client;
  }
}

/**
 * Create storage instance
 */
export function createStorage(config: QdrantConfig): Storage {
  return new Storage(config);
}

// Re-export types
export type {
  QdrantConfig,
  CollectionConfig,
  CollectionInfo,
  Point,
  SearchOptions,
  QdrantSearchResult,
  StorageHealth,
  BatchUpsertResult,
  DeleteResult,
} from './types.js';

export { QdrantClientWrapper } from './qdrant-client.js';
export { CollectionManager } from './collection-manager.js';
export { VectorStore } from './vector-store.js';
export * from './types.js';
