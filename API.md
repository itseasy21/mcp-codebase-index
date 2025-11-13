# API Reference

Complete API reference for the MCP Codebase Index server.

## Table of Contents

- [Core Components](#core-components)
- [MCP Tools](#mcp-tools)
- [Parser API](#parser-api)
- [Embeddings API](#embeddings-api)
- [Storage API](#storage-api)
- [Search API](#search-api)
- [Configuration](#configuration)
- [Type Definitions](#type-definitions)

---

## Core Components

### Orchestrator

The main orchestrator class that manages all components.

```typescript
import { Orchestrator } from './orchestrator.js';
import { loadConfig } from './config/index.js';

const config = await loadConfig();
const orchestrator = new Orchestrator(config);
await orchestrator.initialize();
```

#### Methods

##### `initialize(): Promise<void>`

Initializes all components (storage, embedder, parser, indexer, search, status manager).

**Throws**: Error if any component fails to initialize

**Example**:
```typescript
await orchestrator.initialize();
```

##### `getIndexer(): Indexer`

Returns the indexer instance.

**Returns**: `Indexer` - The indexer component

##### `getSearch(): Search`

Returns the search instance.

**Returns**: `Search` - The search component

##### `getStatusManager(): StatusManager`

Returns the status manager instance.

**Returns**: `StatusManager` - The status manager component

##### `updateConfig(newConfig: Partial<Config>): Promise<void>`

Updates configuration at runtime and reinitializes affected components.

**Parameters**:
- `newConfig` - Partial configuration to update

**Example**:
```typescript
await orchestrator.updateConfig({
  embedding: {
    provider: 'openai',
    apiKey: 'new_key'
  }
});
```

##### `shutdown(): Promise<void>`

Gracefully shuts down all components.

**Example**:
```typescript
await orchestrator.shutdown();
```

---

## MCP Tools

All tools are exposed via the MCP server and can be called from Claude or other MCP clients.

### `codebase_search`

Search the indexed codebase using semantic search.

**Input Schema**:
```typescript
{
  query: string;              // Required: Search query
  limit?: number;             // Optional: Max results (default: 10)
  threshold?: number;         // Optional: Similarity threshold 0-1 (default: 0.7)
  fileTypes?: string[];       // Optional: Filter by extensions
  paths?: string[];           // Optional: Filter by paths
  languages?: string[];       // Optional: Filter by languages
  includeContext?: boolean;   // Optional: Include surrounding code (default: true)
  contextLines?: number;      // Optional: Lines of context (default: 3)
}
```

**Output**:
```typescript
{
  results: Array<{
    file: string;
    line: number;
    code: string;
    type: string;
    name: string;
    score: number;
    context?: string;
    language?: string;
  }>;
  query: string;
  totalResults: number;
  searchTime: number;
}
```

**Example**:
```json
{
  "query": "function that validates email addresses",
  "limit": 5,
  "threshold": 0.75,
  "fileTypes": [".ts", ".js"]
}
```

### `indexing_status`

Get current indexing status and progress.

**Input Schema**:
```typescript
{
  detailed?: boolean;  // Optional: Include per-file details (default: false)
}
```

**Output**:
```typescript
{
  status: 'standby' | 'indexing' | 'indexed' | 'error';
  statusIcon: string;
  progress: {
    percentage: number;
    filesProcessed: number;
    filesTotal: number;
    currentFile?: string;
  };
  stats: {
    totalBlocks: number;
    totalVectors: number;
    languages: Record<string, number>;
    lastIndexed?: string;
    indexingTime?: number;
  };
  errors?: Array<{
    file: string;
    error: string;
    timestamp: string;
  }>;
}
```

### `reindex`

Trigger reindexing of the codebase.

**Input Schema**:
```typescript
{
  mode?: 'incremental' | 'full';  // Optional: Indexing mode (default: 'incremental')
  paths?: string[];               // Optional: Specific paths to reindex
  force?: boolean;                // Optional: Force reindex (default: false)
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  mode: string;
  filesQueued: number;
}
```

### `configure_indexer`

Update server configuration at runtime.

**Input Schema**:
```typescript
{
  provider?: 'gemini' | 'openai' | 'ollama';
  providerConfig?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    dimensions?: number;
  };
  qdrantConfig?: {
    url?: string;
    apiKey?: string;
    collectionName?: string;
  };
  indexingConfig?: {
    batchSize?: number;
    concurrency?: number;
    maxFileSize?: number;
  };
  searchConfig?: {
    enableCache?: boolean;
    cacheSize?: number;
    cacheTTL?: number;
  };
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  restartRequired: boolean;
}
```

### `clear_index`

Remove all indexed data and reset the collection.

**Input Schema**:
```typescript
{
  confirm: boolean;  // Required: Must be true to proceed
}
```

**Output**:
```typescript
{
  success: boolean;
  message: string;
  vectorsDeleted: number;
}
```

### `validate_config`

Validate configuration and test connections.

**Input Schema**:
```typescript
{
  component?: 'all' | 'qdrant' | 'embedder';  // Optional: Component to validate (default: 'all')
}
```

**Output**:
```typescript
{
  valid: boolean;
  checks: {
    qdrant?: {
      connected: boolean;
      collections: number;
      error?: string;
    };
    embedder?: {
      available: boolean;
      model?: string;
      error?: string;
    };
    config?: {
      valid: boolean;
      errors?: string[];
    };
  };
}
```

---

## Parser API

### CodeParser

Main parser class that orchestrates different parsing strategies.

```typescript
import { CodeParser } from './parser/index.js';

const parser = new CodeParser({
  maxFileSize: 1048576,      // 1MB
  excludeBinaries: true,
  excludeImages: true,
  fallbackChunking: true,
  markdownHeaderParsing: true,
  chunkSize: 512,
  chunkOverlap: 50,
});
```

#### Methods

##### `parseFile(filePath: string): Promise<ParseResult>`

Parse a file and extract code blocks.

**Parameters**:
- `filePath` - Absolute path to the file

**Returns**: `ParseResult` containing blocks, language, and any errors

**Example**:
```typescript
const result = await parser.parseFile('/path/to/file.ts');
console.log(`Found ${result.blocks.length} blocks`);
```

### Tree-sitter Parser

Low-level tree-sitter parsing for supported languages.

```typescript
import { treeSitterParser } from './parser/tree-sitter.js';

const blocks = await treeSitterParser.parse(
  '/path/to/file.ts',
  content,
  'typescript'
);
```

#### Methods

##### `parse(filePath: string, content: string, language: string): Promise<CodeBlock[]>`

Parse content using tree-sitter.

**Parameters**:
- `filePath` - File path for IDs
- `content` - File content to parse
- `language` - Programming language

**Returns**: Array of code blocks

##### `isLanguageSupported(language: string): boolean`

Check if a language is supported by tree-sitter.

**Parameters**:
- `language` - Language name

**Returns**: `true` if supported

### Markdown Parser

Parse markdown files into sections.

```typescript
import { markdownParser } from './parser/markdown-parser.js';

const blocks = markdownParser.parse('/path/to/file.md', content);
const headings = markdownParser.extractHeadings(content);
```

#### Methods

##### `parse(filePath: string, content: string): CodeBlock[]`

Parse markdown into header-based sections.

**Returns**: Array of markdown section blocks

##### `extractHeadings(content: string): Array<{ level: number; title: string; line: number }>`

Extract just the headings for quick overview.

**Returns**: Array of heading metadata

---

## Embeddings API

### EmbeddingProvider Interface

All embedding providers implement this interface:

```typescript
interface EmbeddingProvider {
  readonly name: string;
  readonly defaultDimensions: number;

  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[], options?: BatchOptions): Promise<number[][]>;
  healthCheck(): Promise<HealthStatus>;
}
```

### Creating Providers

```typescript
import { createEmbeddingProvider } from './embeddings/index.js';

// Gemini
const gemini = createEmbeddingProvider('gemini', {
  apiKey: 'your_key',
  model: 'text-embedding-004',
  dimensions: 768,
});

// OpenAI
const openai = createEmbeddingProvider('openai', {
  apiKey: 'your_key',
  model: 'text-embedding-3-small',
  dimensions: 1536,
});

// Ollama
const ollama = createEmbeddingProvider('ollama', {
  baseUrl: 'http://localhost:11434',
  model: 'nomic-embed-text',
  dimensions: 768,
});
```

### Methods

##### `embed(text: string): Promise<number[]>`

Generate embedding for a single text.

**Parameters**:
- `text` - Text to embed

**Returns**: Embedding vector

**Example**:
```typescript
const vector = await provider.embed('function validateEmail');
console.log(vector.length); // 768 or 1536 depending on model
```

##### `embedBatch(texts: string[], options?: { batchSize?: number }): Promise<number[][]>`

Generate embeddings for multiple texts.

**Parameters**:
- `texts` - Array of texts
- `options.batchSize` - Batch size for API calls

**Returns**: Array of embedding vectors

**Example**:
```typescript
const vectors = await provider.embedBatch([
  'function foo()',
  'class Bar',
  'const x = 1'
], { batchSize: 100 });
```

##### `healthCheck(): Promise<{ available: boolean; model?: string; error?: string }>`

Check if provider is available and configured correctly.

---

## Storage API

### Storage

Main storage class for Qdrant operations.

```typescript
import { Storage } from './storage/index.js';

const storage = new Storage({
  url: 'http://localhost:6333',
  apiKey: 'optional_api_key',
});
```

### CollectionManager

Manage Qdrant collections.

#### Methods

##### `create(config: CollectionConfig): Promise<void>`

Create a new collection.

**Parameters**:
```typescript
{
  name: string;
  vectorSize: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
}
```

##### `exists(name: string): Promise<boolean>`

Check if collection exists.

##### `delete(name: string): Promise<void>`

Delete a collection.

##### `getInfo(name: string): Promise<CollectionInfo>`

Get collection information.

**Returns**:
```typescript
{
  name: string;
  vectorCount: number;
  indexed: boolean;
  lastUpdated?: string;
}
```

### VectorStore

Manage vectors in a collection.

#### Methods

##### `upsert(collectionName: string, points: Point[]): Promise<void>`

Insert or update vectors.

**Parameters**:
```typescript
interface Point {
  id: string;
  vector: number[];
  payload: Record<string, any>;
}
```

##### `search(collectionName: string, vector: number[], options: SearchOptions): Promise<SearchResult[]>`

Search for similar vectors.

**Parameters**:
```typescript
interface SearchOptions {
  limit: number;
  threshold?: number;
  filter?: Record<string, any>;
}
```

**Returns**:
```typescript
interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}
```

##### `delete(collectionName: string, ids: string[]): Promise<void>`

Delete vectors by IDs.

##### `deleteAll(collectionName: string): Promise<number>`

Delete all vectors in collection.

**Returns**: Number of vectors deleted

---

## Search API

### Search

Semantic search with ranking and caching.

```typescript
import { Search } from './search/index.js';

const search = new Search({
  basePath: '/path/to/codebase',
  collectionName: 'my-collection',
  embedder,
  storage,
  enableCache: true,
  cacheSize: 100,
  cacheTTL: 300000,
});
```

#### Methods

##### `search(query: SearchQuery): Promise<SearchResponse>`

Perform semantic search.

**Parameters**:
```typescript
interface SearchQuery {
  query: string;
  limit?: number;
  threshold?: number;
  fileTypes?: string[];
  paths?: string[];
  languages?: string[];
  includeContext?: boolean;
  contextLines?: number;
}
```

**Returns**:
```typescript
interface SearchResponse {
  results: SearchResult[];
  query: string;
  totalResults: number;
  searchTime: number;
}
```

##### `clearCache(): void`

Clear the search cache.

---

## Configuration

### Config Schema

```typescript
interface Config {
  codebase: {
    path: string;
    excludePatterns?: string[];
  };

  embedding: {
    provider: 'gemini' | 'openai' | 'ollama';
    apiKey?: string;
    baseUrl?: string;
    model: string;
    dimensions: number;
  };

  qdrant: {
    url: string;
    apiKey?: string;
    collectionName: string;
    distanceMetric: 'Cosine' | 'Euclid' | 'Dot';
  };

  indexing: {
    batchSize: number;
    concurrency: number;
    maxFileSize: number;
    autoIndex: boolean;
    enableWatcher: boolean;
    gitIntegration: boolean;
    detectBranchChange: boolean;
    watchDebounce: number;
  };

  search: {
    defaultLimit: number;
    minScore: number;
    enableCache: boolean;
    cacheSize: number;
    cacheTTL: number;
  };
}
```

### Loading Configuration

```typescript
import { loadConfig } from './config/index.js';

// Load from environment variables
const config = await loadConfig();

// Or use custom config
import { configSchema } from './config/schema.js';

const customConfig = configSchema.parse({
  // your config
});
```

---

## Type Definitions

### CodeBlock

```typescript
interface CodeBlock {
  id: string;
  file: string;
  line: number;
  endLine: number;
  code: string;
  type: CodeBlockType;
  name: string;
  language: string;
  metadata?: CodeBlockMetadata;
  hash?: string;
}

type CodeBlockType =
  | 'function'
  | 'method'
  | 'class'
  | 'interface'
  | 'type'
  | 'constant'
  | 'variable'
  | 'module'
  | 'namespace'
  | 'struct'
  | 'enum'
  | 'trait'
  | 'impl'
  | 'markdown_section'
  | 'chunk';

interface CodeBlockMetadata {
  parameters?: string[];
  returnType?: string;
  visibility?: 'public' | 'private' | 'protected' | 'internal';
  isAsync?: boolean;
  isStatic?: boolean;
  isAbstract?: boolean;
  decorators?: string[];
  comments?: string;
  complexity?: number;
  level?: number;
}
```

### SearchResult

```typescript
interface SearchResult {
  file: string;
  line: number;
  code: string;
  type: CodeBlockType;
  name: string;
  score: number;
  context?: string;
  language?: string;
  metadata?: VectorMetadata;
}
```

### IndexingStatus

```typescript
type IndexingStatus = 'standby' | 'indexing' | 'indexed' | 'error';

interface StatusInfo {
  status: IndexingStatus;
  statusIcon: string;
  progress: {
    percentage: number;
    filesProcessed: number;
    filesTotal: number;
    currentFile?: string;
  };
  stats: {
    totalBlocks: number;
    totalVectors: number;
    languages: Record<string, number>;
    lastIndexed?: string;
    indexingTime?: number;
  };
  errors?: Array<{
    file: string;
    error: string;
    timestamp: string;
  }>;
}
```

---

## Error Handling

All async methods can throw errors. Common error types:

### ParsingError

Thrown when file parsing fails.

```typescript
try {
  const result = await parser.parseFile(filePath);
} catch (error) {
  if (error instanceof ParsingError) {
    console.error(`Failed to parse ${error.filePath}: ${error.message}`);
  }
}
```

### StorageError

Thrown when Qdrant operations fail.

```typescript
try {
  await storage.collections.create(config);
} catch (error) {
  if (error instanceof StorageError) {
    console.error('Storage error:', error.message);
  }
}
```

### EmbeddingError

Thrown when embedding generation fails.

```typescript
try {
  const vector = await embedder.embed(text);
} catch (error) {
  if (error instanceof EmbeddingError) {
    console.error('Embedding error:', error.message);
  }
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { Orchestrator } from './orchestrator.js';
import { loadConfig } from './config/index.js';

// Initialize
const config = await loadConfig();
const orch = new Orchestrator(config);
await orch.initialize();

// Search
const search = orch.getSearch();
const results = await search.search({
  query: 'authentication middleware',
  limit: 10,
});

console.log(`Found ${results.totalResults} results`);
results.results.forEach(r => {
  console.log(`${r.file}:${r.line} - ${r.name} (${r.score.toFixed(2)})`);
});
```

### Manual Indexing

```typescript
const indexer = orch.getIndexer();

// Index specific files
await indexer.indexFiles([
  '/path/to/file1.ts',
  '/path/to/file2.ts',
]);

// Get status
const status = orch.getStatusManager();
const info = await status.getStatus();
console.log(`Indexed ${info.stats.totalBlocks} blocks`);
```

### Custom Parser

```typescript
import { CodeParser } from './parser/index.js';

const parser = new CodeParser({
  maxFileSize: 2097152,  // 2MB
  fallbackChunking: true,
  chunkSize: 1024,
});

const result = await parser.parseFile('/path/to/large-file.ts');
```

---

## License

MIT - See LICENSE file for details.
