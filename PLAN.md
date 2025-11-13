# Codebase Index MCP Server - Detailed Implementation Plan

## 📋 Executive Summary

This document outlines the implementation plan for a Model Context Protocol (MCP) server that creates and maintains a semantic search index of codebases. The server will parse code using Tree-sitter, generate embeddings using multiple AI providers, store vectors in Qdrant, and provide intelligent code discovery through semantic search.

---

## 🎯 Project Goals

1. **Semantic Code Understanding**: Transform exact-match code search into meaning-based discovery
2. **Multi-Provider Support**: Support Google Gemini, OpenAI, Ollama, and OpenAI-compatible providers
3. **Flexible Storage**: Support both Qdrant Cloud (free tier) and self-hosted Qdrant Docker
4. **Real-time Status**: Provide live indexing status and progress tracking
5. **Production Ready**: Build a robust, scalable, and maintainable TypeScript solution

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Client (Claude/Roo)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol
┌─────────────────────▼───────────────────────────────────────┐
│                  MCP Server (TypeScript)                     │
│  ┌──────────────┬──────────────┬──────────────────────┐     │
│  │ Code Parser  │  Embedding   │   Vector Storage     │     │
│  │ (Tree-sitter)│  Generator   │   (Qdrant Client)    │     │
│  └──────┬───────┴──────┬───────┴──────────┬───────────┘     │
└─────────┼──────────────┼──────────────────┼─────────────────┘
          │              │                  │
          │              │                  │
    ┌─────▼─────┐  ┌────▼─────┐      ┌────▼─────┐
    │Tree-sitter│  │Embedding │      │  Qdrant  │
    │ Grammars  │  │Providers │      │ Database │
    │  (40+)    │  │(Gemini/  │      │(Cloud/   │
    │           │  │OpenAI/   │      │ Docker)  │
    │           │  │ Ollama)  │      │          │
    └───────────┘  └──────────┘      └──────────┘
```

---

## 🔧 Technology Stack

### Core Framework
- **Language**: TypeScript 5.x
- **MCP SDK**: `@modelcontextprotocol/sdk` (official TypeScript SDK)
- **Runtime**: Node.js 18+
- **Package Manager**: npm or pnpm

### Code Parsing
- **Parser**: Tree-sitter
- **Package**: `tree-sitter` + language grammars
- **Languages Supported** (Priority Order):
  1. TypeScript (`tree-sitter-typescript`)
  2. JavaScript (`tree-sitter-javascript`)
  3. Python (`tree-sitter-python`)
  4. Java (`tree-sitter-java`)
  5. Go (`tree-sitter-go`)
  6. Rust (`tree-sitter-rust`)
  7. C/C++ (`tree-sitter-c`, `tree-sitter-cpp`)
  8. C# (`tree-sitter-c-sharp`)
  9. Ruby (`tree-sitter-ruby`)
  10. PHP (`tree-sitter-php`)

### Vector Database
- **Primary**: Qdrant
- **Client**: `@qdrant/js-client-rest`
- **Deployment Options**:
  - Qdrant Cloud (free tier: 1GB storage)
  - Docker Qdrant (self-hosted, unlimited)

### Embedding Providers

#### 1. Google Gemini (Recommended - Free)
- **API**: `@google/generative-ai`
- **Model**: `text-embedding-004` or `gemini-embedding-exp-03-07`
- **Dimensions**: 768
- **Pricing**: Free (generous limits)
- **Advantages**: Best value, multilingual, excellent for code

#### 2. OpenAI
- **API**: `openai`
- **Models**:
  - `text-embedding-3-small` (1536 dimensions, $0.02/1M tokens)
  - `text-embedding-3-large` (3072 dimensions, $0.13/1M tokens)
- **Advantages**: Established, reliable, enterprise support

#### 3. Ollama (Local)
- **API**: REST API or `ollama` npm package
- **Models**:
  - `nomic-embed-text` (768 dimensions)
  - `embeddinggemma` (Google's open model)
  - `bge-small` (384 dimensions)
- **Advantages**: Free, local, privacy-focused, no API limits

#### 4. OpenAI-Compatible Providers
- **Support**: Azure OpenAI, TogetherAI, Anyscale, etc.
- **Configuration**: Custom base URL + API key

### Development Tools
- **Build**: `tsup` or `tsc`
- **Testing**: `vitest` or `jest`
- **Linting**: `eslint` + `prettier`
- **Type Checking**: TypeScript strict mode
- **File Watching**: `chokidar` (more robust than native fs.watch)

---

## 📁 Project Structure

```
mcp-codebase-index/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── server.ts                   # MCP server implementation
│   ├── config/
│   │   ├── schema.ts              # Configuration schema & validation
│   │   └── defaults.ts            # Default configuration values
│   ├── parser/
│   │   ├── index.ts               # Parser orchestrator
│   │   ├── tree-sitter.ts         # Tree-sitter integration
│   │   ├── language-registry.ts   # Language grammar registry
│   │   ├── markdown-parser.ts     # Markdown header-based parsing
│   │   ├── fallback-chunker.ts    # Line-based chunking fallback
│   │   ├── extractors/
│   │   │   ├── base.ts            # Base extractor interface
│   │   │   ├── typescript.ts      # TypeScript/JavaScript extractor
│   │   │   ├── python.ts          # Python extractor
│   │   │   ├── java.ts            # Java extractor
│   │   │   └── ...                # Other language extractors
│   │   └── types.ts               # Parser types
│   ├── embeddings/
│   │   ├── index.ts               # Embedding provider factory
│   │   ├── base.ts                # Base provider interface
│   │   ├── gemini.ts              # Google Gemini provider
│   │   ├── openai.ts              # OpenAI provider
│   │   ├── ollama.ts              # Ollama provider
│   │   ├── openai-compatible.ts   # Generic OpenAI-compatible
│   │   └── types.ts               # Embedding types
│   ├── storage/
│   │   ├── index.ts               # Storage orchestrator
│   │   ├── qdrant-client.ts       # Qdrant client wrapper
│   │   ├── collection-manager.ts  # Collection lifecycle
│   │   ├── vector-store.ts        # Vector operations
│   │   └── types.ts               # Storage types
│   ├── indexer/
│   │   ├── index.ts               # Main indexer
│   │   ├── file-watcher.ts        # File system watcher
│   │   ├── indexing-queue.ts      # Task queue management
│   │   ├── batch-processor.ts     # Batch processing logic
│   │   ├── incremental-indexer.ts # Incremental updates
│   │   └── types.ts               # Indexer types
│   ├── search/
│   │   ├── index.ts               # Search orchestrator
│   │   ├── semantic-search.ts     # Vector similarity search
│   │   ├── hybrid-search.ts       # Hybrid (vector + keyword)
│   │   ├── result-ranker.ts       # Result ranking/reranking
│   │   └── types.ts               # Search types
│   ├── status/
│   │   ├── index.ts               # Status manager
│   │   ├── progress-tracker.ts    # Progress calculation
│   │   ├── state-machine.ts       # Status state machine
│   │   └── types.ts               # Status types
│   ├── tools/
│   │   ├── codebase-search.ts     # MCP search tool
│   │   ├── indexing-status.ts     # MCP status tool
│   │   ├── reindex.ts             # MCP reindex tool
│   │   └── types.ts               # Tool types
│   ├── utils/
│   │   ├── logger.ts              # Logging utility
│   │   ├── errors.ts              # Custom error classes
│   │   ├── file-utils.ts          # File operations
│   │   ├── file-filter.ts         # .gitignore + .mcpignore handling
│   │   ├── file-hash.ts           # Content hashing for cache
│   │   ├── git-utils.ts           # Git branch detection
│   │   ├── retry.ts               # Retry logic
│   │   └── cache.ts               # Caching utilities
│   └── types/
│       ├── index.ts               # Global type exports
│       ├── mcp.ts                 # MCP-specific types
│       └── models.ts              # Domain models
├── tests/
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── fixtures/                  # Test fixtures
├── scripts/
│   ├── setup-qdrant.ts           # Qdrant setup script
│   ├── test-indexing.ts          # Manual testing script
│   └── benchmark.ts              # Performance benchmarking
├── .env.example                   # Environment variables template
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
└── PLAN.md                        # This document
```

---

## 🔌 MCP Tools & Resources

### Tools (Exposed to MCP Clients)

#### 1. `codebase_search`
**Purpose**: Semantic search across the indexed codebase

**Input Schema**:
```typescript
{
  query: string;           // Natural language or code query
  limit?: number;          // Max results (default: 10)
  threshold?: number;      // Similarity threshold (0-1, default: 0.7)
  fileTypes?: string[];    // Filter by file extensions
  paths?: string[];        // Filter by paths
  includeContext?: boolean; // Include surrounding code
}
```

**Output Schema**:
```typescript
{
  results: Array<{
    file: string;          // File path
    line: number;          // Line number
    code: string;          // Code snippet
    type: string;          // Block type (function/class/method)
    name: string;          // Symbol name
    score: number;         // Similarity score (0-1)
    context?: string;      // Surrounding code
  }>;
  totalResults: number;
  queryTime: number;       // ms
}
```

#### 2. `indexing_status`
**Purpose**: Get current indexing status and progress

**Input Schema**:
```typescript
{
  detailed?: boolean;      // Include per-file details
}
```

**Output Schema**:
```typescript
{
  status: 'indexed' | 'indexing' | 'error' | 'standby';
  statusIcon: '🟢' | '🟡' | '🔴' | '⚪';
  progress: {
    percentage: number;    // 0-100
    filesProcessed: number;
    filesTotal: number;
    currentFile?: string;
  };
  stats: {
    totalBlocks: number;
    totalVectors: number;
    languages: Record<string, number>;
    lastIndexed: string;   // ISO timestamp
    indexingTime: number;  // ms
  };
  errors?: Array<{
    file: string;
    error: string;
    timestamp: string;
  }>;
}
```

#### 3. `reindex`
**Purpose**: Trigger full or partial reindexing

**Input Schema**:
```typescript
{
  mode: 'full' | 'incremental' | 'file';
  paths?: string[];        // Specific files/folders
  force?: boolean;         // Force reindex even if unchanged
}
```

**Output Schema**:
```typescript
{
  success: boolean;
  message: string;
  filesQueued: number;
}
```

#### 4. `configure_indexer`
**Purpose**: Update indexer configuration

**Input Schema**:
```typescript
{
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
  validate?: boolean;        // Test connection on config change
}
```

#### 5. `clear_index`
**Purpose**: Clear all indexed data and reset

**Input Schema**:
```typescript
{
  confirm: boolean;          // Safety confirmation
  workspace?: string;        // Specific workspace or all
}
```

**Output Schema**:
```typescript
{
  success: boolean;
  message: string;
  collectionsDeleted: number;
  cacheCleared: boolean;
}
```

#### 6. `validate_config`
**Purpose**: Test configuration without indexing

**Input Schema**:
```typescript
{
  component?: 'qdrant' | 'embedder' | 'all';
}
```

**Output Schema**:
```typescript
{
  valid: boolean;
  qdrant?: {
    connected: boolean;
    version?: string;
    latency?: number;
  };
  embedder?: {
    available: boolean;
    model?: string;
    testEmbedding?: boolean;
  };
  errors?: string[];
}
```

### Resources (Exposed to MCP Clients)

#### 1. `config://current`
- Current configuration state

