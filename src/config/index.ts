import dotenv from 'dotenv';
import { z } from 'zod';
import { configSchema, type Config } from './schema.js';
import { defaultConfig } from './defaults.js';

// Load environment variables
dotenv.config();

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const config: Partial<Config> = {
    codebase: {
      path: process.env.CODEBASE_PATH || '',
    },
    embedding: {
      provider: (process.env.EMBEDDING_PROVIDER as any) || defaultConfig.embedding?.provider || 'gemini',
      apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.OLLAMA_API_KEY,
      baseUrl: process.env.OLLAMA_BASE_URL || process.env.OPENAI_COMPATIBLE_BASE_URL,
      model: process.env.OPENAI_MODEL || process.env.OLLAMA_MODEL || process.env.OPENAI_COMPATIBLE_MODEL,
      dimensions: process.env.EMBEDDING_DIMENSIONS ? parseInt(process.env.EMBEDDING_DIMENSIONS, 10) : defaultConfig.embedding?.dimensions || 768,
      chunkSize: process.env.CHUNK_SIZE ? parseInt(process.env.CHUNK_SIZE, 10) : defaultConfig.embedding?.chunkSize || 512,
      chunkOverlap: process.env.CHUNK_OVERLAP ? parseInt(process.env.CHUNK_OVERLAP, 10) : defaultConfig.embedding?.chunkOverlap || 50,
    },
    qdrant: {
      url: process.env.QDRANT_URL || defaultConfig.qdrant?.url || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: process.env.QDRANT_COLLECTION_NAME || defaultConfig.qdrant?.collectionName || 'codebase-index',
      distanceMetric: (process.env.QDRANT_DISTANCE_METRIC as any) || defaultConfig.qdrant?.distanceMetric || 'Cosine',
    },
    indexing: {
      languages: process.env.INDEX_LANGUAGES?.split(',') || defaultConfig.indexing?.languages || [],
      exclude: process.env.INDEX_EXCLUDE_PATTERNS?.split(',') || defaultConfig.indexing?.exclude || [],
      include: process.env.INDEX_INCLUDE_PATTERNS?.split(',') || defaultConfig.indexing?.include || [],
      batchSize: process.env.INDEX_BATCH_SIZE ? parseInt(process.env.INDEX_BATCH_SIZE, 10) : defaultConfig.indexing?.batchSize || 50,
      concurrency: process.env.INDEX_CONCURRENCY ? parseInt(process.env.INDEX_CONCURRENCY, 10) : defaultConfig.indexing?.concurrency || 5,
      maxFileSize: process.env.INDEX_MAX_FILE_SIZE ? parseInt(process.env.INDEX_MAX_FILE_SIZE, 10) : defaultConfig.indexing?.maxFileSize || 1048576,
      respectGitignore: process.env.INDEX_RESPECT_GITIGNORE === 'true',
      useMcpignore: process.env.INDEX_USE_MCPIGNORE === 'true',
      autoIndex: process.env.INDEX_AUTO_INDEX !== 'false',
      watchFiles: process.env.INDEX_WATCH_FILES !== 'false',
      watchBranches: process.env.INDEX_WATCH_BRANCHES !== 'false',
      fallbackChunking: process.env.INDEX_FALLBACK_CHUNKING !== 'false',
      markdownHeaderParsing: process.env.INDEX_MARKDOWN_HEADER_PARSING !== 'false',
      excludeBinaries: process.env.INDEX_EXCLUDE_BINARIES !== 'false',
      excludeImages: process.env.INDEX_EXCLUDE_IMAGES !== 'false',
      enableWatcher: process.env.INDEX_ENABLE_WATCHER !== 'false',
      gitIntegration: process.env.INDEX_GIT_INTEGRATION !== 'false',
      detectBranchChange: process.env.INDEX_DETECT_BRANCH_CHANGE !== 'false',
      watchDebounce: process.env.INDEX_WATCH_DEBOUNCE ? parseInt(process.env.INDEX_WATCH_DEBOUNCE, 10) : 200,
    },
    search: {
      defaultLimit: process.env.SEARCH_DEFAULT_LIMIT ? parseInt(process.env.SEARCH_DEFAULT_LIMIT, 10) : defaultConfig.search?.defaultLimit || 10,
      minScore: process.env.SEARCH_MIN_SCORE ? parseFloat(process.env.SEARCH_MIN_SCORE) : defaultConfig.search?.minScore || 0.7,
      includeContext: process.env.SEARCH_INCLUDE_CONTEXT !== 'false',
      contextLines: process.env.SEARCH_CONTEXT_LINES ? parseInt(process.env.SEARCH_CONTEXT_LINES, 10) : defaultConfig.search?.contextLines || 5,
      searchMode: (process.env.SEARCH_MODE as any) || defaultConfig.search?.searchMode || 'all-folders',
      perFolderCollections: process.env.SEARCH_PER_FOLDER_COLLECTIONS !== 'false',
      enableCache: process.env.SEARCH_ENABLE_CACHE !== 'false',
      cacheSize: process.env.SEARCH_CACHE_SIZE ? parseInt(process.env.SEARCH_CACHE_SIZE, 10) : 100,
      cacheTTL: process.env.SEARCH_CACHE_TTL ? parseInt(process.env.SEARCH_CACHE_TTL, 10) : 300000,
    },
    multiWorkspace: {
      enabled: process.env.MULTI_WORKSPACE_ENABLED !== 'false',
      independentIndexing: process.env.MULTI_WORKSPACE_INDEPENDENT_INDEXING !== 'false',
      aggregateStatus: process.env.MULTI_WORKSPACE_AGGREGATE_STATUS !== 'false',
    },
    git: {
      watchBranches: process.env.GIT_WATCH_BRANCHES !== 'false',
      autoDetectChanges: process.env.GIT_AUTO_DETECT_CHANGES !== 'false',
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || defaultConfig.logging?.level || 'info',
    },
  };

  // Merge with defaults and validate
  const mergedConfig = {
    ...defaultConfig,
    ...config,
    embedding: { ...defaultConfig.embedding, ...config.embedding },
    qdrant: { ...defaultConfig.qdrant, ...config.qdrant },
    indexing: { ...defaultConfig.indexing, ...config.indexing },
    search: { ...defaultConfig.search, ...config.search },
    multiWorkspace: { ...defaultConfig.multiWorkspace, ...config.multiWorkspace },
    git: { ...defaultConfig.git, ...config.git },
    logging: { ...defaultConfig.logging, ...config.logging },
  };

  try {
    return configSchema.parse(mergedConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Configuration validation failed:\n${errors}`);
    }
    throw error;
  }
}

/**
 * Validate configuration without loading
 */
export function validateConfig(config: Partial<Config>): { valid: boolean; errors?: string[] } {
  try {
    configSchema.parse(config);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}

export type { Config } from './schema.js';
export { configSchema } from './schema.js';
export { defaultConfig } from './defaults.js';
