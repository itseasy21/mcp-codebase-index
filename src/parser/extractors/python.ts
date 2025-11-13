/**
 * Python code extractor
 */

import type Parser from 'tree-sitter';
import { BaseExtractor } from './base.js';
import type { ExtractionResult } from '../types.js';

/**
 * Extractor for Python code
 */
export class PythonExtractor extends BaseExtractor {
  readonly language = 'python';

  getTargetNodeTypes(): string[] {
    return [
      'function_definition',
      'class_definition',
      'decorated_definition',
    ];
  }

  protected extractNode(
    node: Parser.SyntaxNode,
    _filePath: string,
    _content: string
  ): ExtractionResult | null {
    switch (node.type) {
      case 'function_definition':
        return this.extractFunction(node);
      case 'class_definition':
        return this.extractClass(node);
      case 'decorated_definition':
        return this.extractDecoratedDefinition(node);
      default:
        return null;
    }
  }

  /**
   * Extract function definition
   */
  private extractFunction(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const parametersNode = this.getChildByFieldName(node, 'parameters');
    const returnTypeNode = this.getChildByFieldName(node, 'return_type');

    const name = this.extractName(nameNode);
    const parameters = this.extractPythonParameters(parametersNode);
    const returnType = this.extractReturnType(returnTypeNode);

    // Check if it's a method by looking at parent
    const parent = node.parent;
    const isMethod = parent?.type === 'block' && parent.parent?.type === 'class_definition';

    // Extract docstring
    const docstring = this.extractDocstring(node);

    // Check if it's async
    const isAsync = node.children.some(child => child.text === 'async');

    return {
      type: isMethod ? 'method' : 'function',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        parameters,
        returnType,
        isAsync,
        comments: docstring,
        complexity: this.calculateComplexity(node),
      },
    };
  }

  /**
   * Extract class definition
   */
  private extractClass(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    // Extract base classes
    const superclassesNode = this.getChildByFieldName(node, 'superclasses');
    const baseClasses: string[] = [];
    if (superclassesNode) {
      for (const child of superclassesNode.children) {
        if (child.type === 'identifier' || child.type === 'attribute') {
          baseClasses.push(child.text);
        }
      }
    }

    // Extract docstring
    const docstring = this.extractDocstring(node);

    return {
      type: 'class',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        baseClasses,
        comments: docstring,
      },
    };
  }

  /**
   * Extract decorated definition (function/class with decorators)
   */
  private extractDecoratedDefinition(node: Parser.SyntaxNode): ExtractionResult | null {
    // Find the actual definition (function or class)
    const definition = node.children.find(
      child => child.type === 'function_definition' || child.type === 'class_definition'
    );

    if (!definition) return null;

    // Extract decorators
    const decorators: string[] = [];
    for (const child of node.children) {
      if (child.type === 'decorator') {
        decorators.push(child.text);
      }
    }

    // Get the base extraction result
    const result = definition.type === 'function_definition'
      ? this.extractFunction(definition)
      : this.extractClass(definition);

    if (!result) return null;

    // Add decorators to metadata
    result.metadata = {
      ...result.metadata,
      decorators,
    };

    // Update text to include decorators
    result.text = this.getNodeText(node);
    result.startLine = node.startPosition.row + 1;

    return result;
  }

  /**
   * Extract Python function parameters
   */
  private extractPythonParameters(node: Parser.SyntaxNode | null): string[] {
    if (!node) return [];

    const params: string[] = [];
    for (const child of node.children) {
      if (
        child.type === 'identifier' ||
        child.type === 'typed_parameter' ||
        child.type === 'default_parameter' ||
        child.type === 'typed_default_parameter'
      ) {
        // Get parameter name (might be nested in typed parameters)
        const nameNode = child.type === 'identifier'
          ? child
          : this.getChildByFieldName(child, 'name');

        if (nameNode) {
          const paramText = child.text;
          params.push(paramText);
        }
      }
    }
    return params;
  }

  /**
   * Extract Python docstring
   */
  private extractDocstring(node: Parser.SyntaxNode): string | undefined {
    // Look for string expression as first statement in body
    const bodyNode = node.children.find(child => child.type === 'block');
    if (!bodyNode || bodyNode.children.length === 0) return undefined;

    const firstStatement = bodyNode.children[0];
    if (firstStatement.type === 'expression_statement') {
      const stringNode = firstStatement.children[0];
      if (stringNode.type === 'string') {
        // Remove quotes and clean up
        let docstring = stringNode.text;
        // Remove triple quotes
        docstring = docstring.replace(/^['"]{3}|['"]{3}$/g, '');
        // Remove single quotes
        docstring = docstring.replace(/^['"]|['"]$/g, '');
        return docstring.trim();
      }
    }

    return undefined;
  }

  /**
   * Override complexity calculation for Python
   */
  protected calculateComplexity(node: Parser.SyntaxNode): number {
    let complexity = 1;

    const traverse = (n: Parser.SyntaxNode) => {
      // Python-specific control flow
      if (
        n.type === 'if_statement' ||
        n.type === 'for_statement' ||
        n.type === 'while_statement' ||
        n.type === 'try_statement' ||
        n.type === 'except_clause' ||
        n.type === 'with_statement' ||
        n.type === 'elif_clause'
      ) {
        complexity++;
      }

      // Logical operators
      if (n.type === 'boolean_operator') {
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