#### 2. `stats://indexing`
- Real-time indexing statistics

#### 3. `logs://recent`
- Recent indexing logs

---

## ⚙️ Configuration Schema

### Environment Variables (`.env`)

```bash
# Embedding Provider (gemini|openai|ollama|openai-compatible)
EMBEDDING_PROVIDER=gemini

# Google Gemini
GEMINI_API_KEY=your_api_key_here

# OpenAI
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=text-embedding-3-small  # or text-embedding-3-large

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=nomic-embed-text

# OpenAI-Compatible
OPENAI_COMPATIBLE_BASE_URL=https://api.together.xyz/v1
OPENAI_COMPATIBLE_API_KEY=your_api_key_here
OPENAI_COMPATIBLE_MODEL=togethercomputer/m2-bert-80M-8k-retrieval

# Qdrant
QDRANT_URL=http://localhost:6333  # or https://xyz.cloud.qdrant.io
QDRANT_API_KEY=your_api_key_here  # optional for local

# Indexing Configuration
INDEX_BATCH_SIZE=50
INDEX_CONCURRENCY=5
INDEX_EXCLUDE_PATTERNS=node_modules,.git,dist,build,*.test.ts
INDEX_MAX_FILE_SIZE=1048576  # 1MB in bytes
INDEX_RESPECT_GITIGNORE=true
INDEX_USE_MCPIGNORE=true

# Git Integration
GIT_WATCH_BRANCHES=true      # Reindex on branch switch
GIT_AUTO_DETECT_CHANGES=true

# Logging
LOG_LEVEL=info  # debug|info|warn|error
```

### Configuration File (`codebase-index.config.json`)

```json
{
  "version": "1.0",
  "embedding": {
    "provider": "gemini",
    "dimensions": 768,
    "chunkSize": 512,
    "chunkOverlap": 50
  },
  "qdrant": {
    "collectionName": "codebase-index",
    "distanceMetric": "Cosine",
    "optimizationConfig": {
      "vectorsPerSegment": 100000
    }
  },
  "indexing": {
    "languages": [
      "typescript",
      "javascript",
      "python",
      "java",
      "go",
      "rust"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/*.min.js",
      "**/*.test.*",
      "**/*.spec.*"
    ],
    "include": [
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
      "**/*.py",
      "**/*.java",
      "**/*.go",
      "**/*.rs",
      "**/*.md"
    ],
    "batchSize": 50,
    "concurrency": 5,
    "maxFileSize": 1048576,
    "respectGitignore": true,
    "useMcpignore": true,
    "autoIndex": true,
    "watchFiles": true,
    "watchBranches": true,
    "fallbackChunking": true,
    "markdownHeaderParsing": true,
    "excludeBinaries": true,
    "excludeImages": true
  },
  "search": {
    "defaultLimit": 10,
    "minScore": 0.7,
    "includeContext": true,
    "contextLines": 5,
    "searchMode": "all-folders",
    "perFolderCollections": true
  },
  "multiWorkspace": {
    "enabled": true,
    "independentIndexing": true,
    "aggregateStatus": true
  }
}
```

---

## 🔄 Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Set up project infrastructure and core MCP server

**Tasks**:
1. Initialize TypeScript project with MCP SDK
2. Set up development environment (ESLint, Prettier, testing)
3. Implement basic MCP server with stdio transport
4. Create configuration schema and validation
5. Set up logging and error handling utilities
6. Create basic project structure

**Deliverables**:
- ✅ Working MCP server that can be connected to Claude
- ✅ Configuration loading and validation
- ✅ Basic logging infrastructure

### Phase 2: Code Parsing (Week 2)
**Goal**: Implement Tree-sitter integration for code parsing

**Tasks**:
1. Set up Tree-sitter with TypeScript bindings
2. Implement language registry and grammar loading
3. Create base extractor interface
4. Implement TypeScript/JavaScript extractor
5. Implement Python extractor
6. **NEW**: Implement Markdown parser (header-based chunking)
7. **NEW**: Implement fallback line-based chunker for unsupported files
8. Create AST traversal and semantic block extraction
9. Add metadata extraction (function names, parameters, return types)
10. Implement file scanning and language detection
11. **NEW**: Add file size validation (max 1MB default)
12. **NEW**: Add binary/image file detection and exclusion
13. **NEW**: Implement .gitignore and .mcpignore filtering

**Deliverables**:
- ✅ Parse TypeScript/JavaScript files into semantic blocks
- ✅ Parse Python files into semantic blocks
- ✅ Parse Markdown files by headers
- ✅ Fallback chunking for unsupported file types
- ✅ Extract functions, classes, methods with metadata
- ✅ Handle syntax errors gracefully
- ✅ Respect .gitignore and .mcpignore
- ✅ Skip large files (>1MB) with warning

**Key Challenges**:
- Tree-sitter grammar setup for multiple languages
- Determining optimal block granularity (function vs. class vs. file)
- Handling malformed or incomplete code
- **NEW**: Detecting binary files reliably
- **NEW**: Balancing fallback chunking quality vs. performance

### Phase 3: Embedding Generation (Week 2-3)
**Goal**: Implement multiple embedding providers

**Tasks**:
1. Design base embedding provider interface
2. Implement Google Gemini provider
3. Implement OpenAI provider
4. Implement Ollama provider
5. Implement OpenAI-compatible provider
6. Add retry logic and rate limiting
7. Implement embedding caching
8. Add batch processing for embeddings
9. Create provider health checks

**Deliverables**:
- ✅ Generate embeddings using Gemini (free)
- ✅ Generate embeddings using OpenAI
- ✅ Generate embeddings using Ollama (local)
- ✅ Graceful fallback and error handling
- ✅ Configurable provider switching

**Key Challenges**:
- API rate limits and quotas
- Handling different embedding dimensions
- Retry logic for network failures
- Cost optimization for paid providers

### Phase 4: Vector Storage (Week 3)
**Goal**: Implement Qdrant integration for vector storage

