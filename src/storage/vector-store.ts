/**
 * Vector storage operations
 */

import type { QdrantClientWrapper } from './qdrant-client.js';
import type {
  Point,
  BatchUpsertResult,
  DeleteResult,
  SearchOptions,
  QdrantSearchResult,
  ScrollOptions,
  ScrollResult,
} from './types.js';
import { StorageError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/retry.js';

/**
 * Vector storage operations
 */
export class VectorStore {
  constructor(private client: QdrantClientWrapper) {}

  /**
   * Upsert a single point
   */
  async upsert(collectionName: string, point: Point): Promise<void> {
    try {
      const qdrantClient = this.client.getClient();

      await retry(
        async () => {
          await qdrantClient.upsert(collectionName, {
            wait: true,
            points: [
              {
                id: point.id,
                vector: point.vector,
                payload: point.payload,
              },
            ],
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 500,
        }
      );

      logger.debug(`Upserted point ${point.id} to collection ${collectionName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to upsert point: ${message}`);
    }
  }

  /**
   * Upsert multiple points in batch
   */
  async upsertBatch(collectionName: string, points: Point[]): Promise<BatchUpsertResult> {
    const startTime = Date.now();

    try {
      logger.info(`Upserting ${points.length} points to collection ${collectionName}`);

      const qdrantClient = this.client.getClient();

      // Convert points to Qdrant format
      const qdrantPoints = points.map(point => ({
        id: point.id,
        vector: point.vector,
        payload: point.payload,
      }));

      await retry(
        async () => {
          await qdrantClient.upsert(collectionName, {
            wait: true,
            points: qdrantPoints,
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
        }
      );

      const duration = Date.now() - startTime;

      logger.info(
        `Successfully upserted ${points.length} points in ${duration}ms`
      );

      return {
        status: 'completed',
        pointsProcessed: points.length,
        duration,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      logger.error(`Failed to upsert batch: ${message}`);

      return {
        status: 'failed',
        pointsProcessed: 0,
        errors: [message],
        duration,
      };
    }
  }

  /**
   * Upsert points in chunks
   */
  async upsertBatchChunked(
    collectionName: string,
    points: Point[],
    chunkSize = 100
  ): Promise<BatchUpsertResult> {
    const startTime = Date.now();
    let totalProcessed = 0;
    const errors: string[] = [];

    try {
      logger.info(
        `Upserting ${points.length} points in chunks of ${chunkSize} to collection ${collectionName}`
      );

      // Split into chunks
      for (let i = 0; i < points.length; i += chunkSize) {
        const chunk = points.slice(i, i + chunkSize);

        try {
          await this.upsertBatch(collectionName, chunk);
          totalProcessed += chunk.length;

          logger.debug(`Processed chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(points.length / chunkSize)}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Chunk ${i}-${i + chunk.length}: ${message}`);
        }
      }

      const duration = Date.now() - startTime;

      if (errors.length > 0) {
        logger.warn(`Batch upsert completed with ${errors.length} errors`);
        return {
          status: 'completed',
          pointsProcessed: totalProcessed,
          errors,
          duration,
        };
      }

      logger.info(`Successfully upserted all ${totalProcessed} points in ${duration}ms`);

      return {
        status: 'completed',
        pointsProcessed: totalProcessed,
        duration,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      return {
        status: 'failed',
        pointsProcessed: totalProcessed,
        errors: [...errors, message],
        duration,
      };
    }
  }

  /**
   * Delete points by IDs
   */
  async delete(
    collectionName: string,
    pointIds: Array<string | number>
  ): Promise<DeleteResult> {
    try {
      logger.info(`Deleting ${pointIds.length} points from collection ${collectionName}`);

      const qdrantClient = this.client.getClient();

      await retry(
        async () => {
          await qdrantClient.delete(collectionName, {
            wait: true,
            points: pointIds,
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 500,
        }
      );

      logger.info(`Successfully deleted ${pointIds.length} points`);

      return {
        status: 'completed',
        pointsDeleted: pointIds.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to delete points: ${message}`);

      return {
        status: 'failed',
        pointsDeleted: 0,
        error: message,
      };
    }
  }

  /**
   * Delete points by filter
   */
  async deleteByFilter(
    collectionName: string,
    filter: any
  ): Promise<DeleteResult> {
    try {
      logger.info(`Deleting points by filter from collection ${collectionName}`);

      const qdrantClient = this.client.getClient();

      await retry(
        async () => {
          await qdrantClient.delete(collectionName, {
            wait: true,
            filter,
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 500,
        }
      );

      logger.info('Successfully deleted points by filter');

      return {
        status: 'completed',
        pointsDeleted: -1, // Unknown without additional query
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to delete points by filter: ${message}`);

      return {
        status: 'failed',
        pointsDeleted: 0,
        error: message,
      };
    }
  }

  /**
   * Search for similar vectors
   */
  async search(
    collectionName: string,
    vector: number[],
    options: SearchOptions = {}
  ): Promise<QdrantSearchResult[]> {
    try {
      const qdrantClient = this.client.getClient();

      const results = await retry(
        async () => {
          return await qdrantClient.search(collectionName, {
            vector,
            limit: options.limit || 10,
            offset: options.offset,
            score_threshold: options.scoreThreshold,
            filter: options.filter,
            with_payload: options.withPayload !== false,
            with_vector: options.withVector || false,
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 500,
        }
      );

      return results.map(result => ({
        id: result.id,
        score: result.score,
        payload: result.payload || {},
        vector: result.vector as number[] | undefined,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to search vectors: ${message}`);
    }
  }

  /**
   * Get point by ID
   */
  async getPoint(collectionName: string, pointId: string | number): Promise<Point | null> {
    try {
      const qdrantClient = this.client.getClient();

      const result = await qdrantClient.retrieve(collectionName, {
        ids: [pointId],
        with_payload: true,
        with_vector: true,
      });

      if (result.length === 0) {
        return null;
      }

      const point = result[0];

      return {
        id: point.id,
        vector: point.vector as number[],
        payload: point.payload || {},
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to get point: ${message}`);
    }
  }

  /**
   * Scroll through points (pagination)
   */
  async scroll(
    collectionName: string,
    options: ScrollOptions = {}
  ): Promise<ScrollResult> {
    try {
      const qdrantClient = this.client.getClient();

      const result = await qdrantClient.scroll(collectionName, {
        limit: options.limit || 100,
        offset: options.offset,
        filter: options.filter,
        with_payload: options.withPayload !== false,
        with_vector: options.withVector || false,
      });

      const points: Point[] = result.points.map(point => ({
        id: point.id,
        vector: (point.vector as number[]) || [],
        payload: point.payload || {},
      }));

      return {
        points,
        nextOffset: result.next_page_offset,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to scroll points: ${message}`);
    }
  }

  /**
   * Count points in collection
   */
  async count(collectionName: string, filter?: any): Promise<number> {
    try {
      const qdrantClient = this.client.getClient();

      const result = await qdrantClient.count(collectionName, {
        filter,
        exact: true,
      });

      return result.count;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to count points: ${message}`);
    }
  }
}
