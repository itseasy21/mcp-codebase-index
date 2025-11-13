#!/usr/bin/env node

/**
 * MCP Codebase Index Server - Entry Point
 *
 * This server provides semantic code search capabilities through the Model Context Protocol.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config/index.js';
import { createServer } from './server.js';
import { logger, initLogger } from './utils/logger.js';
import { formatError } from './utils/errors.js';

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Load configuration
    logger.info('Loading configuration...');
    const config = loadConfig();

    // Initialize logger with configured level
    initLogger(config.logging.level);

    logger.info('Starting MCP Codebase Index Server...');
    logger.debug('Configuration loaded:', {
      provider: config.embedding.provider,
      qdrantUrl: config.qdrant.url,
      codebasePath: config.codebase.path,
    });

    // Create server
    const { server, orchestrator } = createServer(config);

    // Create transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    logger.info('MCP Codebase Index Server started successfully');
    logger.info('Server is ready to accept requests');

    // Log configuration summary
    logger.info('Configuration:');
    logger.info(`  Codebase: ${config.codebase.path || 'Not configured'}`);
    logger.info(`  Embedding Provider: ${config.embedding.provider}`);
    logger.info(`  Qdrant URL: ${config.qdrant.url}`);
    logger.info(`  Collection: ${config.qdrant.collectionName}`);

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      try {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await orchestrator.shutdown();
        await server.close();
        process.exit(0);
      } catch (error) {
        logger.error(`Error during ${signal} shutdown:`, formatError(error));
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Failed to start server:', formatError(error));
    if (error instanceof Error && error.stack) {
      logger.debug('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
