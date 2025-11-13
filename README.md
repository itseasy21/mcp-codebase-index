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

🚧 **Currently in development** - Phase 1 (Foundation) completed

### Completed
- ✅ Project structure and TypeScript setup
- ✅ Configuration system with Zod validation
- ✅ Logging and error handling utilities
- ✅ Basic MCP server with tool stubs

### In Progress
- 🔨 Tree-sitter code parser implementation
- 🔨 Embedding provider integrations
- 🔨 Qdrant vector storage
- 🔨 Indexing engine
- 🔨 Search functionality

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

Once fully implemented, the server will provide these tools:

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

### Phase 2: Code Parsing (In Progress)
- Tree-sitter integration
- Language extractors
- Markdown and fallback parsing

### Phase 3-4: Embeddings & Storage
- Multiple embedding providers
- Qdrant integration
- Vector operations

### Phase 5: Indexing Engine
- File watching
- Incremental updates
- Git integration

### Phase 6-7: Search & Status
- Semantic search
- Result ranking
- Status tracking

### Phase 8-10: Polish & Release
- Testing
- Optimization
- Documentation
- npm publish

## Contributing

Contributions are welcome! Please read [PLAN.md](./PLAN.md) for implementation guidelines.

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
