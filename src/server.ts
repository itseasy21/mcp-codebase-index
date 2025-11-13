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

/**
 * Create and configure the MCP server
 */
export function createServer(config: Config): Server {
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

  // Register tool handlers
  registerToolHandlers(server, config);

  // Error handling
  server.onerror = (error) => {
    logger.error('Server error:', formatError(error));
  };

  process.on('SIGINT', async () => {
    logger.info('Shutting down server...');
    await server.close();
    process.exit(0);
  });

  return server;
}

/**
 * Register MCP tool handlers
 */
function registerToolHandlers(server: Server, config: Config): void {
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
          return await handleCodebaseSearch(args);

        case 'indexing_status':
          return await handleIndexingStatus(args);

        case 'reindex':
          return await handleReindex(args);

        case 'configure_indexer':
          return await handleConfigureIndexer(args);

        case 'clear_index':
          return await handleClearIndex(args);

        case 'validate_config':
          return await handleValidateConfig(args);

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
 * Tool handler implementations (placeholders for now)
 */

async function handleCodebaseSearch(args: any) {
  // TODO: Implement actual search logic
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            message: 'Search functionality will be implemented in Phase 6',
            query: args.query,
            placeholder: true,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleIndexingStatus(args: any) {
  // TODO: Implement actual status logic
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            status: 'standby',
            statusIcon: '⚪',
            progress: {
              percentage: 0,
              filesProcessed: 0,
              filesTotal: 0,
            },
            stats: {
              totalBlocks: 0,
              totalVectors: 0,
              languages: {},
            },
            message: 'Status tracking will be implemented in Phase 7',
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleReindex(args: any) {
  // TODO: Implement actual reindex logic
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: false,
            message: 'Reindexing functionality will be implemented in Phase 5',
            filesQueued: 0,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleConfigureIndexer(args: any) {
  // TODO: Implement actual configuration logic
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: false,
            message: 'Configuration update will be implemented',
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleClearIndex(args: any) {
  if (!args.confirm) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Must set confirm=true to clear index',
        },
      ],
    };
  }

  // TODO: Implement actual clear logic
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: false,
            message: 'Clear index functionality will be implemented in Phase 4',
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleValidateConfig(args: any) {
  // TODO: Implement actual validation logic
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            valid: false,
            message: 'Validation will be implemented in Phases 3-4',
          },
          null,
          2
        ),
      },
    ],
  };
}
