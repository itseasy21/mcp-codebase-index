import { z } from 'zod';

/**
 * Configuration schema for the MCP Codebase Index server
 */
export const configSchema = z.object({
  // Codebase configuration
  codebase: z.object({
    path: z.string().min(1, 'Codebase path is required'),
  }),

  // Embedding provider configuration
  embedding: z.object({
    provider: z.enum(['gemini', 'openai', 'ollama', 'openai-compatible']),
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
    model: z.string().optional(),
    dimensions: z.number().int().positive().default(768),
    chunkSize: z.number().int().positive().default(512),
    chunkOverlap: z.number().int().min(0).default(50),
  }),

  // Qdrant configuration
  qdrant: z.object({
    url: z.string().url(),
    apiKey: z.string().optional(),
    collectionName: z.string().default('codebase-index'),
    distanceMetric: z.enum(['Cosine', 'Euclidean', 'Dot']).default('Cosine'),
  }),

  // Indexing configuration
  indexing: z.object({
    languages: z.array(z.string()).default([
      'typescript',
      'javascript',
      'python',
      'java',
      'go',
      'rust',
      'c',
      'cpp',
      'csharp',
      'ruby',
      'php',
    ]),
    exclude: z.array(z.string()).default([
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.min.js',
      '**/*.test.*',
      '**/*.spec.*',
    ]),
    include: z.array(z.string()).default([
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.java',
      '**/*.go',
      '**/*.rs',
      '**/*.c',
      '**/*.cpp',
      '**/*.cs',
      '**/*.rb',
      '**/*.php',
      '**/*.md',
    ]),
    batchSize: z.number().int().positive().default(50),
    concurrency: z.number().int().positive().default(5),
    maxFileSize: z.number().int().positive().default(1048576), // 1MB
    respectGitignore: z.boolean().default(true),
    useMcpignore: z.boolean().default(true),
    autoIndex: z.boolean().default(true),
    watchFiles: z.boolean().default(true),
    watchBranches: z.boolean().default(true),
    fallbackChunking: z.boolean().default(true),
    markdownHeaderParsing: z.boolean().default(true),
    excludeBinaries: z.boolean().default(true),
    excludeImages: z.boolean().default(true),
  }),

  // Search configuration
  search: z.object({
    defaultLimit: z.number().int().positive().default(10),
    minScore: z.number().min(0).max(1).default(0.7),
    includeContext: z.boolean().default(true),
    contextLines: z.number().int().min(0).default(5),
    searchMode: z.enum(['all-folders', 'per-folder']).default('all-folders'),
    perFolderCollections: z.boolean().default(true),
  }),

  // Multi-workspace configuration
  multiWorkspace: z.object({
    enabled: z.boolean().default(true),
    independentIndexing: z.boolean().default(true),
    aggregateStatus: z.boolean().default(true),
  }),

  // Git integration configuration
  git: z.object({
    watchBranches: z.boolean().default(true),
    autoDetectChanges: z.boolean().default(true),
  }),

  // Logging configuration
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Partial config for runtime updates
 */
export type PartialConfig = z.infer<typeof partialConfigSchema>;

export const partialConfigSchema = configSchema.partial();
