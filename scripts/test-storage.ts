/**
 * Manual storage testing script
 */

import { createStorage } from '../src/storage/index.js';
import { logger } from '../src/utils/logger.js';

async function testStorage() {
  logger.info('Testing Qdrant Storage...');

  // Create storage instance
  const storage = createStorage({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  });

  try {
    // Health check
    logger.info('\n1. Testing connection...');
    const health = await storage.healthCheck();

    if (!health.connected) {
      logger.error('Failed to connect to Qdrant:', health.error);
      logger.info('\nMake sure Qdrant is running:');
      logger.info('  docker run -p 6333:6333 qdrant/qdrant');
      process.exit(1);
    }

    logger.info('✓ Connected to Qdrant');
    logger.info(`  Collections: ${health.collections}`);
    logger.info(`  Total points: ${health.totalPoints}`);
    logger.info(`  Latency: ${health.latency}ms`);

    // Create test collection
    logger.info('\n2. Creating test collection...');
    const collectionName = 'test-collection';

    const exists = await storage.collections.exists(collectionName);
    if (exists) {
      logger.info('  Collection already exists, deleting...');
      await storage.collections.delete(collectionName);
    }

    await storage.collections.create({
      name: collectionName,
      vectorSize: 384, // Small dimension for testing
      distance: 'Cosine',
    });

    logger.info('✓ Collection created');

    // Insert test vectors
    logger.info('\n3. Inserting test vectors...');
    const testPoints = [
      {
        id: 'test-1',
        vector: Array(384).fill(0).map(() => Math.random()),
        payload: {
          file: 'test.ts',
          line: 1,
          code: 'function hello() { return "world"; }',
          type: 'function',
          name: 'hello',
        },
      },
      {
        id: 'test-2',
        vector: Array(384).fill(0).map(() => Math.random()),
        payload: {
          file: 'test.ts',
          line: 5,
          code: 'class Calculator { add(a, b) { return a + b; } }',
          type: 'class',
          name: 'Calculator',
        },
      },
    ];

    const result = await storage.vectors.upsertBatch(collectionName, testPoints);

    logger.info(`✓ Inserted ${result.pointsProcessed} vectors in ${result.duration}ms`);

    // Get collection info
    logger.info('\n4. Getting collection info...');
    const info = await storage.collections.info(collectionName);

    logger.info('✓ Collection info:');
    logger.info(`  Name: ${info.name}`);
    logger.info(`  Vector size: ${info.vectorSize}`);
    logger.info(`  Points: ${info.pointsCount}`);
    logger.info(`  Status: ${info.status}`);

    // Search vectors
    logger.info('\n5. Searching vectors...');
    const queryVector = Array(384).fill(0).map(() => Math.random());
    const searchResults = await storage.vectors.search(collectionName, queryVector, {
      limit: 2,
    });

    logger.info(`✓ Found ${searchResults.length} results`);
    for (const result of searchResults) {
      logger.info(`  - ${result.payload.name} (score: ${result.score.toFixed(4)})`);
    }

    // Count points
    logger.info('\n6. Counting points...');
    const count = await storage.vectors.count(collectionName);
    logger.info(`✓ Total points: ${count}`);

    // Clean up
    logger.info('\n7. Cleaning up...');
    await storage.collections.delete(collectionName);
    logger.info('✓ Test collection deleted');

    logger.info('\n✓ All storage tests passed!');

    await storage.close();
  } catch (error) {
    logger.error('Storage test failed:', error);
    process.exit(1);
  }
}

testStorage();
