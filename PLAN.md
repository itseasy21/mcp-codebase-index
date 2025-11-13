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
      "**/*.rs"
    ],
    "batchSize": 50,
    "concurrency": 5,
    "autoIndex": true,
    "watchFiles": true
  },
  "search": {
    "defaultLimit": 10,
    "minScore": 0.7,
    "includeContext": true,
    "contextLines": 5
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
6. Create AST traversal and semantic block extraction
7. Add metadata extraction (function names, parameters, return types)
8. Implement file scanning and language detection

**Deliverables**:
- ✅ Parse TypeScript/JavaScript files into semantic blocks
- ✅ Parse Python files into semantic blocks
- ✅ Extract functions, classes, methods with metadata
- ✅ Handle syntax errors gracefully

**Key Challenges**:
- Tree-sitter grammar setup for multiple languages
- Determining optimal block granularity (function vs. class vs. file)
- Handling malformed or incomplete code

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
3. Implement file system watcher for auto-indexing
4. Add incremental indexing (delta updates)
5. Implement deduplication logic
6. Add indexing state persistence
7. Create error recovery and retry mechanisms
8. Implement progress tracking
9. Add indexing statistics collection

**Deliverables**:
- ✅ Full codebase indexing
- ✅ Incremental updates on file changes
- ✅ Progress tracking and status reporting
- ✅ Error recovery and resumption

**Key Challenges**:
- Detecting file changes efficiently
- Handling large codebases (100k+ files)
- Managing indexing queue priority
- Optimizing batch sizes for speed vs. memory

### Phase 6: Search Implementation (Week 4-5)
**Goal**: Implement semantic search functionality

**Tasks**:
1. Implement query embedding generation
2. Create vector similarity search
3. Add metadata filtering (file type, path, language)
4. Implement result ranking and scoring
5. Add context extraction (surrounding code)
6. Implement hybrid search (vector + keyword)
7. Add search result caching
8. Optimize search performance

**Deliverables**:
- ✅ Semantic search with natural language queries
- ✅ Filtered search (by language, path, etc.)
- ✅ Result ranking and scoring
- ✅ Code context in results

**Key Challenges**:
- Balancing precision vs. recall
- Determining optimal similarity threshold
- Extracting meaningful context
- Handling ambiguous queries

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
5. Add input validation for all tools
6. Implement tool error handling
7. Add tool usage examples
8. Create tool documentation

**Deliverables**:
- ✅ All MCP tools functional and tested
- ✅ Input/output validation
- ✅ Error messages and user feedback
- ✅ Tool documentation

### Phase 9: Testing & Optimization (Week 6-7)
**Goal**: Comprehensive testing and performance optimization

**Tasks**:
1. Write unit tests for all components
2. Write integration tests for workflows
3. Add end-to-end tests with real codebases
4. Performance benchmarking
5. Memory usage optimization
6. Indexing speed optimization
7. Search latency optimization
8. Error handling improvements
9. Code review and refactoring

**Deliverables**:
- ✅ 80%+ code coverage
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
2. **VSCode Extension**: Direct integration in editor
3. **CLI Tool**: Standalone search from terminal
4. **Slack/Discord Bot**: Team search integration

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