**Tasks**:
1. Set up Qdrant client wrapper
2. Implement collection creation and management
3. Implement vector upsert operations
4. Add batch processing for vector storage
5. Implement collection schema versioning
6. Add data migration utilities
7. Implement collection health monitoring
8. Add connection pooling and retry logic

**Deliverables**:
- ✅ Store vectors in Qdrant (Cloud or Docker)
- ✅ Batch upsert operations
- ✅ Collection lifecycle management
- ✅ Connection error handling

**Key Challenges**:
- Collection schema design (metadata fields)
- Optimizing batch sizes for performance
- Handling Qdrant version compatibility
- Managing connection state

### Phase 5: Indexing Engine (Week 4)
**Goal**: Build the core indexing engine

**Tasks**:
1. Implement indexing queue with priority
2. Create batch processor with concurrency control
3. **NEW**: Integrate `chokidar` for robust file watching
4. Add incremental indexing (delta updates)
5. **NEW**: Implement git branch change detection
6. **NEW**: Auto-reindex on branch switch (configurable)
7. Implement deduplication logic
8. Add indexing state persistence
9. Create error recovery and retry mechanisms
10. Implement progress tracking
11. Add indexing statistics collection
12. **NEW**: Implement per-folder/workspace collection management

**Deliverables**:
- ✅ Full codebase indexing
- ✅ Incremental updates on file changes
- ✅ Git branch-aware indexing
- ✅ Per-workspace collection isolation
- ✅ Progress tracking and status reporting
- ✅ Error recovery and resumption

**Key Challenges**:
- Detecting file changes efficiently
- Handling large codebases (100k+ files)
- Managing indexing queue priority
- Optimizing batch sizes for speed vs. memory
- **NEW**: Detecting git branch switches reliably
- **NEW**: Managing multiple workspace collections

### Phase 6: Search Implementation (Week 4-5)
**Goal**: Implement semantic search functionality

**Tasks**:
1. Implement query embedding generation
2. Create vector similarity search
3. Add metadata filtering (file type, path, language)
4. **NEW**: Implement per-folder vs. all-folders search modes
5. Implement result ranking and scoring
6. Add context extraction (surrounding code)
7. Implement hybrid search (vector + keyword)
8. Add search result caching
9. Optimize search performance
10. **NEW**: Add configurable search thresholds per query

**Deliverables**:
- ✅ Semantic search with natural language queries
- ✅ Filtered search (by language, path, etc.)
- ✅ Per-workspace and cross-workspace search
- ✅ Result ranking and scoring
- ✅ Code context in results
- ✅ Configurable similarity thresholds

**Key Challenges**:
- Balancing precision vs. recall
- Determining optimal similarity threshold
- Extracting meaningful context
- Handling ambiguous queries
- **NEW**: Merging and ranking results across multiple collections

### Phase 7: Status Management (Week 5)
**Goal**: Implement comprehensive status tracking

**Tasks**:
1. Design status state machine
2. Implement progress calculation
3. Create status event emitter
4. Add error tracking and reporting
5. Implement status icons and colors
6. Create status persistence
7. Add multi-workspace support
8. Implement status aggregation

**Deliverables**:
- ✅ Real-time status updates (🟢🟡🔴⚪)
- ✅ Progress percentage calculation
- ✅ Error tracking and display
- ✅ Multi-workspace status

### Phase 8: MCP Tools Integration (Week 5-6)
**Goal**: Expose functionality as MCP tools

**Tasks**:
1. Implement `codebase_search` tool
2. Implement `indexing_status` tool
3. Implement `reindex` tool
4. Implement `configure_indexer` tool
5. **NEW**: Implement `clear_index` tool
6. **NEW**: Implement `validate_config` tool
7. Add input validation for all tools
8. Implement tool error handling
9. Add tool usage examples
10. Create tool documentation
11. **NEW**: Add real-time validation for configure_indexer

**Deliverables**:
- ✅ All 6 MCP tools functional and tested
- ✅ Input/output validation
- ✅ Real-time config validation
- ✅ Error messages and user feedback
- ✅ Tool documentation

### Phase 9: Testing & Optimization (Week 6-7)
**Goal**: Comprehensive testing and performance optimization

**Tasks**:
1. Write unit tests for all components
2. Write integration tests for workflows
3. Add end-to-end tests with real codebases
4. **NEW**: Test edge cases:
   - Large files (>1MB)
   - Binary/image files
   - Unsupported file types (fallback chunking)
   - Git branch switches
   - Multi-workspace scenarios
   - Markdown parsing
   - Malformed code
5. Performance benchmarking
6. Memory usage optimization
7. Indexing speed optimization
8. Search latency optimization
9. Error handling improvements
10. Code review and refactoring

**Deliverables**:
- ✅ 80%+ code coverage
- ✅ Edge case handling verified
- ✅ Performance benchmarks
- ✅ Optimization report
- ✅ Clean, maintainable code

### Phase 10: Documentation & Release (Week 7-8)
**Goal**: Production-ready release

**Tasks**:
1. Write comprehensive README
2. Create setup guide
3. Write API documentation
4. Create troubleshooting guide
5. Add usage examples
6. Create video tutorial (optional)
7. Prepare release notes
8. Publish to npm
9. Create GitHub releases
10. Community outreach

**Deliverables**:
- ✅ Complete documentation
- ✅ Published npm package
- ✅ GitHub release
- ✅ Example projects

---

## 🔄 Implementation Flow

This section provides a practical, step-by-step guide for implementing the MCP Codebase Index server.

### Prerequisites

Before starting implementation:

1. **Development Environment**:
   ```bash
   node --version  # v18+ required
   npm --version   # v9+ required
   git --version   # v2.30+ recommended
   ```

2. **External Services**:
   - [ ] Qdrant instance (Docker or Cloud)
   - [ ] Embedding provider API key (Gemini/OpenAI/Ollama)

3. **Knowledge Requirements**:
   - TypeScript fundamentals
   - Async/await patterns
   - Node.js streams and file I/O
   - Basic understanding of vector embeddings

---

### Step 1: Project Setup (Day 1)

#### 1.1 Initialize Project

```bash
# Create project directory
mkdir mcp-codebase-index
cd mcp-codebase-index

# Initialize npm project
npm init -y

# Initialize git
git init
echo "node_modules/\n.env\ndist/\n*.log" > .gitignore

# Initialize TypeScript
npm install -D typescript @types/node
npx tsc --init --target ES2022 --module NodeNext --moduleResolution NodeNext --strict
```

#### 1.2 Install Core Dependencies

```bash
# MCP SDK
npm install @modelcontextprotocol/sdk

# Tree-sitter and grammars
npm install tree-sitter web-tree-sitter
npm install tree-sitter-typescript tree-sitter-javascript tree-sitter-python

# Qdrant client
npm install @qdrant/js-client-rest

# Embedding providers
npm install @google/generative-ai openai

# Utilities
npm install chokidar dotenv zod

# Development
npm install -D @types/node tsx vitest eslint prettier
```

#### 1.3 Create Project Structure

```bash
mkdir -p src/{config,parser/{extractors},embeddings,storage,indexer,search,status,tools,utils,types}
mkdir -p tests/{unit,integration,fixtures}
mkdir -p scripts
```

#### 1.4 Setup Configuration Files

Create `.env.example`:
```bash
cat > .env.example << 'EOF'
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=
QDRANT_URL=http://localhost:6333
INDEX_BATCH_SIZE=50
INDEX_CONCURRENCY=5
LOG_LEVEL=info
EOF
```

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

### Step 2: Core Infrastructure (Days 2-3)

#### 2.1 Configuration Manager (`src/config/schema.ts`)

```typescript
import { z } from 'zod';

export const configSchema = z.object({
  embedding: z.object({
    provider: z.enum(['gemini', 'openai', 'ollama', 'openai-compatible']),
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
    model: z.string().optional(),
    dimensions: z.number().int().positive(),
  }),
  qdrant: z.object({
    url: z.string().url(),
    apiKey: z.string().optional(),
    collectionName: z.string().default('codebase-index'),
  }),
  indexing: z.object({
    batchSize: z.number().int().positive().default(50),
    concurrency: z.number().int().positive().default(5),
    maxFileSize: z.number().int().positive().default(1048576),
  }),
});

export type Config = z.infer<typeof configSchema>;
```

#### 2.2 Logging Utility (`src/utils/logger.ts`)

```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  constructor(private level: LogLevel = LogLevel.INFO) {}

  debug(message: string, ...args: any[]) {
    if (this.level <= LogLevel.DEBUG) console.debug(`[DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: any[]) {
    if (this.level <= LogLevel.INFO) console.info(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    if (this.level <= LogLevel.WARN) console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: any[]) {
    if (this.level <= LogLevel.ERROR) console.error(`[ERROR] ${message}`, ...args);
  }
}

