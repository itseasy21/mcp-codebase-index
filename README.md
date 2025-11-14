# MCP Codebase Index

A powerful Model Context Protocol (MCP) server that enables AI assistants to search and understand your codebase using semantic search. Find code using natural language queries like "authentication logic" or "database connection handling" instead of exact text matching.

[![smithery badge](https://smithery.ai/badge/@itseasy21/mcp-codebase-index)](https://smithery.ai/server/@itseasy21/mcp-codebase-index)

## Features

- 🔍 **Semantic Code Search** - Search using natural language, not just keywords
- 🌐 **Multi-Language Support** - TypeScript, JavaScript, Python, Java, Go, Rust, C/C++, C#, Ruby, PHP, and more
- 🎯 **Smart Code Parsing** - Understands functions, classes, and code structure using Tree-sitter
- 🔄 **Real-time Updates** - Automatically reindexes when files change or branches switch
- 🚀 **Multiple Embedding Providers** - Use Google Gemini (free), OpenAI, or local Ollama models
- ☁️ **Flexible Storage** - Works with Qdrant Cloud (free tier) or self-hosted instances

## Installation

```bash
npm install -g @itseasy21/mcp-codebase-index
```

Or use with npx (no installation required):

```bash
npx @itseasy21/mcp-codebase-index
```

## Quick Start

### 1. Set Up Qdrant Vector Database

Choose one option:

**Option A: Qdrant Cloud (Recommended for beginners)**
- Sign up for free at [Qdrant Cloud](https://cloud.qdrant.io/)
- Create a cluster (free tier available)
- Get your API URL and key

**Option B: Local Docker**
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 2. Get an Embedding Provider API Key

Choose one option:

**Option A: Google Gemini (Free)**
- Get a free API key at [Google AI Studio](https://makersuite.google.com/app/apikey)

**Option B: OpenAI**
- Get an API key at [OpenAI Platform](https://platform.openai.com/api-keys)

**Option C: Ollama (Local, Free)**
- Install [Ollama](https://ollama.ai/)
- Pull a model: `ollama pull nomic-embed-text`

### 3. Configure Your IDE/Editor

Choose your IDE or editor and follow the setup instructions:

<details>
<summary><b>Claude Desktop</b></summary>

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@itseasy21/mcp-codebase-index"],
      "env": {
        "CODEBASE_PATH": "/absolute/path/to/your/repository",
        "EMBEDDING_PROVIDER": "gemini",
        "GEMINI_API_KEY": "your-api-key-here",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

**For Qdrant Cloud:**
```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@itseasy21/mcp-codebase-index"],
      "env": {
        "CODEBASE_PATH": "/absolute/path/to/your/repository",
        "EMBEDDING_PROVIDER": "gemini",
        "GEMINI_API_KEY": "your-api-key-here",
        "QDRANT_URL": "https://your-cluster.cloud.qdrant.io",
        "QDRANT_API_KEY": "your-qdrant-api-key"
      }
    }
  }
}
```

Restart Claude Desktop after saving the configuration.

</details>

<details>
<summary><b>Claude Code (VS Code Extension)</b></summary>

1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "Claude Code: MCP Servers"
3. Click "Edit in settings.json"
4. Add this configuration:

```json
{
  "claude-code.mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@itseasy21/mcp-codebase-index"],
      "env": {
        "CODEBASE_PATH": "/absolute/path/to/your/repository",
        "EMBEDDING_PROVIDER": "gemini",
        "GEMINI_API_KEY": "your-api-key-here",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

Reload VS Code after saving.

</details>

<details>
<summary><b>Cursor</b></summary>

Cursor supports MCP servers through its AI settings:

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Navigate to "Features" → "AI"
3. Scroll to "Model Context Protocol"
4. Click "Edit Config" or locate the config file:
   - **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
   - **Windows**: `%APPDATA%/Cursor/User/globalStorage/mcp.json`
   - **Linux**: `~/.config/Cursor/User/globalStorage/mcp.json`

5. Add this configuration:

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@itseasy21/mcp-codebase-index"],
      "env": {
        "CODEBASE_PATH": "/absolute/path/to/your/repository",
        "EMBEDDING_PROVIDER": "gemini",
        "GEMINI_API_KEY": "your-api-key-here",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

Restart Cursor after saving.

</details>

<details>
<summary><b>VS Code with Continue Extension</b></summary>

If you're using the [Continue](https://continue.dev/) extension:

1. Open the Continue configuration file:
   - **macOS/Linux**: `~/.continue/config.json`
   - **Windows**: `%USERPROFILE%\.continue\config.json`

2. Add to the `experimental.modelContextProtocolServers` section:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "name": "codebase-index",
        "command": "npx",
        "args": ["-y", "@itseasy21/mcp-codebase-index"],
        "env": {
          "CODEBASE_PATH": "/absolute/path/to/your/repository",
          "EMBEDDING_PROVIDER": "gemini",
          "GEMINI_API_KEY": "your-api-key-here",
          "QDRANT_URL": "http://localhost:6333"
        }
      }
    ]
  }
}
```

Reload VS Code after saving.

</details>

<details>
<summary><b>Windsurf Editor</b></summary>

Windsurf supports MCP servers natively:

1. Open Windsurf Settings
2. Navigate to MCP Settings or locate the config file:
   - **macOS**: `~/Library/Application Support/Windsurf/mcp_config.json`
   - **Windows**: `%APPDATA%/Windsurf/mcp_config.json`
   - **Linux**: `~/.config/Windsurf/mcp_config.json`

3. Add this configuration:

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@itseasy21/mcp-codebase-index"],
      "env": {
        "CODEBASE_PATH": "/absolute/path/to/your/repository",
        "EMBEDDING_PROVIDER": "gemini",
        "GEMINI_API_KEY": "your-api-key-here",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

Restart Windsurf after saving.

</details>

<details>
<summary><b>Zed Editor</b></summary>

Zed has experimental MCP support:

1. Open Zed Settings (Cmd/Ctrl + ,)
2. Add to your settings.json:

```json
{
  "experimental": {
    "mcp_servers": {
      "codebase-index": {
        "command": "npx",
        "args": ["-y", "@itseasy21/mcp-codebase-index"],
        "env": {
          "CODEBASE_PATH": "/absolute/path/to/your/repository",
          "EMBEDDING_PROVIDER": "gemini",
          "GEMINI_API_KEY": "your-api-key-here",
          "QDRANT_URL": "http://localhost:6333"
        }
      }
    }
  }
}
```

Restart Zed after saving.

</details>

<details>
<summary><b>Other MCP-Compatible Clients</b></summary>

For any MCP-compatible client, use this standard configuration:

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@itseasy21/mcp-codebase-index"],
      "env": {
        "CODEBASE_PATH": "/absolute/path/to/your/repository",
        "EMBEDDING_PROVIDER": "gemini",
        "GEMINI_API_KEY": "your-api-key-here",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

Consult your client's documentation for the exact config file location.

</details>

### 4. Restart Your IDE/Editor

After saving the configuration, restart your IDE/editor. The server will automatically start indexing your codebase on first run.

## Usage

Once configured, you can ask your AI assistant to search your codebase:

**Example queries:**
- "Find the authentication middleware"
- "Show me database connection code"
- "Where is the user validation logic?"
- "Find API endpoint handlers"
- "Show me error handling utilities"

**Advanced usage:**
- "Search for 'rate limiting' in TypeScript files"
- "Find functions related to payment processing in the /src/api directory"
- "Show me recent changes (reindex first)"

## Available Tools

The MCP server provides these tools to your AI assistant:

### `codebase_search`
Search your codebase using natural language or code queries.

**Parameters:**
- `query` (required) - Your search query
- `limit` - Number of results (default: 10)
- `threshold` - Similarity threshold 0-1 (default: 0.7)
- `fileTypes` - Filter by extensions (e.g., `[".ts", ".js"]`)
- `paths` - Filter by paths (e.g., `["src/api"]`)
- `includeContext` - Include surrounding code (default: true)

### `indexing_status`
Check indexing progress and statistics.

### `reindex`
Re-index your codebase (useful after pulling changes).

**Parameters:**
- `mode` - 'full', 'incremental', or 'file'
- `paths` - Specific files to reindex (optional)
- `force` - Force reindex even if unchanged

### `configure_indexer`
Update indexer settings at runtime.

### `validate_config`
Test your configuration and connections.

### `clear_index`
Clear all indexed data and start fresh.

## Configuration Reference

### Required Settings

| Variable | Description | Example |
|----------|-------------|---------|
| `CODEBASE_PATH` | Absolute path to your repository | `/Users/you/projects/myapp` |
| `EMBEDDING_PROVIDER` | Provider to use | `gemini`, `openai`, or `ollama` |
| `QDRANT_URL` | Qdrant instance URL | `http://localhost:6333` |

### Provider-Specific Settings

**For Gemini:**
```bash
GEMINI_API_KEY=your-api-key
```

**For OpenAI:**
```bash
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=text-embedding-3-small  # or text-embedding-3-large
```

**For Ollama:**
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=nomic-embed-text
```

### Optional Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `COLLECTION_NAME` | Qdrant collection name | `codebase_index` |
| `INDEX_BATCH_SIZE` | Files per batch | `50` |
| `INDEX_CONCURRENCY` | Parallel processing limit | `5` |
| `LOG_LEVEL` | Logging detail | `info` |
| `QDRANT_API_KEY` | For Qdrant Cloud | - |

## Supported Languages

- TypeScript/JavaScript
- Python
- Java
- Go
- Rust
- C/C++
- C#
- Ruby
- PHP
- Markdown

Unsupported languages fall back to intelligent text chunking.

## Troubleshooting

### "Cannot find module" errors
```bash
npm install -g @itseasy21/mcp-codebase-index
```

### Indexing is slow
Reduce `INDEX_CONCURRENCY` or increase `INDEX_BATCH_SIZE` in your configuration.

### "Connection refused" to Qdrant
- Ensure Qdrant is running: `docker ps` or check Qdrant Cloud status
- Verify `QDRANT_URL` is correct
- For cloud: ensure `QDRANT_API_KEY` is set

### No search results
- Check indexing status using the `indexing_status` tool
- Try reindexing with the `reindex` tool
- Lower the similarity `threshold` in your search

### Rate limiting errors
If using a free API tier:
- Reduce `INDEX_CONCURRENCY` to 1-2
- Increase `INDEX_BATCH_SIZE` to reduce API calls

## How It Works

1. **Code Parsing**: Uses Tree-sitter to parse code into meaningful chunks (functions, classes, etc.)
2. **Embedding Generation**: Converts code into vector embeddings using your chosen AI provider
3. **Vector Storage**: Stores embeddings in Qdrant for fast similarity search
4. **Semantic Search**: Finds relevant code by comparing query embeddings to stored code embeddings
5. **Real-time Updates**: Watches for file changes and automatically reindexes

## Performance Tips

- **For large codebases (1000+ files)**: Use `INDEX_BATCH_SIZE=100` and `INDEX_CONCURRENCY=3`
- **For fast iteration**: Use Ollama with local models (no API calls)
- **For best quality**: Use OpenAI's `text-embedding-3-large` model
- **For free usage**: Use Google Gemini (generous free tier)

## Privacy & Security

- All code indexing happens locally or in your chosen infrastructure
- API keys are only used for embedding generation
- Code is never sent to third parties (except for embedding generation)
- Self-hosted Ollama option keeps everything completely local

## Examples

### Example 1: Find Authentication Code
```
You: "Find all authentication middleware in the codebase"
AI Assistant: [Uses codebase_search tool with query "authentication middleware"]
```

### Example 2: Reindex After Git Pull
```
You: "I just pulled new changes, please reindex"
AI Assistant: [Uses reindex tool with mode "incremental"]
```

### Example 3: Search Specific Directory
```
You: "Search for error handlers in the src/api directory"
AI Assistant: [Uses codebase_search with query "error handlers" and paths ["src/api"]]
```

## Contributing

Contributions are welcome! Please visit our [GitHub repository](https://github.com/itseasy21/mcp-codebase-index) to:
- Report issues
- Submit pull requests
- Request features
- Ask questions

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/itseasy21/mcp-codebase-index/issues)
- **Discussions**: [GitHub Discussions](https://github.com/itseasy21/mcp-codebase-index/discussions)

## Acknowledgments

Built with:
- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Tree-sitter](https://tree-sitter.github.io/) for code parsing
- [Qdrant](https://qdrant.tech/) for vector storage
