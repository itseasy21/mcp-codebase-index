# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-13

### 🎉 Initial Release

First production-ready release of MCP Codebase Index server!

### ✨ Features

#### Phase 1: Foundation
- ✅ Complete TypeScript project setup with strict mode
- ✅ Zod-based configuration system with environment variable support
- ✅ Comprehensive logging with winston
- ✅ Error handling utilities
- ✅ MCP server foundation with @modelcontextprotocol/sdk

#### Phase 2: Code Parser
- ✅ Tree-sitter integration for 10+ programming languages
  - TypeScript, JavaScript, Python, Java, Go, Rust
  - C, C++, C#, Ruby, PHP
- ✅ Language-specific extractors for precise code block detection
- ✅ Markdown header-based parsing for documentation
- ✅ Fallback text chunking for unsupported file types
- ✅ File type detection and language registry

#### Phase 3: Embeddings
- ✅ Multi-provider embedding support:
  - Google Gemini (text-embedding-004) - Free tier
  - OpenAI (text-embedding-3-small/large) - Paid
  - Ollama (local models) - Free, privacy-focused
- ✅ Batch embedding with automatic batching and retry logic
- ✅ Provider health checks and validation
- ✅ Configurable dimensions and models

#### Phase 4: Storage Layer
- ✅ Qdrant vector database integration
- ✅ Collection management (create, delete, info, exists)
- ✅ Vector operations (upsert, search, delete, batch operations)
- ✅ Optimized batch upserts with chunking
- ✅ Health checks and connection validation
- ✅ Support for Qdrant Cloud and self-hosted Docker

#### Phase 5: Indexing Engine
- ✅ Batch file processing with priority queue
- ✅ Concurrent indexing with configurable batch size
- ✅ Real-time file watching with chokidar
- ✅ Incremental updates (only changed files)
- ✅ Git branch change detection and auto-reindex
- ✅ .gitignore and .mcpignore support
- ✅ Progress tracking and statistics
- ✅ Error handling with retry logic

#### Phase 6: Search Implementation
- ✅ Semantic vector search with cosine similarity
- ✅ Advanced result ranking with multiple factors:
  - Semantic similarity score
  - Exact match bonuses
  - Code block type weighting
  - Language relevance scoring
- ✅ Context extraction (surrounding code lines)
- ✅ Multi-dimensional filtering (file types, paths, languages)
- ✅ LRU cache for search results
- ✅ Configurable similarity thresholds

#### Phase 7: Status Management
- ✅ Real-time indexing status tracking
- ✅ Progress percentage and file counts
- ✅ Statistics collection (blocks, vectors, languages)
- ✅ Error reporting with timestamps
- ✅ Status icons for visual feedback
- ✅ Detailed and summary status modes

#### Phase 8: MCP Tools Integration
- ✅ `codebase_search` - Semantic code search with filters
- ✅ `indexing_status` - Real-time status and progress
- ✅ `reindex` - Trigger full or incremental reindexing
- ✅ `configure_indexer` - Runtime configuration updates
- ✅ `clear_index` - Reset and clear all indexed data
- ✅ `validate_config` - Test configuration and connections
- ✅ Zod schemas for input validation
- ✅ Comprehensive error handling
- ✅ Formatted output with status icons

#### Phase 9: Testing & Infrastructure
- ✅ Vitest test framework configuration
- ✅ Unit tests for all major components:
  - Parser (TypeScript, Markdown)
  - Embedding providers
  - Utility functions
- ✅ Integration tests for end-to-end workflows
- ✅ Test fixtures for reproducible testing
- ✅ 70% coverage thresholds
- ✅ Comprehensive test suite (69+ test cases)

### 📚 Documentation

- ✅ Complete README with setup instructions
- ✅ Comprehensive USAGE.md guide:
  - Installation and configuration
  - All embedding provider setups
  - MCP tools reference with examples
  - Best practices and performance tuning
  - Troubleshooting section
  - Advanced topics
- ✅ API.md reference documentation
- ✅ Detailed PLAN.md implementation roadmap
- ✅ CHANGELOG.md for version history

### 🏗️ Architecture

- ✅ Modular component design
- ✅ Type-safe TypeScript throughout
- ✅ Clean separation of concerns
- ✅ Dependency injection for testability
- ✅ Event-driven architecture
- ✅ Graceful error handling
- ✅ Resource cleanup and shutdown hooks

### 🔧 Configuration

- ✅ Environment variable configuration
- ✅ Sensible defaults for all settings
- ✅ Runtime configuration updates
- ✅ Validation with detailed error messages
- ✅ Support for .env files

### 🎯 Supported Languages

- TypeScript (.ts, .tsx)
- JavaScript (.js, .jsx, .mjs, .cjs)
- Python (.py, .pyw)
- Java (.java)
- Go (.go)
- Rust (.rs)
- C (.c, .h)
- C++ (.cpp, .cc, .cxx, .hpp, .hxx)
- C# (.cs)
- Ruby (.rb)
- PHP (.php)
- Markdown (.md, .markdown)

### 🚀 Performance

- Batch processing for efficient indexing
- Concurrent file processing (configurable)
- Search result caching
- Incremental updates (only changed files)
- Optimized vector operations
- Configurable resource usage

### 🔒 Security

- API key support for Qdrant Cloud
- Secure credential handling
- File type validation
- Size limits to prevent abuse
- Input sanitization

### 📦 Dependencies

**Core**:
- @modelcontextprotocol/sdk ^1.0.4
- @qdrant/js-client-rest ^1.12.0
- tree-sitter ^0.21.1 + language grammars
- @google/generative-ai ^0.21.0
- openai ^4.77.0
- chokidar ^4.0.1
- dotenv ^16.4.7
- zod ^3.23.8

**Development**:
- typescript ^5.7.2
- vitest ^2.1.5
- @changesets/cli ^2.27.12

### 🐛 Known Issues

None reported in initial release.

### 📝 Notes

- First production-ready release
- All core features implemented and tested
- Ready for use in Claude Desktop and other MCP clients
- Supports both free (Gemini, Ollama) and paid (OpenAI) embedding providers
- Works with Qdrant Cloud (free tier) or self-hosted Docker

### 🙏 Acknowledgments

- MCP Specification and SDK team
- Tree-sitter project and grammar maintainers
- Qdrant team for excellent vector database
- Google Gemini, OpenAI, and Ollama teams for embedding APIs

---

## Upcoming Releases

### [0.2.0] - Planned

**Advanced Features**:
- Multi-repository support
- Code similarity detection
- Enhanced caching strategies
- Performance optimizations

**Developer Experience**:
- CLI tool for standalone usage
- Additional language support
- Improved error messages
- Performance benchmarks

---

[0.1.0]: https://github.com/yourusername/mcp-codebase-index/releases/tag/v0.1.0
