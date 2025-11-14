/**
 * Core domain models for the MCP Codebase Index server
 */

/**
 * Represents a parsed code block
 */
export interface CodeBlock {
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

/**
 * Type of code block
 */
export type CodeBlockType =
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
  | 'chunk'; // fallback chunking

/**
 * Metadata for code blocks
 */
export interface CodeBlockMetadata {
  parameters?: string[];
  returnType?: string;
  visibility?: 'public' | 'private' | 'protected' | 'internal';
  isAsync?: boolean;
  isStatic?: boolean;
  isAbstract?: boolean;
  decorators?: string[];
  comments?: string;
  complexity?: number;
  level?: number; // For markdown headers
}

/**
 * Represents a vector with its metadata
 */
export interface Vector {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}

/**
 * Metadata stored with vectors in Qdrant
 */
export interface VectorMetadata {
  file: string;
  line: number;
  endLine: number;
  code: string;
  type: CodeBlockType;
  name: string;
  language: string;
  hash: string;
  indexed_at: string;
  complexity?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Search result
 */
export interface SearchResult {
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

/**
 * Indexing status
 */
export type IndexingStatus = 'standby' | 'indexing' | 'indexed' | 'error';

/**
 * Status information
 */
export interface StatusInfo {
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

/**
 * File information
 */
export interface FileInfo {
  path: string;
  language: string;
  size: number;
  hash: string;
  lastModified: number;
}

/**
 * Indexing task
 */
export interface IndexingTask {
  file: string;
  priority: number;
  retries: number;
}

/**
 * Collection info
 */
export interface CollectionInfo {
  name: string;
  vectorCount: number;
  indexed: boolean;
  lastUpdated?: string;
}
