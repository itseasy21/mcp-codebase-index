/**
 * Collection lifecycle manager
 */

import type { QdrantClientWrapper } from './qdrant-client.js';
import type { CollectionConfig, CollectionInfo, SchemaVersion } from './types.js';
import { StorageError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/retry.js';

/**
 * Manages Qdrant collection lifecycle
 */
export class CollectionManager {
  constructor(private client: QdrantClientWrapper) {}

  /**
   * Create a new collection
   */
  async createCollection(config: CollectionConfig): Promise<void> {
    try {
      logger.info(`Creating collection: ${config.name}`);

      const qdrantClient = this.client.getClient();

      await retry(
        async () => {
          await qdrantClient.createCollection(config.name, {
            vectors: {
              size: config.vectorSize,
              distance: config.distance as any,
            } as any,
            optimizers_config: config.optimizerConfig,
            on_disk_payload: config.onDiskPayload,
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
        }
      );

      logger.info(`Collection created successfully: ${config.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create collection ${config.name}: ${message}`);
      throw new StorageError(`Failed to create collection: ${message}`);
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionName: string): Promise<void> {
    try {
      logger.info(`Deleting collection: ${collectionName}`);

      const qdrantClient = this.client.getClient();

      await retry(
        async () => {
          await qdrantClient.deleteCollection(collectionName);
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
        }
      );

      logger.info(`Collection deleted successfully: ${collectionName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to delete collection ${collectionName}: ${message}`);
      throw new StorageError(`Failed to delete collection: ${message}`);
    }
  }

  /**
   * Get collection information
   */
  async getCollectionInfo(collectionName: string): Promise<CollectionInfo> {
    try {
      const info = await this.client.getCollectionInfo(collectionName);

      // Handle vectors config - it might be an object or number
      const vectorsConfig = info.config?.params?.vectors;
      const vectorSize = typeof vectorsConfig === 'object' && vectorsConfig && 'size' in vectorsConfig
        ? (vectorsConfig as any).size
        : typeof vectorsConfig === 'number'
        ? vectorsConfig
        : 768; // fallback

      return {
        name: collectionName,
        vectorSize,
        pointsCount: info.points_count || 0,
        indexedVectorsCount: info.indexed_vectors_count || 0,
        status: info.status as 'green' | 'yellow' | 'red',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to get collection info: ${message}`);
    }
  }

  /**
   * Check if collection exists
   */
  async exists(collectionName: string): Promise<boolean> {
    return await this.client.collectionExists(collectionName);
  }

  /**
   * Ensure collection exists, create if it doesn't
   */
  async ensureCollection(config: CollectionConfig): Promise<void> {
    const exists = await this.exists(config.name);

    if (!exists) {
      logger.info(`Collection ${config.name} does not exist, creating...`);
      await this.createCollection(config);
    } else {
      logger.debug(`Collection ${config.name} already exists`);

      // Verify schema matches
      const info = await this.getCollectionInfo(config.name);
      if (info.vectorSize !== config.vectorSize) {
        logger.warn(
          `Collection ${config.name} has different vector size: ${info.vectorSize} vs ${config.vectorSize}`
        );
        throw new StorageError(
          `Collection schema mismatch: expected vector size ${config.vectorSize}, got ${info.vectorSize}`
        );
      }
    }
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<CollectionInfo[]> {
    try {
      const result = await this.client.listCollections();

      const collections: CollectionInfo[] = [];

      for (const collection of result.collections) {
        try {
          const info = await this.getCollectionInfo(collection.name);
          collections.push(info);
        } catch (error) {
          logger.warn(`Failed to get info for collection ${collection.name}`);
        }
      }

      return collections;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to list collections: ${message}`);
    }
  }

  /**
   * Clear all points from a collection
   */
  async clearCollection(collectionName: string): Promise<void> {
    try {
      logger.info(`Clearing collection: ${collectionName}`);

      // Delete and recreate is more reliable than deleting all points
      const info = await this.getCollectionInfo(collectionName);

      await this.deleteCollection(collectionName);

      await this.createCollection({
        name: collectionName,
        vectorSize: info.vectorSize,
        distance: 'Cosine', // Default, should be configurable
      });

      logger.info(`Collection cleared successfully: ${collectionName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to clear collection: ${message}`);
    }
  }

  /**
   * Get collection schema version
   */
  async getSchemaVersion(collectionName: string): Promise<SchemaVersion> {
    try {
      const info = await this.client.getCollectionInfo(collectionName);

      // Handle vectors config - it might be an object or number
      const vectorsConfig = info.config?.params?.vectors;
      const vectorSize = typeof vectorsConfig === 'object' && vectorsConfig && 'size' in vectorsConfig
        ? (vectorsConfig as any).size
        : typeof vectorsConfig === 'number'
        ? vectorsConfig
        : 768; // fallback

      const distance = typeof vectorsConfig === 'object' && vectorsConfig && 'distance' in vectorsConfig
        ? String((vectorsConfig as any).distance)
        : 'Cosine';

      return {
        version: 1, // For now, we use a simple version number
        vectorSize,
        distance,
        created: new Date(), // Qdrant doesn't track this, we'd need to store it ourselves
        migrationRequired: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to get schema version: ${message}`);
    }
  }

  /**
   * Recreate collection with new configuration
   */
  async recreateCollection(
    collectionName: string,
    newConfig: CollectionConfig
  ): Promise<void> {
    try {
      logger.info(`Recreating collection ${collectionName} with new config`);

      // Delete existing collection
      const exists = await this.exists(collectionName);
      if (exists) {
        await this.deleteCollection(collectionName);
      }

      // Create with new config
      await this.createCollection(newConfig);

      logger.info(`Collection recreated successfully: ${collectionName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to recreate collection: ${message}`);
    }
  }

  /**
   * Update collection optimizer config
   */
  async updateOptimizerConfig(
    collectionName: string,
    config: CollectionConfig['optimizerConfig']
  ): Promise<void> {
    try {
      logger.info(`Updating optimizer config for collection: ${collectionName}`);

      const qdrantClient = this.client.getClient();

      await qdrantClient.updateCollection(collectionName, {
        optimizers_config: config,
      });

      logger.info(`Optimizer config updated for collection: ${collectionName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to update optimizer config: ${message}`);
    }
  }
}
