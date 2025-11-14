/**
 * MCP Server implementation for Codebase Index
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logger.js';
import { formatError } from './utils/errors.js';
import type { Config } from './config/schema.js';
import { Orchestrator } from './orchestrator.js';
import { createEmbeddingProvider } from './embeddings/index.js';
import type { ProviderConfig } from './embeddings/types.js';
import { Storage } from './storage/index.js';

/**
 * Tool argument types
 */
interface CodebaseSearchArgs {
  query: string;
  limit?: number;
  threshold?: number;
  fileTypes?: string[];
  paths?: string[];
  directoryPrefix?: string; // NEW: Filter by directory (e.g., "src/components")
  languages?: string[];
  includeContext?: boolean;
  contextLines?: number;
}

interface IndexingStatusArgs {
  detailed?: boolean;
}

interface ReindexArgs {
  mode?: 'full' | 'incremental' | 'file';
  paths?: string[];
  force?: boolean;
}

interface ConfigureIndexerArgs {
  provider?: 'gemini' | 'openai' | 'ollama' | 'openai-compatible';
  providerConfig?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  qdrantConfig?: {
    url?: string;
    apiKey?: string;
  };
  indexingConfig?: {
    batchSize?: number;
    concurrency?: number;
    excludePatterns?: string[];
  };
  validate?: boolean;
}

interface ClearIndexArgs {
  confirm: boolean;
  workspace?: string;
}

interface ValidateConfigArgs {
  component?: 'qdrant' | 'embedder' | 'all';
}

/**
 * Create and configure the MCP server
 */
