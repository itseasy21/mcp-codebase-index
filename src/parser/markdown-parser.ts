/**
 * Markdown parser with header-based chunking
 */

import type { CodeBlock } from '../types/models.js';
import { hashContent } from '../utils/file-utils.js';

/**
 * Parse Markdown file into sections based on headers
 */
export class MarkdownParser {
  /**
   * Parse Markdown content into code blocks
   */
  parse(filePath: string, content: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = content.split('\n');

    let currentSection: {
      title: string;
      level: number;
      startLine: number;
      content: string[];
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        // Save previous section if exists
        if (currentSection && currentSection.content.length > 0) {
          blocks.push(this.createBlock(filePath, currentSection));
        }

        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();

        currentSection = {
          title,
          level,
          startLine: i + 1,
          content: [line],
        };
      } else if (currentSection) {
        // Add line to current section
        currentSection.content.push(line);
      } else {
        // Content before first header - create a preamble section
        if (i === 0 && line.trim()) {
          currentSection = {
            title: 'Preamble',
            level: 0,
            startLine: 1,
            content: [line],
          };
        }
      }
    }

    // Save last section
    if (currentSection && currentSection.content.length > 0) {
      blocks.push(this.createBlock(filePath, currentSection));
    }

    // If no sections were found, create one block for entire file
    if (blocks.length === 0 && content.trim()) {
      blocks.push({
        id: `${filePath}:1`,
        file: filePath,
        line: 1,
        endLine: lines.length,
        code: content,
        type: 'markdown_section',
        name: 'Document',
        language: 'markdown',
        hash: hashContent(content),
      });
    }

    return blocks;
  }

  /**
   * Create a code block from a Markdown section
   */
  private createBlock(
    filePath: string,
    section: {
      title: string;
      level: number;
      startLine: number;
      content: string[];
    }
  ): CodeBlock {
    const code = section.content.join('\n');
    const endLine = section.startLine + section.content.length - 1;

    return {
      id: `${filePath}:${section.startLine}`,
      file: filePath,
      line: section.startLine,
      endLine,
      code,
      type: 'markdown_section',
      name: section.title,
      language: 'markdown',
      metadata: {
        level: section.level,
      },
      hash: hashContent(code),
    };
  }

  /**
   * Extract just the headings for quick overview
   */
  extractHeadings(content: string): Array<{ level: number; title: string; line: number }> {
    const headings: Array<{ level: number; title: string; line: number }> = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        headings.push({
          level: headerMatch[1].length,
          title: headerMatch[2].trim(),
          line: i + 1,
        });
      }
    }

    return headings;
  }
}

// Export singleton instance
export const markdownParser = new MarkdownParser();