export const logger = new Logger();
```

#### 2.3 Basic MCP Server (`src/index.ts`)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from './utils/logger.js';

async function main() {
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

  // Tool handlers will be added here

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP Codebase Index server started');
}

main().catch(console.error);
```

**Test it**:
```bash
npx tsx src/index.ts
# Should start without errors
```

---

### Step 3: Parser Module (Days 4-7)

#### 3.1 Language Registry (`src/parser/language-registry.ts`)

```typescript
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';

export class LanguageRegistry {
  private parsers = new Map<string, Parser>();

  constructor() {
    this.registerLanguage('typescript', TypeScript.typescript);
    this.registerLanguage('javascript', JavaScript);
    this.registerLanguage('python', Python);
  }

  private registerLanguage(name: string, grammar: any) {
    const parser = new Parser();
    parser.setLanguage(grammar);
    this.parsers.set(name, parser);
  }

  getParser(language: string): Parser | undefined {
    return this.parsers.get(language);
  }

  detectLanguage(filePath: string): string | undefined {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
    };
    return languageMap[ext || ''];
  }
}
```

#### 3.2 Base Extractor (`src/parser/extractors/base.ts`)

```typescript
export interface CodeBlock {
  type: 'function' | 'class' | 'method';
  name: string;
  code: string;
  lineStart: number;
  lineEnd: number;
  signature?: string;
  docstring?: string;
}

export interface Extractor {
  extract(sourceCode: string, filePath: string): Promise<CodeBlock[]>;
}
```

#### 3.3 TypeScript Extractor (`src/parser/extractors/typescript.ts`)

```typescript
import Parser from 'tree-sitter';
import { Extractor, CodeBlock } from './base.js';

export class TypeScriptExtractor implements Extractor {
  constructor(private parser: Parser) {}

  async extract(sourceCode: string, filePath: string): Promise<CodeBlock[]> {
    const tree = this.parser.parse(sourceCode);
    const blocks: CodeBlock[] = [];

    const traverse = (node: Parser.SyntaxNode) => {
      // Extract functions
      if (node.type === 'function_declaration') {
        blocks.push({
          type: 'function',
          name: node.childForFieldName('name')?.text || 'anonymous',
          code: node.text,
          lineStart: node.startPosition.row + 1,
          lineEnd: node.endPosition.row + 1,
        });
      }

      // Extract classes
      if (node.type === 'class_declaration') {
        blocks.push({
          type: 'class',
          name: node.childForFieldName('name')?.text || 'anonymous',
          code: node.text,
          lineStart: node.startPosition.row + 1,
          lineEnd: node.endPosition.row + 1,
        });
      }

      // Recurse
      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(tree.rootNode);
    return blocks;
  }
}
```

**Test parser**:
```bash
# Create test file: tests/unit/parser.test.ts
npm run test
```

---

### Step 4: Embedding Providers (Days 8-10)

#### 4.1 Base Provider (`src/embeddings/base.ts`)

```typescript
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}
```

#### 4.2 Gemini Provider (`src/embeddings/gemini.ts`)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmbeddingProvider } from './base.js';

export class GeminiProvider implements EmbeddingProvider {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.model.embedContent(text);
    return result.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results = await Promise.all(texts.map(t => this.embed(t)));
    return results;
  }

  getDimensions(): number {
    return 768;
  }
}
```

**Test embedding**:
```bash
# Create simple test script
npx tsx scripts/test-embedding.ts
```

---

### Step 5: Vector Storage (Days 11-13)

#### 5.1 Qdrant Client (`src/storage/qdrant-client.ts`)

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

export class QdrantStorage {
  private client: QdrantClient;

  constructor(url: string, apiKey?: string) {
    this.client = new QdrantClient({ url, apiKey });
  }

  async createCollection(name: string, dimension: number) {
    await this.client.createCollection(name, {
      vectors: { size: dimension, distance: 'Cosine' },
    });
  }

  async upsert(collectionName: string, points: any[]) {
    await this.client.upsert(collectionName, { points });
  }

  async search(collectionName: string, vector: number[], limit: number = 10) {
    return await this.client.search(collectionName, {
      vector,
      limit,
      with_payload: true,
    });
  }
}
```

**Test Qdrant**:
```bash
# Start Qdrant in Docker
docker run -p 6333:6333 qdrant/qdrant

# Test connection
npx tsx scripts/test-qdrant.ts
```

---

### Step 6: Indexing Engine (Days 14-17)

#### 6.1 Simple Indexer (`src/indexer/index.ts`)

```typescript
import { LanguageRegistry } from '../parser/language-registry.js';
import { EmbeddingProvider } from '../embeddings/base.js';
import { QdrantStorage } from '../storage/qdrant-client.js';
import { glob } from 'glob';

export class Indexer {
  constructor(
    private registry: LanguageRegistry,
    private embedder: EmbeddingProvider,
    private storage: QdrantStorage
  ) {}

  async indexDirectory(directory: string) {
    // Find all files
    const files = await glob(`${directory}/**/*.{ts,js,py}`, {
      ignore: ['**/node_modules/**', '**/.git/**'],
    });

    console.log(`Found ${files.length} files to index`);

    for (const file of files) {
      await this.indexFile(file);
    }
  }

  private async indexFile(filePath: string) {
    // Detect language
    const language = this.registry.detectLanguage(filePath);
    if (!language) return;

    const parser = this.registry.getParser(language);
    if (!parser) return;

    // Read file
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse and extract blocks
    const extractor = /* get appropriate extractor */;
    const blocks = await extractor.extract(content, filePath);

    // Generate embeddings and store
    for (const block of blocks) {
      const embedding = await this.embedder.embed(block.code);
      await this.storage.upsert('codebase-index', [{
        id: `${filePath}:${block.lineStart}`,
        vector: embedding,
        payload: {
          file: filePath,
          type: block.type,
          name: block.name,
          code: block.code,
          lineStart: block.lineStart,
          lineEnd: block.lineEnd,
        },
      }]);
    }

    console.log(`Indexed ${filePath}: ${blocks.length} blocks`);
  }
}
```

---

### Step 7: MCP Tools (Days 18-20)

#### 7.1 Search Tool (`src/tools/codebase-search.ts`)

```typescript
export const codebaseSearchTool = {
  name: 'codebase_search',
  description: 'Search the codebase using semantic search',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      limit: { type: 'number', description: 'Max results', default: 10 },
    },
    required: ['query'],
  },
};

export async function handleCodebaseSearch(args: any) {
  const { query, limit = 10 } = args;

  // Generate query embedding
  const queryVector = await embedder.embed(query);

  // Search Qdrant
  const results = await storage.search('codebase-index', queryVector, limit);

  // Format results
  return {
    results: results.map(r => ({
      file: r.payload.file,
      code: r.payload.code,
      score: r.score,
      line: r.payload.lineStart,
    })),
  };
}
```

#### 7.2 Register Tools in Server

```typescript
// In src/index.ts
server.setRequestHandler('tools/list', async () => ({
  tools: [
    codebaseSearchTool,
    indexingStatusTool,
    reindexTool,
  ],
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'codebase_search') {
    return await handleCodebaseSearch(args);
  }
  // ... other tools
});
```

---

### Step 8: Testing & Validation (Days 21-25)

#### 8.1 Unit Tests

```typescript
// tests/unit/parser.test.ts
import { describe, it, expect } from 'vitest';
import { TypeScriptExtractor } from '../../src/parser/extractors/typescript';

describe('TypeScriptExtractor', () => {
  it('should extract functions', async () => {
    const code = `
      function hello() {
        console.log('Hello');
      }
    `;

    const extractor = new TypeScriptExtractor(/* parser */);
    const blocks = await extractor.extract(code, 'test.ts');

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('function');
    expect(blocks[0].name).toBe('hello');
  });
});
```

#### 8.2 Integration Test

```bash
# Create test repository
mkdir test-repo
cd test-repo
echo "function test() { return 42; }" > index.ts

# Index it
npx tsx ../src/cli.ts index ./test-repo

# Search it
npx tsx ../src/cli.ts search "test function"
```

---

### Step 9: Documentation (Days 26-28)

#### 9.1 README.md

Create comprehensive README with:
- Quick start guide
- Installation instructions
- Configuration examples
- Usage examples
- Troubleshooting

#### 9.2 API Documentation

Generate TypeDoc or document manually:
```bash
npm install -D typedoc
npx typedoc --out docs src
```

---

### Step 10: Package & Release (Days 29-30)

#### 10.1 Prepare package.json

