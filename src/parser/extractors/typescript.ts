/**
 * TypeScript/JavaScript code extractor
 */

import type Parser from 'tree-sitter';
import { BaseExtractor } from './base.js';
import type { ExtractionResult } from '../types.js';
import type { CodeBlockType } from '../../types/models.js';

/**
 * Extractor for TypeScript and JavaScript code
 */
export class TypeScriptExtractor extends BaseExtractor {
  readonly language: string = 'typescript';

  getTargetNodeTypes(): string[] {
    return [
      'function_declaration',
      'method_definition',
      'arrow_function',
      'function_expression',
      'class_declaration',
      'interface_declaration',
      'type_alias_declaration',
      'enum_declaration',
      'variable_declaration',
      'lexical_declaration',
    ];
  }

  protected extractNode(
    node: Parser.SyntaxNode,
    filePath: string,
    content: string
  ): ExtractionResult | null {
    switch (node.type) {
      case 'function_declaration':
        return this.extractFunction(node);
      case 'method_definition':
        return this.extractMethod(node);
      case 'arrow_function':
      case 'function_expression':
        return this.extractArrowFunction(node);
      case 'class_declaration':
        return this.extractClass(node);
      case 'interface_declaration':
        return this.extractInterface(node);
      case 'type_alias_declaration':
        return this.extractTypeAlias(node);
      case 'enum_declaration':
        return this.extractEnum(node);
      case 'variable_declaration':
      case 'lexical_declaration':
        return this.extractVariable(node);
      default:
        return null;
    }
  }

  /**
   * Extract function declaration
   */
  private extractFunction(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const parametersNode = this.getChildByFieldName(node, 'parameters');
    const returnTypeNode = this.getChildByFieldName(node, 'return_type');

    const name = this.extractName(nameNode);
    const parameters = this.extractParameters(parametersNode);
    const returnType = this.extractReturnType(returnTypeNode);

    return {
      type: 'function',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        parameters,
        returnType,
        isAsync: this.hasModifier(node, 'async'),
        comments: this.extractComments(node),
        complexity: this.calculateComplexity(node),
      },
    };
  }

  /**
   * Extract method definition
   */
  private extractMethod(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const parametersNode = this.getChildByFieldName(node, 'parameters');
    const returnTypeNode = this.getChildByFieldName(node, 'return_type');

    const name = this.extractName(nameNode);
    const parameters = this.extractParameters(parametersNode);
    const returnType = this.extractReturnType(returnTypeNode);

    // Check visibility and modifiers
    const isStatic = this.hasModifier(node, 'static');
    const isAsync = this.hasModifier(node, 'async');
    const visibility = this.extractVisibility(node);

    return {
      type: 'method',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        parameters,
        returnType,
        visibility,
        isStatic,
        isAsync,
        comments: this.extractComments(node),
        complexity: this.calculateComplexity(node),
      },
    };
  }

  /**
   * Extract arrow function or function expression
   */
  private extractArrowFunction(node: Parser.SyntaxNode): ExtractionResult | null {
    // Try to find the variable name if assigned
    let name = 'anonymous';
    const parent = node.parent;

    if (parent) {
      if (parent.type === 'variable_declarator') {
        const nameNode = this.getChildByFieldName(parent, 'name');
        if (nameNode) {
          name = nameNode.text;
        }
      } else if (parent.type === 'pair') {
        const keyNode = this.getChildByFieldName(parent, 'key');
        if (keyNode) {
          name = keyNode.text;
        }
      }
    }

    const parametersNode = this.getChildByFieldName(node, 'parameters') ||
                           this.getChildByFieldName(node, 'parameter');
    const returnTypeNode = this.getChildByFieldName(node, 'return_type');

    const parameters = this.extractParameters(parametersNode);
    const returnType = this.extractReturnType(returnTypeNode);

    return {
      type: 'function',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        parameters,
        returnType,
        isAsync: this.hasModifier(node, 'async'),
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract class declaration
   */
  private extractClass(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    // Extract extends/implements
    const heritage: string[] = [];
    for (const child of node.children) {
      if (child.type === 'class_heritage') {
        heritage.push(child.text);
      }
    }

    return {
      type: 'class',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        isAbstract: this.hasModifier(node, 'abstract'),
        decorators: this.extractDecorators(node),
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract interface declaration
   */
  private extractInterface(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    return {
      type: 'interface',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract type alias
   */
  private extractTypeAlias(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    return {
      type: 'type',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract enum declaration
   */
  private extractEnum(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    return {
      type: 'enum',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract variable/constant declaration
   */
  private extractVariable(node: Parser.SyntaxNode): ExtractionResult | null {
    // Only extract if it's exported or at top level
    const parent = node.parent;
    const isExported = parent?.type === 'export_statement';

    if (!isExported && parent?.type !== 'program') {
      return null; // Skip local variables
    }

    const declarators = this.getChildrenOfType(node, 'variable_declarator');
    if (declarators.length === 0) return null;

    const declarator = declarators[0];
    const nameNode = this.getChildByFieldName(declarator, 'name');
    const name = this.extractName(nameNode);

    // Check if it's const
    const isConst = node.children.some(child => child.text === 'const');

    return {
      type: isConst ? 'constant' : 'variable',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract visibility modifier
   */
  private extractVisibility(node: Parser.SyntaxNode): 'public' | 'private' | 'protected' {
    for (const child of node.children) {
      if (child.type === 'accessibility_modifier') {
        const text = child.text;
        if (text === 'private') return 'private';
        if (text === 'protected') return 'protected';
        return 'public';
      }
    }
    return 'public';
  }

  /**
   * Extract decorators
   */
  private extractDecorators(node: Parser.SyntaxNode): string[] {
    const decorators: string[] = [];
    for (const child of node.children) {
      if (child.type === 'decorator') {
        decorators.push(child.text);
      }
    }
    return decorators;
  }
}

/**
 * JavaScript extractor (uses same logic as TypeScript)
 */
export class JavaScriptExtractor extends TypeScriptExtractor {
  readonly language: string = 'javascript';
}
