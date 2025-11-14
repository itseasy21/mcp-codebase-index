/**
 * Base extractor interface for language-specific code parsing
 */

import type Parser from 'tree-sitter';
import type { CodeBlock } from '../../types/models.js';
import type { ExtractionResult } from '../types.js';

/**
 * Base interface for language-specific extractors
 */
export interface CodeExtractor {
  /**
   * Language this extractor handles
   */
  readonly language: string;

  /**
   * Extract code blocks from parsed tree
   */
  extract(tree: Parser.Tree, filePath: string, content: string): CodeBlock[];

  /**
   * Get node types that should be extracted
   */
  getTargetNodeTypes(): string[];
}

/**
 * Abstract base class for extractors
 */
export abstract class BaseExtractor implements CodeExtractor {
  abstract readonly language: string;

  /**
   * Extract code blocks from Tree-sitter tree
   */
  extract(tree: Parser.Tree, filePath: string, content: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const targetTypes = this.getTargetNodeTypes();

    const traverse = (node: Parser.SyntaxNode) => {
      // Check if this node type should be extracted
      if (targetTypes.includes(node.type)) {
        const result = this.extractNode(node, filePath, content);
        if (result) {
          blocks.push(this.createCodeBlock(result, filePath, content));
        }
      }

      // Recursively traverse children
      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(tree.rootNode);
    return blocks;
  }

  /**
   * Extract information from a single node
   */
  protected abstract extractNode(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string
  ): ExtractionResult | null;

  /**
   * Get target node types for extraction
   */
  abstract getTargetNodeTypes(): string[];

  /**
   * Create a CodeBlock from extraction result
   */
  protected createCodeBlock(
    result: ExtractionResult,
    filePath: string,
    _content: string
  ): CodeBlock {
    const id = this.generateId(filePath, result.startLine);

    return {
      id,
      file: filePath,
      line: result.startLine,
      endLine: result.endLine,
      code: result.text,
      type: result.type,
      name: result.name,
      language: this.language,
      metadata: result.metadata,
    };
  }

  /**
   * Generate unique ID for code block
   */
  protected generateId(filePath: string, line: number): string {
    return `${filePath}:${line}`;
  }

  /**
   * Get text of a node
   */
  protected getNodeText(node: Parser.SyntaxNode): string {
    return node.text;
  }

  /**
   * Get node by field name
   */
  protected getChildByFieldName(
    node: Parser.SyntaxNode,
    fieldName: string
  ): Parser.SyntaxNode | null {
    return node.childForFieldName(fieldName);
  }

  /**
   * Get children of a specific type
   */
  protected getChildrenOfType(
    node: Parser.SyntaxNode,
    type: string
  ): Parser.SyntaxNode[] {
    return node.children.filter(child => child.type === type);
  }

  /**
   * Extract name from identifier node
   */
  protected extractName(node: Parser.SyntaxNode | null): string {
    if (!node) return 'anonymous';
    return node.text;
  }

  /**
   * Check if node has modifier
   */
  protected hasModifier(node: Parser.SyntaxNode, modifier: string): boolean {
    return node.children.some(child => child.type === modifier || child.text === modifier);
  }

  /**
   * Extract parameters from parameter list
   */
  protected extractParameters(node: Parser.SyntaxNode | null): string[] {
    if (!node) return [];

    const params: string[] = [];
    for (const child of node.children) {
      if (child.type.includes('parameter')) {
        params.push(child.text);
      }
    }
    return params;
  }

  /**
   * Extract return type if available
   */
  protected extractReturnType(node: Parser.SyntaxNode | null): string | undefined {
    if (!node) return undefined;
    return node.text;
  }

  /**
   * Extract comments/docstrings
   */
  protected extractComments(node: Parser.SyntaxNode): string | undefined {
    // Look for comment nodes before this node
    const parent = node.parent;
    if (!parent) return undefined;

    const nodeIndex = parent.children.indexOf(node);
    if (nodeIndex > 0) {
      const previousNode = parent.children[nodeIndex - 1];
      if (previousNode.type.includes('comment')) {
        return previousNode.text;
      }
    }

    return undefined;
  }

  /**
   * Calculate approximate code complexity
   */
  protected calculateComplexity(node: Parser.SyntaxNode): number {
    let complexity = 1; // Base complexity

    const traverse = (n: Parser.SyntaxNode) => {
      // Increment for control flow statements
      if (
        n.type === 'if_statement' ||
        n.type === 'for_statement' ||
        n.type === 'while_statement' ||
        n.type === 'switch_statement' ||
        n.type === 'catch_clause'
      ) {
        complexity++;
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return complexity;
  }
}