```json
{
  "name": "mcp-codebase-index",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "bin": {
    "mcp-codebase-index": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "prepublishOnly": "npm run build"
  }
}
```

#### 10.2 Build and Test

```bash
npm run build
npm test
npm pack  # Test package locally
```

#### 10.3 Publish

```bash
npm login
npm publish
```

---

### Implementation Checklist

Use this checklist to track progress:

**Phase 1: Foundation**
- [ ] Project initialized
- [ ] Dependencies installed
- [ ] Configuration system working
- [ ] Basic MCP server responds
- [ ] Logging utility functional

**Phase 2: Parser**
- [ ] Language registry implemented
- [ ] TypeScript extractor working
- [ ] Python extractor working
- [ ] Markdown parser implemented
- [ ] Fallback chunker implemented
- [ ] File filtering (.gitignore, .mcpignore)

**Phase 3: Embeddings**
- [ ] Gemini provider working
- [ ] OpenAI provider working
- [ ] Ollama provider working
- [ ] Batch processing implemented
- [ ] Error handling and retries

**Phase 4: Storage**
- [ ] Qdrant client connected
- [ ] Collection creation working
- [ ] Vector upsert functional
- [ ] Search queries working

**Phase 5: Indexing**
- [ ] File discovery working
- [ ] Parse → Embed → Store pipeline
- [ ] Batch processing
- [ ] Progress tracking
- [ ] Error handling
- [ ] Incremental updates
- [ ] Git branch detection

**Phase 6: Search**
- [ ] Query embedding generation
- [ ] Vector search working
- [ ] Result ranking
- [ ] Context extraction
- [ ] Filters (path, language, etc.)

**Phase 7: MCP Tools**
- [ ] codebase_search tool
- [ ] indexing_status tool
- [ ] reindex tool
- [ ] configure_indexer tool
- [ ] clear_index tool
- [ ] validate_config tool

**Phase 8: Testing**
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] Performance benchmarks
- [ ] Edge case handling

**Phase 9: Documentation**
- [ ] README.md
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] Usage examples

**Phase 10: Release**
- [ ] npm package published
- [ ] GitHub release created
- [ ] Example projects

---

## 📐 Development Guidelines

### Code Style & Conventions

#### 1. TypeScript Best Practices

```typescript
// ✅ GOOD: Use explicit types
function processFile(filePath: string): Promise<CodeBlock[]> {
  // ...
}

// ❌ BAD: Implicit any
function processFile(filePath) {
  // ...
}

// ✅ GOOD: Use interfaces for structured data
interface SearchResult {
  file: string;
  score: number;
  code: string;
}

// ❌ BAD: Using any or unknown without narrowing
const results: any[] = await search();
```

#### 2. Async/Await Patterns

```typescript
// ✅ GOOD: Proper error handling
async function indexFile(path: string): Promise<void> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    await processContent(content);
  } catch (error) {
    logger.error(`Failed to index ${path}:`, error);
    throw new IndexingError(`Cannot index ${path}`, { cause: error });
  }
}

// ❌ BAD: Unhandled promise rejection
async function indexFile(path: string) {
  const content = await fs.readFile(path, 'utf-8');
  await processContent(content);  // No error handling
}

// ✅ GOOD: Parallel execution where possible
const results = await Promise.all(files.map(f => indexFile(f)));

// ❌ BAD: Sequential when parallel is possible
for (const file of files) {
  await indexFile(file);  // Slow!
}
```

#### 3. Error Handling

```typescript
// Create custom error classes
export class IndexingError extends Error {
  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = 'IndexingError';
  }
}

// Use error classes
if (!file.exists) {
  throw new IndexingError(`File not found: ${file.path}`, {
    path: file.path,
    operation: 'index',
  });
}

// Handle errors at boundaries
try {
  await indexer.run();
} catch (error) {
  if (error instanceof IndexingError) {
    logger.error('Indexing failed:', error.message, error.context);
  } else {
    logger.error('Unexpected error:', error);
  }
}
```

#### 4. Resource Management

```typescript
// ✅ GOOD: Clean up resources
async function processLargeFile(path: string) {
  const stream = fs.createReadStream(path);
  try {
    await processStream(stream);
  } finally {
    stream.close();
  }
}

// ✅ GOOD: Limit concurrent operations
import pLimit from 'p-limit';

const limit = pLimit(5);  // Max 5 concurrent
const results = await Promise.all(
  files.map(f => limit(() => indexFile(f)))
);
```

#### 5. Logging Standards

```typescript
// ✅ GOOD: Structured logging with context
logger.info('Indexing file', {
  file: filePath,
  size: stats.size,
  language,
});

// ✅ GOOD: Appropriate log levels
logger.debug('Parsed AST node', { type: node.type });  // Verbose
logger.info('File indexed successfully', { file });    // Important
logger.warn('File skipped', { file, reason });         // Attention needed
logger.error('Indexing failed', { file, error });      // Failure

// ❌ BAD: No context
logger.info('Processing...');
logger.error('Failed');
```

---

### Testing Guidelines

#### 1. Unit Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('TypeScriptExtractor', () => {
  let extractor: TypeScriptExtractor;

  beforeEach(() => {
    extractor = new TypeScriptExtractor(/* deps */);
  });

  describe('extract()', () => {
    it('should extract function declarations', async () => {
      const code = 'function test() {}';
      const blocks = await extractor.extract(code, 'test.ts');

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: 'function',
        name: 'test',
      });
    });

    it('should handle syntax errors gracefully', async () => {
      const code = 'function test(';  // Invalid
      await expect(extractor.extract(code, 'test.ts'))
        .resolves.toEqual([]);  // Should not throw
    });
  });
});
```

#### 2. Integration Test Patterns

```typescript
describe('Indexing Pipeline', () => {
  it('should index a small project end-to-end', async () => {
    // Setup: Create test files
    const testDir = await createTestDirectory({
      'src/index.ts': 'function main() {}',
      'src/utils.ts': 'export const helper = () => {}',
    });

    // Execute: Run indexing
    const indexer = new Indexer(/* config */);
    await indexer.indexDirectory(testDir);

    // Verify: Check results
    const results = await search('helper function');
    expect(results).toHaveLength(1);
    expect(results[0].file).toContain('utils.ts');

    // Cleanup
    await fs.rm(testDir, { recursive: true });
  });
});
```

#### 3. Mocking External Services

```typescript
import { vi } from 'vitest';

describe('EmbeddingProvider', () => {
  it('should retry on rate limit', async () => {
    const mockApi = vi.fn()
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValueOnce({ embedding: [0.1, 0.2] });

    const provider = new GeminiProvider(mockApi);
    const result = await provider.embed('test');

    expect(mockApi).toHaveBeenCalledTimes(2);
    expect(result).toEqual([0.1, 0.2]);
  });
});
```

---

### Performance Guidelines

#### 1. Batch Processing

```typescript
// ✅ GOOD: Batch requests
async function embedBlocks(blocks: CodeBlock[]) {
  const BATCH_SIZE = 50;
  const batches = chunk(blocks, BATCH_SIZE);

  for (const batch of batches) {
    const texts = batch.map(b => b.code);
    const embeddings = await embedder.embedBatch(texts);
    await storeBatch(batch, embeddings);
  }
}

// ❌ BAD: One at a time
for (const block of blocks) {
  const embedding = await embedder.embed(block.code);
  await store(block, embedding);
}
```

#### 2. Caching

```typescript
// Implement simple cache
class EmbeddingCache {
  private cache = new Map<string, number[]>();

  async get(text: string): Promise<number[] | undefined> {
    return this.cache.get(text);
  }

  set(text: string, embedding: number[]): void {
    if (this.cache.size > 10000) {
      // LRU eviction logic
    }
    this.cache.set(text, embedding);
  }
}
```

#### 3. Memory Management

```typescript
// ✅ GOOD: Stream large files
async function processLargeFile(path: string) {
  const stream = fs.createReadStream(path);
  const chunks: string[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk.toString());

    if (chunks.length >= 100) {
      await processChunks(chunks);
      chunks.length = 0;  // Clear
    }
  }
}

// ❌ BAD: Load entire file
const content = await fs.readFile(path, 'utf-8');
// Memory spike for large files
```

---

### Security Guidelines

#### 1. Input Validation

```typescript
import { z } from 'zod';

// Validate all external inputs
const searchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100),
  paths: z.array(z.string()).optional(),
});

export async function search(input: unknown) {
  const validated = searchSchema.parse(input);
  // Now use validated.query safely
}
```

#### 2. Path Sanitization

```typescript
import path from 'path';

// ✅ GOOD: Prevent directory traversal
function validatePath(inputPath: string, baseDir: string): string {
  const resolved = path.resolve(baseDir, inputPath);
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new SecurityError('Invalid path: directory traversal detected');
  }
  return resolved;
}

