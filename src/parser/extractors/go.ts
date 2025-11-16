/**
 * Go code extractor
 */

import type Parser from 'tree-sitter';
import { BaseExtractor } from './base.js';
import type { ExtractionResult } from '../types.js';

/**
 * Extractor for Go code
 */
export class GoExtractor extends BaseExtractor {
  readonly language = 'go';

  getTargetNodeTypes(): string[] {
    return [
      'function_declaration',
      'method_declaration',
      'type_declaration',
      'const_declaration',
      'var_declaration',
    ];
  }

  protected extractNode(
    node: Parser.SyntaxNode,
    _filePath: string,
    _content: string
  ): ExtractionResult | null {
    switch (node.type) {
      case 'function_declaration':
        return this.extractFunction(node);
      case 'method_declaration':
        return this.extractMethod(node);
      case 'type_declaration':
        return this.extractTypeDeclaration(node);
      case 'const_declaration':
        return this.extractConstDeclaration(node);
      case 'var_declaration':
        return this.extractVarDeclaration(node);
      default:
        return null;
    }
  }

  /**
   * Extract function declaration
   */
  private extractFunction(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    // Extract parameters
    const parametersNode = this.getChildByFieldName(node, 'parameters');
    const parameters = this.extractGoParameters(parametersNode);

    // Extract return type
    const resultNode = this.getChildByFieldName(node, 'result');
    const returnType = resultNode ? resultNode.text : undefined;

    // Extract type parameters (for generic functions in Go 1.18+)
    const typeParamsNode = this.getChildByFieldName(node, 'type_parameters');
    const typeParameters = typeParamsNode ? typeParamsNode.text : undefined;

    return {
      type: 'function',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        parameters,
        returnType,
        typeParameters,
        isExported: this.isExported(name),
        comments: this.extractComments(node),
        complexity: this.calculateComplexity(node),
      },
    };
  }

  /**
   * Extract method declaration
   */
  private extractMethod(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    // Extract receiver (the type this method belongs to)
    const receiverNode = this.getChildByFieldName(node, 'receiver');
    let receiver: string | undefined;
    if (receiverNode) {
      // Extract receiver type from parameter list
      const receiverParams = this.extractGoParameters(receiverNode);
      receiver = receiverParams.length > 0 ? receiverParams[0] : undefined;
    }

    // Extract parameters
    const parametersNode = this.getChildByFieldName(node, 'parameters');
    const parameters = this.extractGoParameters(parametersNode);

    // Extract return type
    const resultNode = this.getChildByFieldName(node, 'result');
    const returnType = resultNode ? resultNode.text : undefined;

    return {
      type: 'method',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        receiver,
        parameters,
        returnType,
        isExported: this.isExported(name),
        comments: this.extractComments(node),
        complexity: this.calculateComplexity(node),
      },
    };
  }

  /**
   * Extract type declaration (struct, interface, type alias)
   */
  private extractTypeDeclaration(node: Parser.SyntaxNode): ExtractionResult | null {
    // Type declarations can have multiple specs
    const specs = this.getChildrenOfType(node, 'type_spec');

    // For now, extract the first spec. Multiple specs would need separate blocks.
    if (specs.length === 0) return null;

    const spec = specs[0];
    const nameNode = this.getChildByFieldName(spec, 'name');
    const name = this.extractName(nameNode);

    const typeNode = this.getChildByFieldName(spec, 'type');
    if (!typeNode) return null;

    // Determine type category
    let blockType: 'class' | 'interface' | 'type' = 'type';
    let typeKind: string | undefined;

    if (typeNode.type === 'struct_type') {
      blockType = 'class';
      typeKind = 'struct';
    } else if (typeNode.type === 'interface_type') {
      blockType = 'interface';
      typeKind = 'interface';
    } else {
      typeKind = 'alias';
    }

    // Extract type parameters (for generic types in Go 1.18+)
    const typeParamsNode = this.getChildByFieldName(spec, 'type_parameters');
    const typeParameters = typeParamsNode ? typeParamsNode.text : undefined;

    return {
      type: blockType,
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        typeKind,
        typeParameters,
        isExported: this.isExported(name),
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract const declaration
   */
  private extractConstDeclaration(node: Parser.SyntaxNode): ExtractionResult | null {
    // Const declarations can have multiple specs
    const specs = this.getChildrenOfType(node, 'const_spec');

    if (specs.length === 0) return null;

    // Only extract the first constant (or we could extract all)
    const spec = specs[0];
    const nameNode = this.getChildByFieldName(spec, 'name');
    const name = this.extractName(nameNode);

    // Only extract exported constants (uppercase first letter)
    if (!this.isExported(name)) {
      return null;
    }

    const typeNode = this.getChildByFieldName(spec, 'type');
    const constType = typeNode ? typeNode.text : undefined;

    return {
      type: 'constant',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        constType,
        isExported: true,
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract var declaration
   */
  private extractVarDeclaration(node: Parser.SyntaxNode): ExtractionResult | null {
    // Var declarations can have multiple specs
    const specs = this.getChildrenOfType(node, 'var_spec');

    if (specs.length === 0) return null;

    const spec = specs[0];
    const nameNode = this.getChildByFieldName(spec, 'name');
    const name = this.extractName(nameNode);

    // Only extract exported variables (package-level globals)
    if (!this.isExported(name)) {
      return null;
    }

    const typeNode = this.getChildByFieldName(spec, 'type');
    const varType = typeNode ? typeNode.text : undefined;

    return {
      type: 'variable',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        varType,
        isExported: true,
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract Go function/method parameters
   */
  private extractGoParameters(node: Parser.SyntaxNode | null): string[] {
    if (!node) return [];

    const params: string[] = [];
    for (const child of node.children) {
      if (child.type === 'parameter_declaration' || child.type === 'variadic_parameter_declaration') {
        params.push(child.text);
      }
    }
    return params;
  }

  /**
   * Check if identifier is exported (starts with uppercase letter)
   */
  private isExported(name: string): boolean {
    if (!name || name.length === 0) return false;
    const firstChar = name.charAt(0);
    return firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
  }

  /**
   * Override complexity calculation for Go
   */
  protected calculateComplexity(node: Parser.SyntaxNode): number {
    let complexity = 1;

    const traverse = (n: Parser.SyntaxNode) => {
      // Go-specific control flow
      if (
        n.type === 'if_statement' ||
        n.type === 'for_statement' ||
        n.type === 'expression_switch_statement' ||
        n.type === 'type_switch_statement' ||
        n.type === 'select_statement' ||
        n.type === 'communication_case'
      ) {
        complexity++;
      }

      // Logical operators
      if (n.type === 'binary_expression') {
        const operator = n.children.find(child =>
          child.text === '&&' || child.text === '||'
        );
        if (operator) {
          complexity++;
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return complexity;
  }
}
