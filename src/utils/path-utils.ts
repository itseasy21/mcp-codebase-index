/**
 * Path utilities for vector store operations
 * Enables efficient path-based filtering using indexed segments
 */

/**
 * Decompose a file path into indexed segments for efficient filtering
 * Returns an object like { '0': 'src', '1': 'components', '2': 'Button.tsx' }
 *
 * This allows Qdrant to filter by path prefix efficiently using payload indexes
 * e.g., find all files in "src/components/" by matching pathSegments.0='src' AND pathSegments.1='components'
 */
export function decomposePathIntoSegments(
  filePath: string,
  maxDepth = 8
): Record<string, string> {
  // Normalize path to use forward slashes (posix style)
  const normalized = filePath.replace(/\\/g, '/');

  // Remove leading/trailing slashes
  const cleaned = normalized.replace(/^\/+|\/+$/g, '');

  // Split into segments
  const segments = cleaned.split('/').filter(Boolean);

  // Create indexed object up to maxDepth
  const result: Record<string, string> = {};
  for (let i = 0; i < Math.min(segments.length, maxDepth); i++) {
    result[i.toString()] = segments[i];
  }

  return result;
}

/**
 * Build a Qdrant filter for path prefix matching
 * Returns filter conditions that match pathSegments at each level
 *
 * @param prefix - Directory prefix like "src/components" or "lib/"
 * @returns Qdrant filter conditions array
 */
export function buildPathPrefixFilter(prefix: string): Array<{ key: string; match: { value: string } }> {
  if (!prefix || prefix === '.' || prefix === './') {
    return []; // No filter for root/current directory
  }

  // Normalize the prefix
  const normalized = prefix.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const segments = normalized.split('/').filter(Boolean);

  // Build must-match conditions for each segment
  return segments.map((segment, index) => ({
    key: `pathSegments.${index}`,
    match: { value: segment },
  }));
}

/**
 * Extract directory prefix from a file path
 * e.g., "src/components/Button.tsx" -> "src/components"
 */
export function getDirectoryPrefix(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');

  if (lastSlash === -1) {
    return '.'; // File in root
  }

  return normalized.substring(0, lastSlash);
}

/**
 * Check if a path matches a given prefix
 * Used for validation and testing
 */
export function pathMatchesPrefix(filePath: string, prefix: string): boolean {
  if (!prefix || prefix === '.' || prefix === './') {
    return true; // Everything matches root
  }

  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPrefix = prefix.replace(/\\/g, '/').replace(/\/+$/, ''); // Remove trailing slash

  return normalizedPath.startsWith(normalizedPrefix + '/') || normalizedPath === normalizedPrefix;
}

/**
 * Get common path prefix from multiple paths
 * Useful for determining optimal search scope
 */
export function findCommonPrefix(paths: string[]): string {
  if (paths.length === 0) return '.';
  if (paths.length === 1) return getDirectoryPrefix(paths[0]);

  // Normalize all paths
  const normalized = paths.map(p => p.replace(/\\/g, '/'));

  // Split into segments
  const allSegments = normalized.map(p => p.split('/').filter(Boolean));

  // Find common prefix length
  let commonLength = 0;
  const minLength = Math.min(...allSegments.map(s => s.length));

  for (let i = 0; i < minLength; i++) {
    const firstSegment = allSegments[0][i];
    if (allSegments.every(segments => segments[i] === firstSegment)) {
      commonLength = i + 1;
    } else {
      break;
    }
  }

  if (commonLength === 0) {
    return '.';
  }

  return allSegments[0].slice(0, commonLength).join('/');
}