// ❌ BAD: Direct path usage
const content = await fs.readFile(userProvidedPath);  // Dangerous!
```

#### 3. API Key Handling

```typescript
// ✅ GOOD: Never log secrets
logger.info('Using Gemini provider', {
  apiKey: '***REDACTED***',  // Or omit entirely
});

// ❌ BAD: Exposing secrets
logger.info('API Key:', process.env.GEMINI_API_KEY);  // Never do this!

// ✅ GOOD: Validate key format
function validateApiKey(key: string): boolean {
  return /^[A-Za-z0-9_-]{20,}$/.test(key);
}
```

---

### Git Workflow

#### 1. Branch Naming

```bash
# Feature branches
git checkout -b feature/markdown-parser
git checkout -b feature/ollama-provider

# Bug fixes
git checkout -b fix/rate-limit-retry
git checkout -b fix/memory-leak-large-files

# Refactoring
git checkout -b refactor/parser-extractors
```

#### 2. Commit Messages

```bash
# ✅ GOOD: Descriptive commits
git commit -m "feat: add Markdown header-based parsing

- Implement MarkdownParser class
- Extract sections by H1, H2, H3 headers
- Add tests for nested headers
- Update config schema with markdownHeaderParsing option"

# ✅ GOOD: Bug fix commit
git commit -m "fix: handle rate limit errors in Gemini provider

- Add exponential backoff retry logic
- Max 5 retries with 2s, 4s, 8s, 16s, 32s delays
- Log warnings on retry attempts
- Fixes #42"

# ❌ BAD: Vague commits
git commit -m "updates"
git commit -m "fix stuff"
```

#### 3. Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings
```

---

### Documentation Standards

#### 1. Code Documentation

```typescript
/**
 * Extracts semantic code blocks from TypeScript source files.
 *
 * @param sourceCode - The TypeScript source code to parse
 * @param filePath - Path to the source file (for error reporting)
 * @returns Array of extracted code blocks (functions, classes, methods)
 * @throws {ParsingError} If the source code has syntax errors
 *
 * @example
 * ```typescript
 * const extractor = new TypeScriptExtractor(parser);
 * const blocks = await extractor.extract(code, 'src/index.ts');
 * console.log(`Found ${blocks.length} code blocks`);
 * ```
 */
async extract(sourceCode: string, filePath: string): Promise<CodeBlock[]> {
  // Implementation
}
```

#### 2. README Sections

Every module should have a README with:
- **Purpose**: What this module does
- **Usage**: Code examples
- **API**: Public functions/classes
- **Configuration**: Options and defaults
- **Limitations**: Known issues or constraints

---

### Common Pitfalls to Avoid

#### 1. Race Conditions

```typescript
// ❌ BAD: Race condition
let counter = 0;
await Promise.all(files.map(async f => {
  await processFile(f);
  counter++;  // Unsafe!
}));

// ✅ GOOD: Use proper aggregation
const results = await Promise.all(files.map(f => processFile(f)));
const counter = results.length;
```

#### 2. Memory Leaks

```typescript
// ❌ BAD: Growing cache without limits
class Cache {
  private data = new Map();
  set(key, value) {
    this.data.set(key, value);  // Never evicts!
  }
}

// ✅ GOOD: Implement LRU or size limits
class LRUCache {
  constructor(private maxSize: number) {}

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

#### 3. Unhandled Rejections

```typescript
// ❌ BAD: Silent failures
Promise.all(tasks);  // Errors not caught

// ✅ GOOD: Always handle promises
Promise.all(tasks).catch(error => {
  logger.error('Tasks failed:', error);
});

// ✅ BETTER: Use top-level error handler
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});
```

---

## 🎨 Key Design Decisions

### 1. Parsing Granularity
**Decision**: Extract at function/method/class level, not file level

**Rationale**:
- More precise search results
- Better code reuse discovery
- Smaller, more focused embeddings
- Aligns with developer mental models

**Trade-offs**:
- More vectors to store (higher cost)
- More complex parsing logic
- Requires language-specific extractors

### 2. Embedding Strategy
**Decision**: Embed both code and docstrings/comments

**Rationale**:
- Captures both what code does and why
- Improves semantic understanding
- Better matches natural language queries

**Implementation**:
```typescript
interface CodeBlock {
  type: 'function' | 'class' | 'method';
  name: string;
  code: string;           // The actual code
  docstring?: string;     // Extracted documentation
  signature?: string;     // Function/method signature
  embedding?: number[];   // Combined embedding
}

// Embedding input format
const embeddingText = `
${block.signature || ''}
${block.docstring || ''}
${block.code}
`.trim();
```

### 3. Incremental Indexing
**Decision**: Use file hash-based change detection

**Rationale**:
- Avoid re-indexing unchanged files
- Faster updates on file changes
- Lower API costs

**Implementation**:
```typescript
interface IndexedFile {
  path: string;
  hash: string;          // SHA-256 of file content
  lastIndexed: Date;
  blocks: CodeBlock[];
}

// Only reindex if hash changes
if (currentHash !== storedFile.hash) {
  await reindexFile(filePath);
}
```

### 4. Vector Storage Schema
**Decision**: Store rich metadata with vectors

**Qdrant Collection Schema**:
```typescript
{
  vectors: {
    size: 768,  // Embedding dimensions
    distance: "Cosine"
  },
  payload: {
    file_path: string;
    file_hash: string;
    language: string;
    block_type: string;   // function|class|method
    block_name: string;
    line_start: number;
    line_end: number;
    code: string;
    signature?: string;
    docstring?: string;
    tags?: string[];
    indexed_at: string;   // ISO timestamp
  }
}
```

### 5. Error Handling Strategy
**Decision**: Fail gracefully, continue on errors

**Principles**:
- Never crash the entire indexing process
- Log errors with context
- Track failed files separately
- Allow manual retry of failed files

**Implementation**:
```typescript
async indexFile(file: string) {
  try {
    // Parsing, embedding, storage
  } catch (error) {
    logger.error(`Failed to index ${file}:`, error);
    await this.trackFailedFile(file, error);
    // Continue with next file
  }
}
```

### 6. Search Ranking
**Decision**: Hybrid ranking with multiple signals

**Ranking Factors**:
1. Vector similarity score (primary)
2. Keyword match bonus
3. File recency
4. Code popularity (based on imports)
5. Block type preference (exact match > class > file)

**Implementation**:
```typescript
function calculateFinalScore(result: SearchResult): number {
  const vectorScore = result.similarityScore * 0.7;
  const keywordBonus = hasKeywordMatch(result) ? 0.1 : 0;
  const recencyBonus = getRecencyScore(result) * 0.1;
  const popularityBonus = getPopularityScore(result) * 0.1;

  return vectorScore + keywordBonus + recencyBonus + popularityBonus;
}
```

---

## 🚀 Performance Targets

### Indexing Performance
- **Small Codebase** (< 1K files): < 2 minutes
- **Medium Codebase** (1K-10K files): < 15 minutes
- **Large Codebase** (10K-100K files): < 2 hours
- **Incremental Update**: < 5 seconds per file

### Search Performance
- **Query Latency**: < 500ms (p95)
- **Throughput**: > 10 queries/second
- **Result Quality**: > 80% relevance (subjective)

### Resource Usage
- **Memory**: < 512MB for indexing
- **Disk**: < 100MB per 10K files (metadata)
- **Network**: Optimized batch sizes (< 1MB per request)

### Reliability
- **Uptime**: 99.9% (during indexing)
- **Error Rate**: < 1% of files
- **Recovery Time**: < 1 minute after crash

---

## 🧪 Testing Strategy

### Unit Tests
- All utility functions (file utils, retry logic, etc.)
- Parser extractors (each language)
- Embedding providers (mocked APIs)
- Vector store operations (mocked Qdrant)
- Status state machine
- Configuration validation

### Integration Tests
- End-to-end indexing workflow
- Search with real embeddings
- File watcher updates
- Multi-provider switching
- Qdrant connection handling

### End-to-End Tests
- Index real open-source projects
- Perform real searches
- Measure performance metrics
- Test error recovery

### Performance Tests
- Benchmark indexing speed
- Benchmark search latency
- Memory profiling
- Stress testing (concurrent requests)

---

## 🔒 Security Considerations

### API Key Management
- Never commit API keys to git
- Use environment variables
- Support credential managers (Keychain, etc.)
- Validate API keys on startup

### Code Privacy
- Local embeddings option (Ollama)
- Self-hosted Qdrant option
- No telemetry by default
- Clear data retention policies

### Input Validation
- Sanitize file paths (prevent directory traversal)
- Validate MCP tool inputs
- Limit query length and complexity
- Rate limit search requests

### Dependency Security
- Regular dependency audits (`npm audit`)
- Minimal dependency footprint
- Use trusted, well-maintained packages
- Pin dependency versions

---

## 📊 Monitoring & Observability

### Metrics to Track
- **Indexing**: Files processed, errors, duration
- **Search**: Query count, latency, result count
- **Storage**: Vector count, collection size
- **Providers**: API calls, errors, latency

### Logging Levels
- **DEBUG**: Detailed trace for development
- **INFO**: Normal operations (file indexed, search performed)
- **WARN**: Recoverable errors (API retry, file skipped)
- **ERROR**: Critical failures (cannot connect to Qdrant)

### Health Checks
- Qdrant connection status
- Embedding provider availability
- File watcher status
- Indexing queue health

---

## 🐛 Error Scenarios & Handling

### Scenario 1: Qdrant Unavailable
**Detection**: Connection timeout or 503 error
**Handling**:
- Retry with exponential backoff (max 5 attempts)
- Set status to 🔴 Red (Error)
- Queue operations for later
- Notify user via MCP

### Scenario 2: Embedding API Rate Limit
**Detection**: 429 Too Many Requests
**Handling**:
- Pause indexing
- Wait for rate limit reset (from headers)
- Resume automatically
- Status remains 🟡 Yellow (Indexing)

### Scenario 3: Invalid/Unparseable Code
**Detection**: Tree-sitter parse error
**Handling**:
- Log warning with file path
- Skip file, continue indexing
- Track in failed files list
- Allow manual retry

### Scenario 4: Large File (> 10MB)
**Detection**: File size check before parsing
**Handling**:
- Skip file by default
- Optionally chunk into smaller pieces
- Log skipped file
- User can override in config

### Scenario 5: Out of Memory
**Detection**: Memory usage monitoring
**Handling**:
- Reduce batch size dynamically
- Process files sequentially
- Trigger garbage collection
- Warn user if insufficient resources

---

## 🎯 Success Metrics

### Developer Experience
- **Setup Time**: < 5 minutes from install to first index
- **Documentation**: Clear, comprehensive, with examples
- **Error Messages**: Actionable and helpful

### Search Quality
- **Relevance**: Top 5 results contain answer (80% of queries)
- **Coverage**: Can find code across all indexed languages
- **Speed**: Results appear in < 1 second

### Adoption
- **GitHub Stars**: 500+ in first 3 months
- **NPM Downloads**: 1K+ monthly
- **Community**: Active issues, PRs, discussions

---

## ⚠️ Limitations & Constraints

### File Processing Limits
1. **File Size**: Maximum 1MB per file (configurable)
   - Files larger than this are skipped with a warning
   - Rationale: Prevents memory issues and excessive API costs

2. **Binary Files**: Automatically excluded
   - Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.ico`, `.svg`
   - Archives: `.zip`, `.tar`, `.gz`, `.7z`, `.rar`
   - Executables: `.exe`, `.dll`, `.so`, `.dylib`
   - Media: `.mp3`, `.mp4`, `.avi`, `.mov`, `.pdf`