export function createServer(config: Config): { server: Server; orchestrator: Orchestrator } {
  const server = new Server(
    {
      name: 'mcp-codebase-index',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Create orchestrator
  const orchestrator = new Orchestrator(config);

  // Initialize orchestrator in background
  orchestrator.initialize().catch((error) => {
    logger.error('Failed to initialize orchestrator:', formatError(error));
  });

  // Register tool handlers
  registerToolHandlers(server, orchestrator);

  // Error handling
  server.onerror = (error) => {
    logger.error('Server error:', formatError(error));
  };

  return { server, orchestrator };
}

/**
 * Register MCP tool handlers
 */
function registerToolHandlers(server: Server, orchestrator: Orchestrator): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = [
      {
        name: 'codebase_search',
        description:
          'Search the indexed codebase using semantic search. Find code by natural language queries or code snippets.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language or code query to search for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10,
            },
            threshold: {
              type: 'number',
              description: 'Similarity threshold (0-1, default: 0.7)',
              default: 0.7,
            },
            fileTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by file extensions (e.g., ["ts", "js"])',
            },
            paths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by file paths',
            },
            directoryPrefix: {
              type: 'string',
              description: 'Filter by directory prefix (e.g., "src/components" for all files in that directory)',
            },
            includeContext: {
              type: 'boolean',
              description: 'Include surrounding code context',
              default: true,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'indexing_status',
        description:
          'Get the current indexing status, progress, and statistics for the codebase.',
        inputSchema: {
          type: 'object',
          properties: {
            detailed: {
              type: 'boolean',
              description: 'Include per-file details',
              default: false,
            },
          },
        },
      },
      {
        name: 'reindex',
        description:
          'Trigger reindexing of the codebase (full, incremental, or specific files).',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['full', 'incremental', 'file'],
              description: 'Reindexing mode',
              default: 'incremental',
            },
            paths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific files or folders to reindex (for file mode)',
            },
            force: {
              type: 'boolean',
              description: 'Force reindex even if files unchanged',
              default: false,
            },
          },
        },
      },
      {
        name: 'configure_indexer',
        description: 'Update indexer configuration at runtime.',
        inputSchema: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['gemini', 'openai', 'ollama', 'openai-compatible'],
              description: 'Embedding provider to use',
            },
            providerConfig: {
              type: 'object',
              properties: {
                apiKey: { type: 'string' },
                baseUrl: { type: 'string' },
                model: { type: 'string' },
              },
            },
            qdrantConfig: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                apiKey: { type: 'string' },
              },
            },
            indexingConfig: {
              type: 'object',
              properties: {
                batchSize: { type: 'number' },
                concurrency: { type: 'number' },
                excludePatterns: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
            validate: {
              type: 'boolean',
              description: 'Test connection on config change',
              default: true,
            },
          },
        },
      },
      {
        name: 'clear_index',
        description: 'Clear all indexed data and reset the index.',
        inputSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              description: 'Safety confirmation (must be true)',
            },
            workspace: {
              type: 'string',
              description: 'Specific workspace to clear (or all if not specified)',
            },
          },
          required: ['confirm'],
        },
      },
      {
        name: 'validate_config',
        description:
          'Validate configuration and test connections to Qdrant and embedding provider.',
        inputSchema: {
          type: 'object',
          properties: {
            component: {
              type: 'string',
              enum: ['qdrant', 'embedder', 'all'],
              description: 'Component to validate',
              default: 'all',
            },
          },
        },
      },
    ];

    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.info(`Tool called: ${name}`, args);

    try {
      switch (name) {
        case 'codebase_search':
          return await handleCodebaseSearch(orchestrator, (args || {}) as unknown as CodebaseSearchArgs);

        case 'indexing_status':
          return await handleIndexingStatus(orchestrator, (args || {}) as unknown as IndexingStatusArgs);

        case 'reindex':
          return await handleReindex(orchestrator, (args || {}) as unknown as ReindexArgs);

        case 'configure_indexer':
          return await handleConfigureIndexer(orchestrator, (args || {}) as unknown as ConfigureIndexerArgs);

        case 'clear_index':
          return await handleClearIndex(orchestrator, (args || {}) as unknown as ClearIndexArgs);

        case 'validate_config':
          return await handleValidateConfig(orchestrator, (args || {}) as unknown as ValidateConfigArgs);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error(`Tool ${name} failed:`, formatError(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${formatError(error)}`,
          },
        ],
      };
    }
  });
}

/**
 * Tool handler implementations
 */

async function handleCodebaseSearch(orchestrator: Orchestrator, args: CodebaseSearchArgs) {
  if (!orchestrator.isInitialized()) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: System is still initializing. Please wait a moment and try again.',
        },
      ],
    };
  }

  const search = orchestrator.getSearch();

  const response = await search.search({
    query: args.query,
    limit: args.limit || 10,
    threshold: args.threshold || 0.7,
    fileTypes: args.fileTypes,
    paths: args.paths,
    directoryPrefix: args.directoryPrefix, // NEW: Directory-based filtering
    languages: args.languages,
    includeContext: args.includeContext ?? true,
    contextLines: args.contextLines || 3,
  });

  // Format results for display
  const formattedResults = response.results.map((result) => {
    const lines = [
      `**${result.file}:${result.line}** (score: ${result.score.toFixed(3)})`,
      `Type: ${result.type}${result.name ? ` | Name: ${result.name}` : ''}`,
      '',
    ];

    // Prefer showing context over raw code for better readability
    // Context shows the code chunk within surrounding file lines
    if (result.context) {
      lines.push(
        '```' + (result.language || ''),
        result.context,
        '```'
      );
    } else {
      // Fallback to raw code if context not available
      lines.push(
        '```' + (result.language || ''),
        result.code,
        '```'
      );
    }

    if (result.relevanceFactors) {
      const factors = result.relevanceFactors;
      const factorLines = [];
      if (factors.exactMatch) factorLines.push('- Exact match');
      if (factors.nameMatch) factorLines.push('- Name match');
      if (factorLines.length > 0) {
        lines.push('', '**Relevance:**', ...factorLines);
      }
    }

    return lines.join('\n');
  });

  // Check if any results contain exact matches
  const hasExactMatches = response.results.some(r =>
    r.relevanceFactors?.exactMatch ||
    r.code?.toLowerCase().includes(response.query.toLowerCase()) ||
    r.context?.toLowerCase().includes(response.query.toLowerCase())
  );

  const summary = [
    `# Search Results for: "${response.query}"`,
    '',
    `Found ${response.stats.totalResults} results in ${response.stats.queryTime}ms`,
    `(Search: ${response.stats.searchTime}ms, Ranking: ${response.stats.rankingTime}ms)`,
    '',
  ];

  // Warn if no exact matches found
  if (!hasExactMatches && response.results.length > 0) {
    summary.push(
      '⚠️  **Note:** No exact text matches found. Results below are based on semantic similarity only.',
      'Consider: (1) Reindexing if files have changed, (2) Using simpler search terms, (3) Checking if the code exists in your codebase.',
      ''
    );
  }

  summary.push('---', '');

  const text = [...summary, ...formattedResults].join('\n');

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

