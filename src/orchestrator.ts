/**
 * Main orchestrator that manages all components
 */

import type { Config } from './config/schema.js';
import { Storage } from './storage/index.js';
import { createEmbeddingProvider } from './embeddings/index.js';
import type { ProviderConfig } from './embeddings/types.js';
import { Indexer } from './indexer/index.js';
import { Search } from './search/index.js';
import { StatusManager } from './status/index.js';
import { CodeParser } from './parser/index.js';
import { logger } from './utils/logger.js';
import type { EmbeddingProvider } from './embeddings/base.js';

/**
 * Orchestrator manages lifecycle of all components
 */
export class Orchestrator {
  private storage!: Storage;
  private embedder!: EmbeddingProvider;
  private parser!: CodeParser;
  private indexer!: Indexer;
  private search!: Search;
  private statusManager!: StatusManager;
  private initialized = false;

  constructor(private config: Config) {}

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Orchestrator already initialized');
      return;
    }

    logger.info('Initializing orchestrator...');

    try {
      // Initialize storage
      logger.debug('Initializing storage...');
      this.storage = new Storage({
        url: this.config.qdrant.url,
        apiKey: this.config.qdrant.apiKey,
      });

      // Test storage connection
      const storageHealth = await this.storage.healthCheck();
      if (!storageHealth.connected) {
        throw new Error('Failed to connect to Qdrant');
      }
      logger.info(`Connected to Qdrant (${storageHealth.collections} collections)`);

      // Initialize embedding provider
      logger.debug(`Initializing ${this.config.embedding.provider} embedder...`);
      const providerConfig: ProviderConfig = {
        apiKey: this.config.embedding.apiKey,
        baseUrl: this.config.embedding.baseUrl,
        model: this.config.embedding.model,
        dimensions: this.config.embedding.dimensions,
      };
      this.embedder = createEmbeddingProvider(this.config.embedding.provider, providerConfig);

      // Test embedder connection
      const embedderHealth = await this.embedder.healthCheck();
      if (!embedderHealth.available) {
        throw new Error(`Embedder health check failed: ${embedderHealth.error}`);
      }
      logger.info(`Embedder ready (${this.config.embedding.provider})`);

      // Initialize parser
      logger.debug('Initializing code parser...');
      this.parser = new CodeParser({
        maxFileSize: this.config.indexing.maxFileSize,
        excludeBinaries: true,
        excludeImages: true,
        fallbackChunking: true,
        markdownHeaderParsing: true,
      });

      // Ensure collection exists
      const collectionExists = await this.storage.collections.exists(
        this.config.qdrant.collectionName
      );

      if (!collectionExists) {
        logger.info(`Creating collection: ${this.config.qdrant.collectionName}`);
        await this.storage.collections.create(
          this.config.qdrant.collectionName,
          this.config.embedding.dimensions
        );
      } else {
        logger.info(`Using existing collection: ${this.config.qdrant.collectionName}`);
      }

      // Initialize status manager
      logger.debug('Initializing status manager...');
      this.statusManager = new StatusManager({
        storage: this.storage,
        collectionName: this.config.qdrant.collectionName,
      });

      // Initialize search
      logger.debug('Initializing search engine...');
      this.search = new Search({
        basePath: this.config.codebase.path,
        collectionName: this.config.qdrant.collectionName,
        embedder: this.embedder,
        storage: this.storage,
        enableCache: this.config.search?.enableCache ?? true,
        cacheSize: this.config.search?.cacheSize ?? 100,
        cacheTTL: this.config.search?.cacheTTL ?? 300000,
      });

      // Initialize indexer
      logger.debug('Initializing indexer...');
      this.indexer = new Indexer({
        basePath: this.config.codebase.path,
        collectionName: this.config.qdrant.collectionName,
        parser: this.parser,
        embedder: this.embedder,
        storage: this.storage,
        options: {
          batchSize: this.config.indexing.batchSize,
          concurrency: this.config.indexing.concurrency,
        },
        watchFiles: this.config.indexing.enableWatcher,
        watchBranches: this.config.indexing.gitIntegration && this.config.indexing.detectBranchChange,
        respectGitignore: true,
        useMcpignore: true,
      });

      this.initialized = true;
      logger.info('Orchestrator initialized successfully');

      // Start initial indexing if auto-index is enabled
      if (this.config.indexing.autoIndex) {
        logger.info('Starting auto-indexing...');
        this.startAutoIndexing().catch((error) => {
          logger.error('Auto-indexing failed:', error);
        });
      }
    } catch (error) {
      logger.error('Failed to initialize orchestrator:', error);
      throw error;
    }
  }

  /**
   * Start auto-indexing in the background
   */
  private async startAutoIndexing(): Promise<void> {
    try {
      // Perform initial incremental indexing
      await this.indexer.indexAll({ force: false });
      logger.info('Initial indexing complete');

      // Start file watcher if enabled
      if (this.config.indexing.enableWatcher) {
        await this.indexer.startWatching();
        logger.info('File watcher started');
      }

      // Start git branch monitor if enabled
      if (this.config.indexing.gitIntegration && this.config.indexing.detectBranchChange) {
        await this.indexer.startGitMonitor();
        logger.info('Git branch monitor started');
      }
    } catch (error) {
      logger.error('Auto-indexing setup failed:', error);
      throw error;
    }
  }

  /**
   * Reconfigure components (for runtime config updates)
   */
  async reconfigure(newConfig: Partial<Config>): Promise<void> {
    if (!this.initialized) {
      throw new Error('Orchestrator not initialized');
    }

    logger.info('Reconfiguring orchestrator...');

    // Stop current indexer
    await this.indexer.stop();

    // Merge config
    this.config = { ...this.config, ...newConfig };

    // Reinitialize if provider changed
    if (newConfig.embedding?.provider) {
      logger.info('Reinitializing embedding provider...');
      const providerConfig: ProviderConfig = {
        apiKey: this.config.embedding.apiKey,
        baseUrl: this.config.embedding.baseUrl,
        model: this.config.embedding.model,
        dimensions: this.config.embedding.dimensions,
      };
      this.embedder = createEmbeddingProvider(this.config.embedding.provider, providerConfig);

      const embedderHealth = await this.embedder.healthCheck();
      if (!embedderHealth.available) {
        throw new Error(`Embedder health check failed: ${embedderHealth.error}`);
      }
    }

    // Reinitialize storage if Qdrant config changed
    if (newConfig.qdrant?.url || newConfig.qdrant?.apiKey) {
      logger.info('Reinitializing storage...');
      this.storage = new Storage({
        url: this.config.qdrant.url,
        apiKey: this.config.qdrant.apiKey,
      });

      const storageHealth = await this.storage.healthCheck();
      if (!storageHealth.connected) {
        throw new Error('Failed to connect to Qdrant');
      }
    }

    // Recreate indexer with new config
    this.indexer = new Indexer({
      basePath: this.config.codebase.path,
      collectionName: this.config.qdrant.collectionName,
      parser: this.parser,
      embedder: this.embedder,
      storage: this.storage,
      options: {
        batchSize: this.config.indexing.batchSize,
        concurrency: this.config.indexing.concurrency,
      },
      watchFiles: this.config.indexing.enableWatcher,
      watchBranches: this.config.indexing.gitIntegration && this.config.indexing.detectBranchChange,
      respectGitignore: true,
      useMcpignore: true,
    });

    // Recreate search with new config
    this.search = new Search({
      basePath: this.config.codebase.path,
      collectionName: this.config.qdrant.collectionName,
      embedder: this.embedder,
      storage: this.storage,
      enableCache: this.config.search?.enableCache ?? true,
      cacheSize: this.config.search?.cacheSize ?? 100,
      cacheTTL: this.config.search?.cacheTTL ?? 300000,
    });

    logger.info('Reconfiguration complete');
  }

  /**
   * Shutdown all components
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    logger.info('Shutting down orchestrator...');

    try {
      await this.indexer.stop();
      logger.info('Orchestrator shut down successfully');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }

    this.initialized = false;
  }

  /**
   * Get components
   */
  getStorage(): Storage {
    this.ensureInitialized();
    return this.storage;
  }

  getEmbedder(): EmbeddingProvider {
    this.ensureInitialized();
    return this.embedder;
  }

  getIndexer(): Indexer {
    this.ensureInitialized();
    return this.indexer;
  }

  getSearch(): Search {
    this.ensureInitialized();
    return this.search;
  }

  getStatusManager(): StatusManager {
    this.ensureInitialized();
    return this.statusManager;
  }

  getConfig(): Config {
    return { ...this.config };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure orchestrator is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Orchestrator not initialized. Call initialize() first.');
    }
  }
}
