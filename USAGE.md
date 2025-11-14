# Usage Guide

Comprehensive guide for using the MCP Codebase Index server.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Getting Started](#getting-started)
- [MCP Tools Reference](#mcp-tools-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Installation

### Prerequisites

1. **Node.js 18+** - Required for running the server
2. **Qdrant** - Vector database (choose one):
   - **Option A**: Qdrant Cloud (free tier available)
     - Sign up at https://cloud.qdrant.io/
     - Get your cluster URL and API key
   - **Option B**: Docker (self-hosted)
     ```bash
     docker run -p 6333:6333 qdrant/qdrant
     ```

3. **Embedding Provider API Key** (choose one):
   - **Google Gemini** (recommended, free tier)
     - Get key at https://makersuite.google.com/app/apikey
   - **OpenAI**
     - Get key at https://platform.openai.com/api-keys
   - **Ollama** (local, free)
     - Install from https://ollama.ai/
     - Pull model: `ollama pull nomic-embed-text`

### Setup

```bash
# Clone and install
git clone <repository-url>
cd mcp-codebase-index
npm install

# Build
npm run build

# Create configuration
cp .env.example .env
# Edit .env with your settings
```

## Configuration

### Basic Configuration

Create `.env` file:

```bash
# Required Settings
CODEBASE_PATH=/absolute/path/to/your/repository
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
QDRANT_URL=http://localhost:6333

# Optional Settings
LOG_LEVEL=info
INDEX_BATCH_SIZE=50
INDEX_CONCURRENCY=5
```

### Embedding Providers

#### Google Gemini (Recommended)

```bash
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your_key
EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIMENSIONS=768
```

**Pros**: Free tier, fast, good quality embeddings

#### OpenAI

```bash
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

**Models**:
- `text-embedding-3-small` - 1536 dimensions, lower cost
- `text-embedding-3-large` - 3072 dimensions, higher quality

#### Ollama (Local)

```bash
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSIONS=768
```

**Setup**:
```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull embedding model
ollama pull nomic-embed-text

# Verify
ollama list
```

### Qdrant Configuration

#### Cloud (Recommended for Production)

```bash
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your_api_key
QDRANT_COLLECTION=codebase-index
```

#### Docker (Local Development)

```bash
# Start Qdrant
docker run -d -p 6333:6333 -v qdrant_data:/qdrant/storage qdrant/qdrant

# Configuration
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=codebase-index
```

### Advanced Configuration

```bash
# Indexing
INDEX_BATCH_SIZE=50              # Files per batch
INDEX_CONCURRENCY=5              # Parallel operations
MAX_FILE_SIZE=1048576            # 1MB max file size
AUTO_INDEX=true                  # Index on startup
ENABLE_WATCHER=true              # Watch file changes
GIT_INTEGRATION=true             # Monitor git branches

# Search
SEARCH_DEFAULT_LIMIT=10          # Results per query
SEARCH_MIN_SCORE=0.7             # Similarity threshold
ENABLE_CACHE=true                # Cache search results
CACHE_SIZE=100                   # Max cached queries
CACHE_TTL=300000                 # 5 minutes

# Languages
INDEX_LANGUAGES=typescript,javascript,python,go,rust,java

# Exclusions
INDEX_EXCLUDE=node_modules/**,dist/**,build/**,*.min.js
```

## Getting Started

### 1. Start Qdrant

```bash
# Using Docker
docker run -p 6333:6333 qdrant/qdrant

# Or use Qdrant Cloud (no local setup needed)
```

### 2. Configure Server

Edit `.env`:

```bash
CODEBASE_PATH=/Users/you/projects/your-repo
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...
QDRANT_URL=http://localhost:6333
```

### 3. Test Configuration

```bash
# Verify configuration
npm run build
node dist/index.js

# Check logs for successful initialization
```

### 4. Add to Claude Desktop

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-codebase-index/dist/index.js"],
      "env": {
        "CODEBASE_PATH": "/absolute/path/to/your/repository",
        "EMBEDDING_PROVIDER": "gemini",
        "GEMINI_API_KEY": "your_api_key_here",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

### 5. Restart Claude Desktop

Restart Claude Desktop to load the MCP server.

### 6. Verify Connection

In Claude, ask:
> "Can you check the indexing status of my codebase?"

You should see the server respond with indexing status.

## MCP Tools Reference

### `codebase_search`

Search your codebase using natural language or code snippets.

**Examples**:

```
🔍 Find authentication logic
Query: "user authentication flow"

🔍 Find by code pattern
Query: "async function that handles errors"

🔍 Find specific function
Query: "getUserById implementation"

🔍 Find with filters
Query: "database connection"
Filters: fileTypes: [".ts", ".js"], limit: 5
```

**Parameters**:
- `query` (required): Search query
- `limit`: Max results (default: 10)
- `threshold`: Similarity score 0-1 (default: 0.7)
- `fileTypes`: Filter by extensions (e.g., [".ts", ".py"])
- `paths`: Filter by paths (e.g., ["src/api"])
- `languages`: Filter by languages (e.g., ["typescript"])
- `includeContext`: Show surrounding code (default: true)
- `contextLines`: Lines of context (default: 3)

### `indexing_status`

Check indexing progress and statistics.

**Example**:
```
📊 Check status
"What's the current indexing status?"

📊 Detailed stats
Request with: { detailed: true }
```

**Response includes**:
- Current status (standby, indexing, indexed, error)
- Progress (percentage, files processed)
- Statistics (total blocks, vectors, languages)
- Recent errors
- Git branch info

### `reindex`

Trigger reindexing of your codebase.

**Modes**:

1. **Incremental** (default): Only changed files
   ```
   "Reindex my codebase"
   { mode: "incremental" }
   ```

2. **Full**: All files, force reindex
   ```
   "Do a full reindex"
   { mode: "full" }
   ```

**Use cases**:
- After major code changes
- After switching branches
- To refresh outdated index

### `configure_indexer`

Update server configuration at runtime.

**Examples**:

```javascript
// Change embedding provider
{
  provider: "openai",
  providerConfig: {
    apiKey: "new_key",
    model: "text-embedding-3-small"
  }
}

// Update indexing settings
{
  indexingConfig: {
    batchSize: 100,
    concurrency: 10
  }
}

// Switch Qdrant instance
{
  qdrantConfig: {
    url: "https://new-cluster.cloud.qdrant.io",
    apiKey: "new_api_key"
  }
}
```

**Note**: Configuration changes restart the indexer.

### `clear_index`

Remove all indexed data and reset.

**Example**:
```javascript
{
  confirm: true  // Required safety check
}
```

**⚠️ Warning**: This is destructive and cannot be undone!

**Use cases**:
- Switching to a different codebase
- Fixing corrupted index
- Starting fresh after major changes

### `validate_config`

Test configuration and connections.

**Examples**:

```javascript
// Validate everything
{ component: "all" }

// Validate specific component
{ component: "qdrant" }
{ component: "embedder" }
```

**Checks**:
- Qdrant connection and collection status
- Embedding provider availability
- Test embedding generation
- Configuration validity

## Best Practices

### Indexing Strategy

1. **Initial Setup**:
   ```
   1. Configure server
   2. Start server (auto-index on first run)
   3. Wait for initial indexing to complete
   4. Verify with indexing_status
   ```

2. **Ongoing Use**:
   - File watcher handles most updates automatically
   - Manual reindex after major refactoring
   - Incremental reindex after branch switches

3. **Large Codebases**:
   ```bash
   # Adjust batch size and concurrency
   INDEX_BATCH_SIZE=100
   INDEX_CONCURRENCY=10

   # Exclude unnecessary files
   INDEX_EXCLUDE=node_modules/**,vendor/**,dist/**
   ```

### Search Tips

1. **Natural Language**:
   ```
   ✅ Good: "function that validates email addresses"
   ✅ Good: "authentication middleware"
   ❌ Poor: "code"
   ❌ Poor: "file"
   ```

2. **Code Patterns**:
   ```
   ✅ Good: "async function with try-catch"
   ✅ Good: "class that extends BaseController"
   ✅ Good: "useState hook"
   ```

3. **Use Filters**:
   ```javascript
   {
     query: "database query",
     fileTypes: [".ts"],
     paths: ["src/db"],
     threshold: 0.8  // Higher threshold = stricter matching
   }
   ```

4. **Adjust Threshold**:
   - `0.9-1.0`: Very strict (exact matches)
   - `0.7-0.9`: Balanced (default)
   - `0.5-0.7`: Lenient (broader results)

### Performance Optimization

1. **Embedding Provider**:
   - Gemini: Best free option, fast
   - OpenAI: Higher quality, costs apply
   - Ollama: No API costs, requires local resources

2. **Batch Processing**:
   ```bash
   # For faster indexing (more memory)
   INDEX_BATCH_SIZE=100
   INDEX_CONCURRENCY=10

   # For lower memory usage
   INDEX_BATCH_SIZE=20
   INDEX_CONCURRENCY=3
   ```

3. **Search Caching**:
   ```bash
   ENABLE_CACHE=true
   CACHE_SIZE=200        # More cached queries
   CACHE_TTL=600000      # 10 minutes
   ```

### Error Handling

1. **Check Logs**:
   ```bash
   # Enable debug logging
   LOG_LEVEL=debug

   # View logs in real-time
   tail -f logs/server.log
   ```

2. **Validate Setup**:
   ```
   Use validate_config tool before searching
   ```

3. **Common Issues**:
   - API key errors → Check .env configuration
   - Connection errors → Verify Qdrant is running
   - Indexing failures → Check file permissions
   - Out of memory → Reduce batch size/concurrency

## Troubleshooting

### Server Won't Start

```bash
# Check Node version
node --version  # Should be 18+

# Rebuild
npm run build

# Check configuration
cat .env

# Test Qdrant connection
curl http://localhost:6333/collections
```

### Indexing Stuck

```bash
# Check status
Use indexing_status tool

# Clear and restart
Use clear_index tool (confirm: true)
Then reindex tool

# Check logs
tail -f logs/server.log
```

### Search Returns No Results

1. **Check indexing completed**:
   ```
   Use indexing_status tool
   Verify status is "indexed"
   ```

2. **Lower threshold**:
   ```javascript
   {
     query: "your search",
     threshold: 0.5  // Lower threshold
   }
   ```

3. **Try broader query**:
   ```
   ❌ "exact function name"
   ✅ "function that does X"
   ```

### Connection Errors

**Qdrant**:
```bash
# Test connection
curl http://localhost:6333/collections

# Restart Docker
docker restart $(docker ps -q -f ancestor=qdrant/qdrant)

# Check URL in .env
QDRANT_URL=http://localhost:6333  # Correct
QDRANT_URL=localhost:6333          # Missing http://
```

**Embedding Provider**:
```bash
# Gemini: Verify API key
curl -H "x-goog-api-key: YOUR_KEY" \
  https://generativelanguage.googleapis.com/v1/models

# OpenAI: Test key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY"

# Ollama: Check service
curl http://localhost:11434/api/tags
```

## Advanced Topics

### Custom File Exclusions

Create `.mcpignore` in your codebase root:

```
# Dependencies
node_modules/
vendor/
.git/

# Build outputs
dist/
build/
out/

# Large files
*.min.js
*.bundle.js
*.map

# Test files
**/*.test.ts
**/*.spec.ts
__tests__/
```

### Multi-Workspace Setup

Index multiple codebases:

```json
{
  "mcpServers": {
    "frontend-index": {
      "command": "node",
      "args": ["/path/to/mcp-codebase-index/dist/index.js"],
      "env": {
        "CODEBASE_PATH": "/path/to/frontend",
        "QDRANT_COLLECTION": "frontend-index"
      }
    },
    "backend-index": {
      "command": "node",
      "args": ["/path/to/mcp-codebase-index/dist/index.js"],
      "env": {
        "CODEBASE_PATH": "/path/to/backend",
        "QDRANT_COLLECTION": "backend-index"
      }
    }
  }
}
```

### Git Integration

The server automatically detects branch changes:

```bash
GIT_INTEGRATION=true
DETECT_BRANCH_CHANGE=true
```

**Behavior**:
- Monitors `.git/HEAD` for branch changes
- Triggers incremental reindex on switch
- Updates index with branch-specific code

### Performance Tuning

**For Large Codebases (10k+ files)**:
```bash
INDEX_BATCH_SIZE=200
INDEX_CONCURRENCY=20
MAX_FILE_SIZE=2097152  # 2MB
```

**For Resource-Constrained Environments**:
```bash
INDEX_BATCH_SIZE=10
INDEX_CONCURRENCY=2
ENABLE_CACHE=false
```

**For Maximum Search Speed**:
```bash
ENABLE_CACHE=true
CACHE_SIZE=500
CACHE_TTL=1800000  # 30 minutes
```

## Support

- **Documentation**: See [README.md](README.md) for overview
- **Issues**: Report bugs on GitHub
- **API Reference**: See [src/server.ts](src/server.ts) for tool schemas
- **Development**: See [PLAN.md](PLAN.md) for architecture

## License

MIT - See [LICENSE](LICENSE) file