async function handleIndexingStatus(orchestrator: Orchestrator, args: IndexingStatusArgs) {
  if (!orchestrator.isInitialized()) {
    return {
      content: [
        {
          type: 'text',
          text: 'System Status: Initializing...\n\nPlease wait for initialization to complete.',
        },
      ],
    };
  }

  const statusManager = orchestrator.getStatusManager();
  const completeStatus = await statusManager.getCompleteStatus(args.detailed || false);
  const display = statusManager.getStatusDisplay();

  // Format status for display
  const lines = [
    `# Indexing Status`,
    '',
    `**Status:** ${display.icon} ${display.message}`,
    '',
  ];

  // Progress section
  if (completeStatus.status === 'indexing') {
    const progress = completeStatus.progress;
    lines.push(
      '## Progress',
      `- Percentage: ${progress.percentage.toFixed(1)}%`,
      `- Files: ${progress.filesProcessed} / ${progress.filesTotal}`,
      `- Current file: ${progress.currentFile || 'N/A'}`,
      `- Rate: ${progress.rate?.toFixed(2) || '0'} files/sec`
    );

    if (progress.estimatedTimeRemaining) {
      lines.push(
        `- ETA: ${new Date(Date.now() + progress.estimatedTimeRemaining).toLocaleTimeString()}`
      );
    }

    lines.push('');
  }

  // Statistics section
  const stats = completeStatus.stats;
  lines.push(
    '## Statistics',
    `- Total Files: ${stats.totalFiles}`,
    `- Total Blocks: ${stats.totalBlocks}`,
    `- Total Vectors: ${stats.totalVectors}`,
    `- Avg Blocks/File: ${stats.averageBlocksPerFile.toFixed(2)}`,
    `- Indexing Time: ${(stats.indexingTime / 1000).toFixed(2)}s`
  );

  if (stats.lastIndexed) {
    lines.push(`- Last Indexed: ${stats.lastIndexed.toLocaleString()}`);
  }

  // Languages
  if (Object.keys(stats.languages).length > 0) {
    lines.push('', '### Languages');
    Object.entries(stats.languages)
      .sort(([, a], [, b]) => b - a)
      .forEach(([lang, count]) => {
        lines.push(`- ${lang}: ${count}`);
      });
  }

  // File types
  if (Object.keys(stats.fileTypes).length > 0) {
    lines.push('', '### File Types');
    Object.entries(stats.fileTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([type, count]) => {
        lines.push(`- ${type}: ${count}`);
      });
  }

  // Errors section
  if (completeStatus.errors.length > 0) {
    lines.push('', `## Recent Errors (${completeStatus.errors.length})`);
    completeStatus.errors.slice(-5).forEach((error) => {
      lines.push(`- **${error.file}**: ${error.error}`);
      if (error.retries) {
        lines.push(`  Retries: ${error.retries}`);
      }
    });
  }

  // System info
  lines.push(
    '',
    '## System',
    `- Watching: ${completeStatus.isWatching ? 'Yes' : 'No'}`,
    `- Queue Size: ${completeStatus.queueSize}`
  );

  if (completeStatus.currentBranch) {
    lines.push(`- Git Branch: ${completeStatus.currentBranch}`);
  }

  return {
    content: [
      {
        type: 'text',
        text: lines.join('\n'),
      },
    ],
  };
}

