---
"mcp-codebase-index": patch
---

Fix indexing status reporting and optimize memory management

**Bug Fixes:**
- Fixed indexing status MCP command returning all zeros for statistics (totalFiles, totalBlocks, totalVectors)
- Status now correctly updates from storage regardless of system state

**Performance Improvements:**
- Fixed critical memory leak in batch processor concurrency control
- Optimized file change detection to use stats instead of reading entire file contents
- Added explicit memory cleanup between processing cycles
- Reduced default batch sizes (concurrency: 5→3, batch size: 50→20)
- Added pauses between batches to allow garbage collection
- Dramatically reduced memory footprint during large indexing operations

These changes significantly improve indexing stability and prevent the indexer from getting stuck due to memory pressure.
