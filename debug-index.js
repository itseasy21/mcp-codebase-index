#!/usr/bin/env node

// Quick debug script to check indexing status

import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const collectionName = process.env.QDRANT_COLLECTION_NAME || 'codebase-index';

console.log('Checking Qdrant status...');
console.log('URL:', qdrantUrl);
console.log('Collection:', collectionName);
console.log('');

const client = new QdrantClient({ url: qdrantUrl });

async function checkStatus() {
  try {
    // Check if Qdrant is accessible
    const health = await client.api('cluster').clusterStatus();
    console.log('✓ Qdrant is running');
    console.log('');

    // List all collections
    const collections = await client.getCollections();
    console.log('Collections:', collections.collections.map(c => c.name).join(', '));
    console.log('');

    // Check if our collection exists
    const collectionExists = collections.collections.some(c => c.name === collectionName);

    if (!collectionExists) {
      console.log(`✗ Collection "${collectionName}" does not exist`);
      console.log('  This is normal for a fresh install.');
      console.log('  Run index_codebase to create it.');
      return;
    }

    // Get collection info
    const info = await client.getCollection(collectionName);
    console.log(`✓ Collection "${collectionName}" exists`);
    console.log('  Vectors count:', info.vectors_count || info.points_count || 0);
    console.log('  Vector size:', info.config?.params?.vectors?.size || 'unknown');
    console.log('');

    // Get a sample point if any exist
    if (info.vectors_count > 0 || info.points_count > 0) {
      const sample = await client.scroll(collectionName, { limit: 1, with_payload: true });
      if (sample.points?.length > 0) {
        const point = sample.points[0];
        console.log('Sample point:');
        console.log('  ID:', point.id);
        console.log('  File:', point.payload?.file || 'unknown');
        console.log('  Type:', point.payload?.type || 'unknown');
        console.log('  Language:', point.payload?.language || 'unknown');
      }
    } else {
      console.log('✗ Collection is empty (0 vectors)');
      console.log('  This means indexing hasn\'t completed successfully.');
      console.log('  Check:');
      console.log('  1. Is CODEBASE_PATH correct?');
      console.log('  2. Are there files to index in that path?');
      console.log('  3. Check server logs for errors during indexing');
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n  Qdrant is not running!');
      console.log('  Start it with: docker run -p 6333:6333 qdrant/qdrant');
    }
  }
}

checkStatus().catch(console.error);