async function handleReindex(orchestrator: Orchestrator, args: ReindexArgs) {
  if (!orchestrator.isInitialized()) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: System is still initializing. Please wait a moment and try again.',
        },
      ],
    };
  }

  const indexer = orchestrator.getIndexer();
  const mode = args.mode || 'incremental';

  try {
    switch (mode) {
      case 'full':
        logger.info('Starting full reindex...');
        await indexer.indexAll({ force: true });
        return {
          content: [
            {
              type: 'text',
              text: `# Full Reindex Complete\n\n✓ Successfully reindexed all files\n\nUse \`indexing_status\` to see detailed statistics.`,
            },
          ],
        };

      case 'incremental':
        logger.info('Starting incremental reindex...');
        await indexer.indexAll({ force: false });
        return {
          content: [
            {
              type: 'text',
              text: `# Incremental Reindex Complete\n\n✓ Successfully indexed changed files\n\nUse \`indexing_status\` to see detailed statistics.`,
            },
          ],
        };

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Error: Unknown reindex mode: ${mode}. Use 'full' or 'incremental'.`,
            },
          ],
        };
    }
  } catch (error) {
    logger.error('Reindex failed:', error);
    return {
      content: [
        {
          type: 'text',
          text: `# Reindex Failed\n\n❌ ${formatError(error)}`,
        },
      ],
    };
  }
}

async function handleConfigureIndexer(orchestrator: Orchestrator, args: ConfigureIndexerArgs) {
  if (!orchestrator.isInitialized()) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: System is still initializing. Please wait a moment and try again.',
        },
      ],
    };
  }

  const currentConfig = orchestrator.getConfig();
  const updates: Partial<Config> = {};

  // Build update object
  if (args.provider) {
    updates.embedding = {
      ...currentConfig.embedding,
      provider: args.provider,
      ...(args.providerConfig || {}),
    };
  } else if (args.providerConfig) {
    updates.embedding = {
      ...currentConfig.embedding,
      ...args.providerConfig,
    };
  }

  if (args.qdrantConfig) {
    updates.qdrant = {
      ...currentConfig.qdrant,
      ...args.qdrantConfig,
    };
  }

  if (args.indexingConfig) {
    updates.indexing = {
      ...currentConfig.indexing,
      ...args.indexingConfig,
    };
  }

  if (Object.keys(updates).length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: No configuration updates specified',
        },
      ],
    };
  }

  try {
    logger.info('Updating configuration...', updates);

    // Validate if requested
    if (args.validate !== false) {
      logger.info('Validating new configuration...');

      // Test new provider if changed
      if (updates.embedding) {
        const testConfig = { ...currentConfig, ...updates };
        const providerConfig: ProviderConfig = {
          apiKey: testConfig.embedding.apiKey,
          baseUrl: testConfig.embedding.baseUrl,
          model: testConfig.embedding.model,
          dimensions: testConfig.embedding.dimensions,
        };
        const testEmbedder = createEmbeddingProvider(testConfig.embedding.provider, providerConfig);
        const health = await testEmbedder.healthCheck();

        if (!health.available) {
          return {
            content: [
              {
                type: 'text',
                text: `# Configuration Validation Failed\n\n❌ Embedding provider test failed: ${health.error}`,
              },
            ],
          };
        }
      }

      // Test new storage if changed
      if (updates.qdrant) {
        const testStorage = new Storage(updates.qdrant);
        const health = await testStorage.healthCheck();

        if (!health.connected) {
          return {
            content: [
              {
                type: 'text',
                text: `# Configuration Validation Failed\n\n❌ Qdrant connection test failed`,
              },
            ],
          };
        }
      }
    }

    // Apply configuration
    await orchestrator.reconfigure(updates);

    const changedFields = Object.keys(updates).join(', ');

    return {
      content: [
        {
          type: 'text',
          text: `# Configuration Updated\n\n✓ Successfully updated: ${changedFields}\n\nThe indexer has been restarted with the new configuration.`,
        },
      ],
    };
  } catch (error) {
    logger.error('Configuration update failed:', error);
    return {
      content: [
        {
          type: 'text',
          text: `# Configuration Update Failed\n\n❌ ${formatError(error)}`,
        },
      ],
    };
  }
}

