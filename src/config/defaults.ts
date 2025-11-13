import type { Config } from './schema.js';

/**
 * Default configuration values
 */
export const defaultConfig: Partial<Config> = {
  embedding: {
    provider: 'gemini',
    dimensions: 768,
    chunkSize: 512,
    chunkOverlap: 50,
  },
  qdrant: {
    url: 'http://localhost:6333',
    collectionName: 'codebase-index',
    distanceMetric: 'Cosine',
  },
  indexing: {
    languages: [
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
    ],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.min.js',
      '**/*.test.*',
      '**/*.spec.*',
    ],
    include: [
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
    ],
    batchSize: 50,
    concurrency: 5,
    maxFileSize: 1048576, // 1MB
    respectGitignore: true,
    useMcpignore: true,
    autoIndex: true,
    watchFiles: true,
    watchBranches: true,
    fallbackChunking: true,
    markdownHeaderParsing: true,
    excludeBinaries: true,
    excludeImages: true,
  },
  search: {
    defaultLimit: 10,
    minScore: 0.7,
    includeContext: true,
    contextLines: 5,
    searchMode: 'all-folders',
    perFolderCollections: true,
  },
  multiWorkspace: {
    enabled: true,
    independentIndexing: true,
    aggregateStatus: true,
  },
  git: {
    watchBranches: true,
    autoDetectChanges: true,
  },
  logging: {
    level: 'info',
  },
};
