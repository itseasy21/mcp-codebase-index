# MCP Codebase Index

A Model Context Protocol (MCP) server that provides semantic code search capabilities using Tree-sitter parsing, multiple embedding providers, and Qdrant vector database.

## Features

- **Semantic Code Search**: Find code using natural language queries
- **Multi-Language Support**: TypeScript, JavaScript, Python, Java, Go, Rust, C/C++, C#, Ruby, PHP, and more
- **Multiple Embedding Providers**: Google Gemini (free), OpenAI, Ollama (local), and OpenAI-compatible providers
- **Flexible Vector Storage**: Qdrant Cloud (free tier) or self-hosted Docker
- **Real-time Indexing**: Automatic file watching and incremental updates
- **Git-Aware**: Detects branch switches and reindexes automatically

## Status

✅ **Phase 1-9 Complete** - Core functionality implemented and tested!

### Completed Phases
- ✅ **Phase 1**: Foundation (Project structure, TypeScript, configuration)
- ✅ **Phase 2**: Code Parser (Tree-sitter, language extractors, markdown parsing)
- ✅ **Phase 3**: Embeddings (Gemini, OpenAI, Ollama providers)
- ✅ **Phase 4**: Storage Layer (Qdrant integration, vector operations)
- ✅ **Phase 5**: Indexing Engine (File watching, incremental updates, Git integration)
- ✅ **Phase 6**: Search Implementation (Semantic search with ranking)
- ✅ **Phase 7**: Status Management (Progress tracking, statistics)
- ✅ **Phase 8**: MCP Tools Integration (All 6 tools fully functional)
- ✅ **Phase 9**: Testing & Infrastructure (Vitest, unit tests, integration tests)

### Ready to Use
The server is fully functional and ready for production use! All MCP tools are implemented and tested.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Qdrant instance (Docker or Cloud)
- API key for embedding provider (Gemini, OpenAI, or Ollama)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-codebase-index

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: CODEBASE_PATH, EMBEDDING_PROVIDER, and provider API key
```

### Development

```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
```

### Configuration

Create a `.env` file with your settings:

```bash
# Required
CODEBASE_PATH=/path/to/your/repository
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your_api_key_here
QDRANT_URL=http://localhost:6333

# Optional
INDEX_BATCH_SIZE=50
INDEX_CONCURRENCY=5
LOG_LEVEL=info
```

### Using with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "node",
      "args": ["/path/to/mcp-codebase-index/dist/index.js"],
      "env": {
        "CODEBASE_PATH": "/path/to/your/repository",
        "EMBEDDING_PROVIDER": "gemini",
        "GEMINI_API_KEY": "your_api_key_here",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

## MCP Tools

The server provides these fully functional tools:

### `codebase_search`
Search the indexed codebase using semantic search.

**Input:**
- `query` (string, required): Natural language or code query
- `limit` (number): Maximum results (default: 10)
- `threshold` (number): Similarity threshold 0-1 (default: 0.7)
- `fileTypes` (string[]): Filter by file extensions
- `paths` (string[]): Filter by paths
- `includeContext` (boolean): Include surrounding code

### `indexing_status`
Get current indexing status and progress.

**Input:**
- `detailed` (boolean): Include per-file details

### `reindex`
Trigger full or partial reindexing.

**Input:**
- `mode` (string): 'full', 'incremental', or 'file'
- `paths` (string[]): Specific files/folders to reindex
- `force` (boolean): Force reindex even if unchanged

### `configure_indexer`
Update indexer configuration at runtime.

### `clear_index`
Clear all indexed data and reset.

### `validate_config`
Test configuration and connections.

## Architecture

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
    ┌─────▼─────┐  ┌────▼─────┐      ┌────▼─────┐
    │Tree-sitter│  │Embedding │      │  Qdrant  │
    │ Grammars  │  │Providers │      │ Database │
    │  (10+)    │  │(Gemini/  │      │(Cloud/   │
    │           │  │OpenAI/   │      │ Docker)  │
    │           │  │ Ollama)  │      │          │
    └───────────┘  └──────────┘      └──────────┘
```

## Development Roadmap

See [PLAN.md](./PLAN.md) for the complete implementation plan.

### Phase 1: Foundation ✅
- Project setup and infrastructure
- Configuration system
- Basic MCP server

### Phase 2: Code Parsing ✅
- Tree-sitter integration with 10+ languages
- Language-specific extractors (TypeScript, Python, etc.)
- Markdown header-based parsing
- Fallback chunking for unsupported files

### Phase 3: Embeddings ✅
- Google Gemini provider (free tier available)
- OpenAI provider (text-embedding-3-small/large)
- Ollama provider (local models)
- Batch embedding support with error handling

### Phase 4: Storage Layer ✅
- Qdrant vector database integration
- Collection management (create, delete, info)
- Vector operations (upsert, search, delete)
- Batch operations with optimizations

### Phase 5: Indexing Engine ✅
- Real-time file watching with chokidar
- Incremental indexing (only changed files)
- Git branch change detection
- Priority queue for efficient processing

### Phase 6: Search & Ranking ✅
- Semantic vector search
- Advanced result ranking with multiple factors
- Context extraction (surrounding code)
- Search result caching

### Phase 7: Status Management ✅
- Real-time progress tracking
- Statistics (files, blocks, languages)
- Error reporting and retry tracking
- Detailed status display

### Phase 8: MCP Tools ✅
- All 6 tools fully implemented
- Input validation with Zod schemas
- Comprehensive error handling
- Status icons and formatted output

### Phase 9: Testing ✅
- Vitest test framework
- Unit tests for all major components
- Integration tests for end-to-end workflows
- 70% coverage thresholds

### Phase 10: Documentation & Release (Next)
- Enhanced documentation
- Usage examples
- Performance optimization
- npm publish preparation

## Contributing

Contributions are welcome! Please read [PLAN.md](./PLAN.md) for implementation guidelines.

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
