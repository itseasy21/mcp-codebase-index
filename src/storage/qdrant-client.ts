/**
 * Qdrant client wrapper
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import type { StorageHealth } from './types.js';
import { StorageError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/retry.js';

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
  port?: number;
  https?: boolean;
}

/**
 * Wrapper around Qdrant client with error handling and retry logic
 */
export class QdrantClientWrapper {
  private client: QdrantClient;
  private config: QdrantConfig;

  constructor(config: QdrantConfig) {
    this.config = config;

    try {
      // Parse URL to get host and port
      const url = new URL(config.url);
      const host = url.hostname;
      const port = config.port || (url.port ? parseInt(url.port) : url.protocol === 'https:' ? 443 : 6333);
      const https = config.https ?? url.protocol === 'https:';

      this.client = new QdrantClient({
        host,
        port,
        apiKey: config.apiKey,
        https,
      });

      logger.info(`Qdrant client initialized: ${host}:${port} (https: ${https})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to initialize Qdrant client: ${message}`);
      throw new StorageError(`Failed to initialize Qdrant client: ${message}`);
    }
  }

  /**
   * Get the underlying Qdrant client
   */
  getClient(): QdrantClient {
    return this.client;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<StorageHealth> {
    try {
      const startTime = Date.now();

      // Check cluster info to verify connection
      const clusterInfo = await retry(
        async () => this.client.getCollections(),
        {
          maxAttempts: 3,
          initialDelay: 1000,
        }
      );

      const latency = Date.now() - startTime;

      // Count total points across all collections
      let totalPoints = 0;
      for (const collection of clusterInfo.collections) {
        try {
          const info = await this.client.getCollection(collection.name);
          totalPoints += info.points_count || 0;
        } catch (_error) {
          logger.warn(`Failed to get collection info for ${collection.name}`);
        }
      }

      return {
        connected: true,
        collections: clusterInfo.collections.length,
        totalPoints,
        latency,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Qdrant health check failed: ${message}`);

      return {
        connected: false,
        collections: 0,
        totalPoints: 0,
        error: message,
      };
    }
  }

  /**
   * Check if collection exists
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    try {
      await this.client.getCollection(collectionName);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(collectionName: string) {
    try {
      return await retry(
        async () => this.client.getCollection(collectionName),
        {
          maxAttempts: 3,
          initialDelay: 500,
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to get collection info: ${message}`);
    }
  }

  /**
   * List all collections
   */
  async listCollections() {
    try {
      return await retry(
        async () => this.client.getCollections(),
        {
          maxAttempts: 3,
          initialDelay: 500,
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to list collections: ${message}`);
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      logger.error('Qdrant connection test failed:', error);
      return false;
    }
  }

  /**
   * Get config
   */
  getConfig(): QdrantConfig {
    return { ...this.config };
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    // QdrantClient doesn't have explicit close, but we can clear reference
    logger.info('Qdrant client closed');
  }
}