async function handleClearIndex(orchestrator: Orchestrator, args: ClearIndexArgs) {
  if (!args.confirm) {
    return {
      content: [
        {
          type: 'text',
          text: '# Clear Index\n\n⚠️ **Safety check required**\n\nTo clear the index, you must set `confirm: true`.\n\nThis will permanently delete all indexed data.',
        },
      ],
    };
  }

  if (!orchestrator.isInitialized()) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: System is still initializing. Please wait a moment and try again.',
        },
      ],
    };
  }

  const storage = orchestrator.getStorage();
  const config = orchestrator.getConfig();
  const collectionName = args.workspace || config.qdrant.collectionName;

  try {
    logger.info(`Clearing collection: ${collectionName}`);

    // Check if collection exists
    const exists = await storage.collections.exists(collectionName);

    if (!exists) {
      return {
        content: [
          {
            type: 'text',
            text: `# Collection Not Found\n\n❌ Collection "${collectionName}" does not exist.`,
          },
        ],
      };
    }

    // Get stats before deletion
    const info = await storage.collections.info(collectionName);
    const pointCount = info.pointsCount;

    // Delete collection
    await storage.collections.delete(collectionName);

    // Recreate collection
    await storage.collections.create({
      name: collectionName,
      vectorSize: config.embedding.dimensions,
      distance: 'Cosine',
    });

    // Reset status
    const statusManager = orchestrator.getStatusManager();
    statusManager.reset();

    return {
      content: [
        {
          type: 'text',
          text: `# Index Cleared\n\n✓ Successfully cleared collection "${collectionName}"\n\nDeleted ${pointCount} vectors.\n\nThe collection has been recreated and is ready for indexing.`,
        },
      ],
    };
  } catch (error) {
    logger.error('Clear index failed:', error);
    return {
      content: [
        {
          type: 'text',
          text: `# Clear Index Failed\n\n❌ ${formatError(error)}`,
        },
      ],
    };
  }
}

async function handleValidateConfig(orchestrator: Orchestrator, args: ValidateConfigArgs) {
  const component = args.component || 'all';
  const results: string[] = ['# Configuration Validation', ''];

  try {
    // Validate Qdrant connection
    if (component === 'all' || component === 'qdrant') {
      results.push('## Qdrant Storage');
      try {
        const storage = orchestrator.getStorage();
        const health = await storage.healthCheck();

        if (health.connected) {
          results.push(
            `✓ Connected successfully`,
            `- Collections: ${health.collections}`,
            `- URL: ${orchestrator.getConfig().qdrant.url}`
          );

          // Check collection
          const collectionName = orchestrator.getConfig().qdrant.collectionName;
          const exists = await storage.collections.exists(collectionName);

          if (exists) {
            const info = await storage.collections.info(collectionName);
            results.push(
              `- Collection "${collectionName}": ${info.pointsCount} points, ${info.indexedVectorsCount} indexed vectors`
            );
          } else {
            results.push(`- Collection "${collectionName}": Not created yet`);
          }
        } else {
          results.push(`❌ Connection failed`);
        }
      } catch (error) {
        results.push(`❌ Error: ${formatError(error)}`);
      }
      results.push('');
    }

    // Validate embedding provider
    if (component === 'all' || component === 'embedder') {
      results.push('## Embedding Provider');
      try {
        const embedder = orchestrator.getEmbedder();
        const config = orchestrator.getConfig();
        const health = await embedder.healthCheck();

        if (health.available) {
          results.push(
            `✓ Provider available`,
            `- Provider: ${config.embedding.provider}`,
            `- Model: ${config.embedding.model || 'default'}`,
            `- Dimensions: ${config.embedding.dimensions}`
          );

          // Test embedding generation
          results.push('- Testing embedding generation...');
          const testStart = Date.now();
          const testResult = await embedder.embed('test query');
          const testTime = Date.now() - testStart;

          results.push(
            `✓ Test embedding successful`,
            `  - Dimensions: ${testResult.values.length}`,
            `  - Time: ${testTime}ms`
          );
        } else {
          results.push(`❌ Provider unavailable: ${health.error}`);
        }
      } catch (error) {
        results.push(`❌ Error: ${formatError(error)}`);
      }
      results.push('');
    }

    // Overall status
    const allPassed = !results.join('\n').includes('❌');
    results.push(
      '---',
      '',
      allPassed
        ? '✓ **All validation checks passed**'
        : '❌ **Some validation checks failed**'
    );

    return {
      content: [
        {
          type: 'text',
          text: results.join('\n'),
        },
      ],
    };
  } catch (error) {
    logger.error('Validation failed:', error);
    return {
      content: [
        {
          type: 'text',
          text: `# Validation Failed\n\n❌ ${formatError(error)}`,
        },
      ],
    };
  }
}
