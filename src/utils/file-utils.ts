/**
 * File utility functions
 */

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { extname, basename } from 'path';
import { FileSystemError } from './errors.js';

/**
 * Calculate hash of file content
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Check if a file is binary by examining its content
 */
export function isBinaryContent(content: Buffer, sampleSize = 8000): boolean {
  const size = Math.min(content.length, sampleSize);
  let suspiciousBytes = 0;

  for (let i = 0; i < size; i++) {
    const byte = content[i];

    // Check for null bytes (strong indicator of binary)
    if (byte === 0) {
      return true;
    }

    // Check for control characters (excluding common ones like \n, \r, \t)
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      suspiciousBytes++;
    }
  }

  // If more than 30% of sampled bytes are suspicious, consider it binary
  return suspiciousBytes / size > 0.3;
}

/**
 * Check if a file is binary by extension
 */
export function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = new Set([
    // Archives
    '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
    // Executables
    '.exe', '.dll', '.so', '.dylib', '.bin',
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
    '.webp', '.tiff', '.psd',
    // Video/Audio
    '.mp4', '.avi', '.mov', '.mp3', '.wav', '.flac',
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // Databases
    '.db', '.sqlite', '.sqlite3',
    // Other
    '.wasm', '.pyc', '.class', '.jar',
  ]);

  const ext = extname(filePath).toLowerCase();
  return binaryExtensions.has(ext);
}

/**
 * Check if a file is an image
 */
export function isImageFile(filePath: string): boolean {
  const imageExtensions = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico',
    '.svg', '.webp', '.tiff', '.psd', '.raw',
  ]);

  const ext = extname(filePath).toLowerCase();
  return imageExtensions.has(ext);
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (_error) {
    throw new FileSystemError(`Failed to get file size: ${filePath}`, filePath);
  }
}

/**
 * Check if file exceeds size limit
 */
export async function isFileTooLarge(
  filePath: string,
  maxSize: number
): Promise<boolean> {
  const size = await getFileSize(filePath);
  return size > maxSize;
}

/**
 * Read file content as string
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (_error) {
    throw new FileSystemError(`Failed to read file: ${filePath}`, filePath);
  }
}

/**
 * Read file content as buffer
 */
export async function readFileBuffer(filePath: string): Promise<Buffer> {
  try {
    return await fs.readFile(filePath);
  } catch (_error) {
    throw new FileSystemError(`Failed to read file: ${filePath}`, filePath);
  }
}

/**
 * Check if file should be excluded based on name patterns
 */
export function shouldExcludeFile(filePath: string): boolean {
  const filename = basename(filePath);

  // Common files to exclude
  const excludePatterns = [
    // Lock files
    /^package-lock\.json$/,
    /^yarn\.lock$/,
    /^pnpm-lock\.yaml$/,
    /^Gemfile\.lock$/,
    /^Cargo\.lock$/,
    // Generated files
    /\.min\.js$/,
    /\.min\.css$/,
    /\.map$/,
    // Test files (optional - can be configured)
    // /\.test\./,
    // /\.spec\./,
    // Temp files
    /~$/,
    /\.swp$/,
    /\.tmp$/,
  ];

  return excludePatterns.some(pattern => pattern.test(filename));
}

/**
 * Detect language from file extension
 */
export function detectLanguage(filePath: string): string | null {
  const ext = extname(filePath).toLowerCase();

  const languageMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.py': 'python',
    '.pyw': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.c': 'c',
    '.h': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.md': 'markdown',
    '.markdown': 'markdown',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.xml': 'xml',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sql': 'sql',
    '.sh': 'bash',
    '.bash': 'bash',
  };

  return languageMap[ext] || null;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