3. **Language Support**: Best results with Tree-sitter supported languages
   - Tier 1 (Full parsing): TypeScript, JavaScript, Python, Java, Go, Rust
   - Tier 2 (Partial): C, C++, C#, Ruby, PHP
   - Tier 3 (Fallback): All other text files (line-based chunking)

### Performance Constraints
1. **Initial Indexing Time**: Scales linearly with codebase size
   - ~10-30 seconds per 1,000 files (depends on embedding provider)
   - Large codebases (100k+ files) may take hours on first index

2. **API Rate Limits**: Bound by embedding provider limits
   - Gemini: Generous free tier (60 requests/minute)
   - OpenAI: Depends on tier (3k-200k requests/minute)
   - Ollama: No limits (local)

3. **Memory Usage**: Proportional to batch size and concurrency
   - Default: ~512MB during indexing
   - Recommend: 2GB+ RAM for large codebases

### Feature Limitations
1. **No Full-Text Storage**: Only embeddings and metadata stored
   - Original files must be accessible for context retrieval
   - Cannot search if files are deleted/moved

2. **No Version History**: Indexes current state only
   - Historical code search requires git integration (future)

3. **Single Repository Focus**: MVP supports one repo at a time
   - Multi-repo support planned for Phase 11

4. **Embedding Provider Lock-in**: Changing providers requires full reindex
   - Different models have different dimensions
   - Cannot mix embeddings in same collection

### Security Limitations
1. **Local Secrets Only**: API keys stored locally (not encrypted at rest)
   - Use environment variables or secret management tools

2. **No Access Control**: All indexed code searchable by MCP client
   - Not suitable for mixed-permission codebases without additional controls

---

## 🔧 Troubleshooting Guide

### Common Issues

#### 🔴 Red Status: Connection Errors

**Symptom**: Status icon shows 🔴 Red with "Error: Cannot connect to Qdrant"

**Solutions**:
1. Verify Qdrant is running:
   ```bash
   # For Docker
   docker ps | grep qdrant

   # Test connection
   curl http://localhost:6333/health
   ```

2. Check Qdrant configuration:
   - Verify `QDRANT_URL` is correct
   - For cloud: Ensure `QDRANT_API_KEY` is valid
   - Check firewall/network settings

3. Restart Qdrant:
   ```bash
   docker restart qdrant
   ```

---

**Symptom**: Status icon shows 🔴 Red with "Embedding provider error"

**Solutions**:
1. Verify API key:
   - Gemini: Check at https://aistudio.google.com/app/apikey
   - OpenAI: Check at https://platform.openai.com/api-keys
   - Regenerate if invalid

2. Check API quotas:
   - Gemini: View at Google AI Studio
   - OpenAI: Check usage at platform.openai.com

3. Test connection:
   ```bash
   # Use validate_config tool
   mcp-tool validate_config --component embedder
   ```

4. Switch providers temporarily:
   ```bash
   # Use Ollama as fallback (local, no API key)
   EMBEDDING_PROVIDER=ollama
   ```

---

#### 🟡 Yellow Status: Indexing Stuck

**Symptom**: Status shows "Indexing - 45%" for extended period

**Solutions**:
1. Check logs for errors:
   ```bash
   # View recent logs
   tail -f ~/.mcp-codebase-index/logs/indexing.log
   ```

2. Look for rate limiting:
   - Slow progress with many retries = rate limited
   - Reduce `INDEX_CONCURRENCY` to slow down requests

3. Check for large files:
   - Files near 1MB limit take longer
   - Consider reducing `INDEX_MAX_FILE_SIZE`

4. Restart indexing:
   ```bash
   # Use reindex tool
   mcp-tool reindex --mode full --force
   ```

---

#### ⚪ Gray Status: Not Configured

**Symptom**: Status shows ⚪ Gray with "Standby"

**Solutions**:
1. Complete configuration:
   - Set embedding provider and API key
   - Set Qdrant URL and API key (if cloud)
   - Run `validate_config` to verify

2. Initialize index:
   ```bash
   mcp-tool reindex --mode full
   ```

---

### Performance Issues

#### Slow Initial Indexing

**Solutions**:
1. Increase concurrency (if API limits allow):
   ```env
   INDEX_CONCURRENCY=10
   ```

2. Reduce batch size (if memory constrained):
   ```env
   INDEX_BATCH_SIZE=25
   ```

3. Exclude unnecessary directories:
   ```bash
   # Add to .mcpignore
   echo "vendor/**" >> .mcpignore
   echo "third_party/**" >> .mcpignore
   ```

4. Use local embeddings (Ollama) for speed:
   ```env
   EMBEDDING_PROVIDER=ollama
   OLLAMA_MODEL=nomic-embed-text
   ```

---

#### Slow Search Queries

**Solutions**:
1. Reduce search scope:
   ```typescript
   // Search specific paths only
   codebase_search({
     query: "authentication",
     paths: ["src/auth/**"]
   })
   ```

2. Lower result limit:
   ```typescript
   codebase_search({
     query: "authentication",
     limit: 5  // Instead of 10
   })
   ```

3. Increase similarity threshold:
   ```typescript
   codebase_search({
     query: "authentication",
     threshold: 0.8  // Instead of 0.7, fewer results
   })
   ```

---

### File Processing Issues

#### Files Not Being Indexed

**Solutions**:
1. Check `.gitignore` and `.mcpignore`:
   ```bash
   # Files may be excluded
   cat .gitignore .mcpignore
   ```

2. Verify file size:
   ```bash
   # Find large files
   find . -type f -size +1M
   ```

3. Check file type:
   ```bash
   # Ensure it's a text file
   file path/to/file.txt
   ```

4. Review indexing logs for skip messages

---

#### Incorrect Code Blocks Extracted

**Solutions**:
1. Verify Tree-sitter grammar installed:
   ```bash
   # Check node_modules for tree-sitter-{language}
   ls node_modules | grep tree-sitter
   ```

2. Report parsing issues:
   - Some code patterns may confuse Tree-sitter
   - Fallback chunking will be used automatically

3. Adjust chunk size for fallback:
   ```json
   {
     "embedding": {
       "chunkSize": 256  // Smaller chunks
     }
   }
   ```

---

### Git Integration Issues

#### Index Not Updating on Branch Switch

**Solutions**:
1. Enable git branch watching:
   ```env
   GIT_WATCH_BRANCHES=true
   ```

2. Manual reindex after switch:
   ```bash
   mcp-tool reindex --mode incremental
   ```

3. Check git status:
   ```bash
   git status
   # Ensure you're on the intended branch
   ```

---

### Data Management

#### Clear and Reset Index

**When to use**:
- Corrupted index
- Want to change embedding provider
- Major codebase restructure

**How to**:
```bash
# Use clear_index tool
mcp-tool clear_index --confirm true

# Or manually delete Qdrant collection
curl -X DELETE http://localhost:6333/collections/codebase-index
```

---

### Multi-Workspace Issues

#### Workspaces Not Indexed Separately

**Solutions**:
1. Enable per-folder collections:
   ```json
   {
     "search": {
       "perFolderCollections": true
     }
   }
   ```

2. Check collection names:
   ```bash
   # List Qdrant collections
   curl http://localhost:6333/collections
   ```

3. Ensure `multiWorkspace.enabled: true` in config

---

### Getting Help

If issues persist:
1. **Check Logs**: `~/.mcp-codebase-index/logs/`
2. **GitHub Issues**: Report at [github.com/your-org/mcp-codebase-index/issues]
3. **Verbose Logging**:
   ```env
   LOG_LEVEL=debug
   ```
4. **Run Validation**:
   ```bash
   mcp-tool validate_config --component all
   ```

---

## 🔮 Future Enhancements (Post-MVP)

### Phase 11: Advanced Features
1. **Multi-Repository Support**: Index multiple repos
2. **Graph Relationships**: Function call graphs, dependency trees
3. **Code Similarity**: Find duplicate or similar code
4. **Historical Search**: Search across git history
5. **Natural Language Q&A**: Answer questions about code
6. **Code Generation**: Generate code based on search results

### Phase 12: UI/UX Improvements
1. **Web Dashboard**: Visual interface for status and search
   - Real-time status visualization
   - Interactive search interface
   - Configuration management UI
   - Indexing progress charts

2. **VS Code Extension**: Direct integration in editor
   - Status bar icon with color-coded states (🟢🟡🔴⚪)
   - Click popover for configuration
   - Command palette integration
   - Inline search results with code navigation
   - Webview panels for advanced settings
   - Secret storage for API keys
   - Multi-folder workspace support
   - Based on comparison plan architecture

3. **CLI Tool**: Standalone search from terminal
   - `mcp-search "query"` command
   - Interactive REPL mode
   - Output in multiple formats (JSON, table, markdown)

4. **IDE Plugins**: JetBrains, Sublime, Vim/Neovim
   - Consistent UX across editors
   - Native integration patterns

5. **Slack/Discord Bot**: Team search integration
   - Slash commands for code search
   - Shared knowledge base

### Phase 13: Enterprise Features
1. **Team Collaboration**: Shared indexes, annotations
2. **Access Control**: Role-based search permissions
3. **Audit Logs**: Track all search queries
4. **SLA Guarantees**: Enterprise support
5. **Custom Embeddings**: Fine-tuned models

### Phase 14: Advanced Search
1. **Regex + Semantic Hybrid**: Combine regex with semantic search
2. **Multi-Query**: Search with multiple related queries
3. **Faceted Search**: Filter by multiple dimensions
4. **Suggested Searches**: Auto-complete and suggestions

---

## 📚 References & Resources

### MCP Resources
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Server Tutorial](https://www.freecodecamp.org/news/how-to-build-a-custom-mcp-server-with-typescript-a-handbook-for-developers/)

### Tree-sitter Resources
- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/)
- [Tree-sitter TypeScript](https://github.com/tree-sitter/tree-sitter-typescript)
- [Tree-sitter Language List](https://tree-sitter.github.io/tree-sitter/#parsers)

### Qdrant Resources
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Qdrant JS Client](https://github.com/qdrant/qdrant-js)
- [Qdrant Code Search Tutorial](https://qdrant.tech/documentation/advanced-tutorials/code-search/)

### Embedding Resources
- [Google Gemini Embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Ollama Embedding Models](https://ollama.com/library/embeddinggemma)
- [Embedding Model Comparison](https://elephas.app/blog/best-embedding-models)

### Code Search References
- [Bloop Code Search](https://qdrant.tech/blog/case-study-bloop/)
- [Semantic Code Search with Qdrant](https://adasci.org/code-search-with-vector-embeddings-using-qdrant-vector-database/)

---

## 🎬 Getting Started (Post-Implementation)

### Quick Start

```bash
# 1. Install
npm install -g mcp-codebase-index

# 2. Configure
cp .env.example .env
# Edit .env with your API keys

# 3. Start Qdrant (Docker)
docker run -p 6333:6333 qdrant/qdrant

# 4. Index your codebase
mcp-codebase-index init
mcp-codebase-index index /path/to/your/repo

# 5. Connect to Claude
# Add to Claude Desktop config:
{
  "mcpServers": {
    "codebase-index": {
      "command": "mcp-codebase-index",
      "args": ["serve"],
      "env": {
        "GEMINI_API_KEY": "your_key_here"
      }
    }
  }
}

# 6. Search in Claude
# "Find all functions that handle user authentication"
# "Show me how database connections are initialized"
```

---

## ✅ Acceptance Criteria

The project is complete when:

1. ✅ **Core Functionality**
   - Can parse TypeScript, JavaScript, Python, and 2+ other languages
   - Can generate embeddings with Gemini, OpenAI, and Ollama
   - Can store vectors in Qdrant (Cloud and Docker)
   - Can perform semantic search with <500ms latency
   - Can track indexing status and progress

2. ✅ **MCP Integration**
   - Exposes all 4 MCP tools (search, status, reindex, configure)
   - Works with Claude Desktop
   - Handles errors gracefully

3. ✅ **Quality**
   - 80%+ code coverage
   - Passes all integration tests
   - Performance targets met
   - No critical security issues

4. ✅ **Documentation**
   - README with setup instructions
   - API documentation
   - Troubleshooting guide
   - Usage examples

5. ✅ **Release**
   - Published to npm
   - GitHub release created
   - Community feedback collected

---

## 🤝 Contributing

This is an open-source project. Contributions are welcome!

**Priority Areas**:
1. Additional language support (Ruby, PHP, Swift, Kotlin)
2. Alternative vector databases (Pinecone, Weaviate, Milvus)
3. Alternative embedding providers (Cohere, Voyage AI)
4. Performance optimizations
5. UI/UX improvements
6. Documentation improvements

---

## 📝 License

MIT License (to be added)

---

## 👥 Team & Roles

**Project Lead**: TBD
**Core Contributors**: Open for community

**Estimated Effort**: 8 weeks full-time (1 developer) or 4 weeks (2 developers)

---

## 📅 Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Foundation | 1 week | MCP server, config, logging |
| 2. Code Parsing | 1 week | Tree-sitter integration, extractors |
| 3. Embeddings | 1 week | Multi-provider support |
| 4. Vector Storage | 1 week | Qdrant integration |
| 5. Indexing Engine | 1 week | Full + incremental indexing |
| 6. Search | 1 week | Semantic search |
| 7. Status | 1 week | Status tracking |
| 8. MCP Tools | 1 week | All MCP tools |
| 9. Testing | 1 week | Comprehensive tests |
| 10. Documentation | 1 week | Docs, release |
| **Total** | **8-10 weeks** | **Production-ready MCP server** |

---

## 🎉 Conclusion

This plan provides a comprehensive roadmap for building a production-ready Codebase Index MCP server. The project will enable developers to perform intelligent, semantic code search across their repositories, dramatically improving code discovery and understanding.

**Key Success Factors**:
1. Start with free providers (Gemini, Ollama) for accessibility
2. Prioritize developer experience (easy setup, clear errors)
3. Build incrementally, test continuously
4. Engage community early for feedback
5. Document thoroughly

**Next Steps**:
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Establish feedback loops

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Status**: Ready for Implementation
